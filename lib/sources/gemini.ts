// lib/sources/gemini.ts
import 'server-only';
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_BATCH_SIZE } from './constants';
import type { ScrapedPage, ClassificationResult } from '@/lib/types';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY environment variable');
  return new GoogleGenAI({ apiKey });
}

const MODEL_ID = 'gemini-2.5-flash';

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          url: { type: Type.STRING },
          isTourPage: { type: Type.BOOLEAN },
          confidence: { type: Type.INTEGER },
          suggestedTourName: { type: Type.STRING, nullable: true },
          suggestedCity: { type: Type.STRING, nullable: true },
          suggestedCountry: { type: Type.STRING, nullable: true },
          notes: { type: Type.STRING, nullable: true },
        },
        required: ['url', 'isTourPage', 'confidence'],
      },
    },
  },
  required: ['results'],
};

const SYSTEM_PROMPT = `You are classifying scraped web pages from a tourism provider's website.
For each page, decide whether it describes ONE specific bookable tour, day-trip, excursion, or guided experience.
- Mark isTourPage=true ONLY if the page is the dedicated landing page for a single tour product.
- Listing/category pages (e.g. "All Rome tours"), homepages, contact pages, blog posts, and policy pages are NOT tour pages.
- Confidence is 0–100 reflecting your certainty about isTourPage.
- suggestedTourName: extract a clean human-readable tour name (no "| Site Name" suffixes).
- suggestedCity / suggestedCountry: extract from the page content if present, else null.
- notes: 1-line summary of why you classified it this way (max 120 chars).`;

interface ClassifyBatchInput {
  pages: ScrapedPage[];
  defaultCity: string;
  defaultCountry: string;
  providerName: string;
}

async function classifyBatch(input: ClassifyBatchInput): Promise<ClassificationResult[]> {
  const client = getClient();
  const userParts = input.pages
    .map((p, i) => {
      return `[${i}] URL: ${p.url}
TITLE: ${p.title ?? '(none)'}
META: ${p.metaDescription ?? '(none)'}
EXCERPT: ${p.markdownExcerpt}`;
    })
    .join('\n\n---\n\n');

  const userPrompt = `Provider: ${input.providerName}
Default city if you can't determine one: ${input.defaultCity}
Default country if you can't determine one: ${input.defaultCountry}

Pages to classify:

${userParts}`;

  const response = await client.models.generateContent({
    model: MODEL_ID,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA as any,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini returned empty response');
  const parsed = JSON.parse(text) as {
    results: Array<{
      url: string;
      isTourPage: boolean;
      confidence: number;
      suggestedTourName?: string | null;
      suggestedCity?: string | null;
      suggestedCountry?: string | null;
      notes?: string | null;
    }>;
  };

  // Build a map URL → page so we can preserve title in the result.
  const byUrl = new Map(input.pages.map((p) => [p.url, p]));

  return parsed.results.map((r) => ({
    url: r.url,
    title: byUrl.get(r.url)?.title ?? null,
    suggestedTourName: r.suggestedTourName ?? null,
    suggestedCity: r.suggestedCity ?? null,
    suggestedCountry: r.suggestedCountry ?? null,
    confidence: Math.max(0, Math.min(100, Math.round(r.confidence ?? 0))),
    isTourPage: r.isTourPage,
    geminiNotes: r.notes ?? null,
  }));
}

// Process pages in batches, with up to 3 retries per batch.
// On terminal batch failure, emits zero-confidence stub results so the user
// can still review those pages manually.
export async function classifyPages(input: ClassifyBatchInput): Promise<ClassificationResult[]> {
  const out: ClassificationResult[] = [];
  for (let i = 0; i < input.pages.length; i += GEMINI_BATCH_SIZE) {
    const batchPages = input.pages.slice(i, i + GEMINI_BATCH_SIZE);
    let lastErr: unknown = null;
    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const results = await classifyBatch({ ...input, pages: batchPages });
        out.push(...results);
        success = true;
        break;
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
    if (!success) {
      console.error('[gemini] batch failed', lastErr);
      for (const p of batchPages) {
        out.push({
          url: p.url,
          title: p.title,
          suggestedTourName: null,
          suggestedCity: null,
          suggestedCountry: null,
          confidence: 0,
          isTourPage: false,
          geminiNotes: 'classification failed',
        });
      }
    }
  }
  return out;
}
