import type { WrittenProduct } from './types';

const TTL = 60_000;

let cache: { data: WrittenProduct[]; at: number } | null = null;

export function getCachedWrittenProducts(): WrittenProduct[] | null {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  return null;
}

export function setCachedWrittenProducts(data: WrittenProduct[]): void {
  cache = { data, at: Date.now() };
}

export function invalidateWrittenProductsCache(): void {
  cache = null;
}
