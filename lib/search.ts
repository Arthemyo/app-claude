import { normalizeQuery } from '@/lib/ai';
import { cache, TTL } from '@/lib/cache';
import * as fipe from '@/lib/fipe';
import * as nhtsa from '@/lib/nhtsa';
import * as carquery from '@/lib/carquery';
import type { SearchResponse, PartResult } from '@/types';

function deduplicateResults(results: PartResult[]): PartResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.name}-${r.vehicle.make}-${r.vehicle.model}-${r.vehicle.year}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function runSearch(query: string): Promise<SearchResponse> {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = cache.get<SearchResponse>(cacheKey);
  if (cached) return { ...cached, cached: true };

  const normalized = await normalizeQuery(query);

  const make = normalized.make ?? query;
  const [fipeResults, nhtsaResults, carqueryResults] = await Promise.allSettled([
    fipe.searchByMakeModel(make, normalized.model, normalized.year, normalized.part),
    nhtsa.searchByMakeModel(make, normalized.model, normalized.year, normalized.part),
    carquery.searchByMakeModel(make, normalized.model, normalized.year, normalized.part),
  ]);

  // FIPE first: covers Brazilian market (Onix, HB20, Gol, etc.) that NHTSA lacks
  const rawResults = [
    ...(fipeResults.status === 'fulfilled' ? fipeResults.value : []),
    ...(nhtsaResults.status === 'fulfilled' ? nhtsaResults.value : []),
    ...(carqueryResults.status === 'fulfilled' ? carqueryResults.value : []),
  ];

  const results = deduplicateResults(rawResults);
  const response: SearchResponse = { results, query: normalized, cached: false };

  cache.set(cacheKey, response, TTL.SEARCH);

  return response;
}
