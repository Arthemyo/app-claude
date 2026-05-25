import { normalizeQuery } from '@/lib/ai';
import { cache, TTL } from '@/lib/cache';
import * as fipe from '@/lib/fipe';
import * as nhtsa from '@/lib/nhtsa';
import * as carquery from '@/lib/carquery';
import type { NormalizedQuery, SearchResponse, PartResult } from '@/types';

function deduplicateResults(results: PartResult[]): PartResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.name}-${r.vehicle.make}-${r.vehicle.model}-${r.vehicle.year}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchSources(normalized: NormalizedQuery): Promise<PartResult[]> {
  const make = normalized.make ?? '';
  const fipeMake = normalized.make ?? normalized.model ?? '';
  const [fipeResults, nhtsaResults, carqueryResults] = await Promise.allSettled([
    fipeMake ? fipe.searchByMakeModel(fipeMake, normalized.model, normalized.year, normalized.part) : Promise.resolve([]),
    make ? nhtsa.searchByMakeModel(make, normalized.model, normalized.year, normalized.part) : Promise.resolve([]),
    make ? carquery.searchByMakeModel(make, normalized.model, normalized.year, normalized.part) : Promise.resolve([]),
  ]);
  return [
    ...(fipeResults.status === 'fulfilled' ? fipeResults.value : []),
    ...(nhtsaResults.status === 'fulfilled' ? nhtsaResults.value : []),
    ...(carqueryResults.status === 'fulfilled' ? carqueryResults.value : []),
  ];
}

export async function runStructuredSearch(normalized: NormalizedQuery): Promise<SearchResponse> {
  const cacheKey = `search:structured:${normalized.year}:${(normalized.make ?? '').toLowerCase()}:${(normalized.model ?? '').toLowerCase()}:${normalized.part.toLowerCase()}`;
  const cached = cache.get<SearchResponse>(cacheKey);
  if (cached) return { ...cached, cached: true };

  const rawResults = await fetchSources(normalized);
  const results = deduplicateResults(rawResults);
  const response: SearchResponse = { results, query: normalized, cached: false };
  cache.set(cacheKey, response, TTL.SEARCH);
  return response;
}

export async function runSearch(query: string): Promise<SearchResponse> {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = cache.get<SearchResponse>(cacheKey);
  if (cached) return { ...cached, cached: true };

  const normalized = await normalizeQuery(query);

  // Fall back to raw query as make so FIPE model→make lookup can still resolve it
  const withFallback: NormalizedQuery = {
    ...normalized,
    make: normalized.make ?? query,
  };
  const rawResults = await fetchSources(withFallback);

  const results = deduplicateResults(rawResults);
  const response: SearchResponse = { results, query: normalized, cached: false };

  cache.set(cacheKey, response, TTL.SEARCH);

  return response;
}
