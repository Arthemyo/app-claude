import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./ai', () => ({
  normalizeQuery: vi.fn().mockResolvedValue({
    year: 2019,
    make: 'Ford',
    model: 'F-150',
    part: 'brake pads',
    synonyms: [],
    confidence: 'high',
  }),
}));

vi.mock('./nhtsa', () => ({
  searchByMakeModel: vi.fn().mockResolvedValue([
    {
      id: 'nhtsa-0',
      name: 'brake pads',
      source: 'nhtsa',
      vehicle: { year: 2019, make: 'Ford', model: 'F-150' },
      confidence: 'high',
    },
  ]),
}));

vi.mock('./carquery', () => ({
  searchByMakeModel: vi.fn().mockResolvedValue([]),
}));

vi.mock('./cache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./cache')>();
  return {
    ...actual,
    cache: new actual.InMemoryCache(),
    TTL: actual.TTL,
  };
});

import { runSearch } from './search';
import * as nhtsa from './nhtsa';
import * as carquery from './carquery';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runSearch', () => {
  it('returns results from NHTSA', async () => {
    const response = await runSearch('2019 Ford F150 brake pads');
    expect(response.results).toHaveLength(1);
    expect(response.results[0].name).toBe('brake pads');
  });

  it('returns cached: false on first call', async () => {
    const response = await runSearch('unique query one');
    expect(response.cached).toBe(false);
  });

  it('returns cached: true on second call with same query', async () => {
    await runSearch('unique query two');
    const second = await runSearch('unique query two');
    expect(second.cached).toBe(true);
  });

  it('does not call NHTSA on a cache hit', async () => {
    await runSearch('unique query three');
    await runSearch('unique query three');
    expect(nhtsa.searchByMakeModel).toHaveBeenCalledTimes(1);
  });

  it('deduplicates identical results from multiple sources', async () => {
    const duplicate = {
      id: 'cq-0',
      name: 'brake pads',
      source: 'carquery' as const,
      vehicle: { year: 2019, make: 'Ford', model: 'F-150' },
      confidence: 'high' as const,
    };
    vi.mocked(carquery.searchByMakeModel).mockResolvedValueOnce([duplicate]);

    const response = await runSearch('unique dedup query');
    expect(response.results).toHaveLength(1);
  });

  it('returns partial results when one source fails', async () => {
    vi.mocked(nhtsa.searchByMakeModel).mockRejectedValueOnce(new Error('NHTSA down'));
    // carquery returns [] by default — still get a response, just empty
    const response = await runSearch('unique failure query');
    expect(response.results).toEqual([]);
    expect(response.cached).toBe(false);
  });

  it('includes the normalized query in the response', async () => {
    const response = await runSearch('unique query four');
    expect(response.query.make).toBe('Ford');
    expect(response.query.part).toBe('brake pads');
  });
});
