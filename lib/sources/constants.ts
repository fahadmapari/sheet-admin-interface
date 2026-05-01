// lib/sources/constants.ts
export const MAX_PAGES_PER_CRAWL = 500;
export const GEMINI_BATCH_SIZE = 20;
export const MARKDOWN_EXCERPT_CHARS = 500;
export const DEFAULT_CONFIDENCE_THRESHOLD = 75;
export const PROCESSING_LOCK_TTL_MS = 10 * 60 * 1000;     // 10 min
export const GLOBAL_CRAWL_LOCK_TTL_MS = 30 * 60 * 1000;   // 30 min
export const TOUR_URL_HEURISTIC_PATTERNS = [
  '/tour',
  '/experience',
  '/excursion',
  '/visit',
  '/activity',
];

export const COLLECTIONS = {
  crawlJobs: 'crawljobs',
  sources: 'sources',
  crawlLock: 'crawljobs_lock',
} as const;

export const CRAWL_LOCK_SINGLETON_ID = 'global';
