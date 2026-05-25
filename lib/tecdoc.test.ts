import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./cache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./cache')>();
  return { ...actual, cache: new actual.InMemoryCache(), TTL: actual.TTL };
});

import { searchByMakeModel } from './tecdoc';
import { cache } from './cache';

const BRANDS = [
  { brandId: 35, brandName: 'CHEVROLET' },
  { brandId: 21, brandName: 'FIAT' },
];

const SERIES = [
  { modelSeriesId: 1001, modelSeriesName: 'Onix' },
  { modelSeriesId: 1002, modelSeriesName: 'Tracker' },
];

const VEHICLES = [
  { linkingTargetId: 5001, description: 'Onix 1.0 2022', yearsOfConstrFrom: 202201, yearsOfConstrTo: 202212 },
  { linkingTargetId: 5002, description: 'Onix 1.0 2021', yearsOfConstrFrom: 202101, yearsOfConstrTo: 202112 },
];

const ARTICLES = [
  {
    articleNumber: 'BP-0042',
    mfrName: 'Bosch',
    oemNumbers: [{ displayNr: '13302471', brandName: 'GM' }],
  },
  {
    articleNumber: 'BP-0099',
    mfrName: 'Cofap',
    oemNumbers: [],
  },
];

let callIndex = 0;
function mockTecDoc(...sequences: unknown[][]) {
  callIndex = 0;
  vi.stubEnv('TECDOC_PROVIDER_ID', '12345');
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
    const body = sequences[callIndex] ?? [];
    const method = body[0] as string;
    const payload = body[1];
    callIndex++;
    return Promise.resolve({
      ok: true,
      json: async () => ({ [method]: payload, status: 200 }),
    });
  }));
}

// Simpler: mock fetch to return the right payload based on call order
function mockSequential(responses: Array<{ method: string; payload: unknown }>) {
  let i = 0;
  vi.stubEnv('TECDOC_PROVIDER_ID', '12345');
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url, opts) => {
    const body = JSON.parse((opts as RequestInit).body as string);
    const method = Object.keys(body)[0];
    const response = responses[i++] ?? { method, payload: {} };
    return {
      ok: true,
      json: async () => ({ [method]: response.payload, status: 200 }),
    };
  }));
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  cache.clear();
});

describe('tecdoc.searchByMakeModel', () => {
  it('returns empty array when TECDOC_PROVIDER_ID is not set', async () => {
    const results = await searchByMakeModel('Chevrolet', 'Onix', 2022, 'pastilha');
    expect(results).toEqual([]);
  });

  it('returns articles with OEM codes when full vehicle is specified', async () => {
    mockSequential([
      { method: 'getBrands',         payload: { brands: BRANDS } },
      { method: 'getModelSeries',    payload: { modelSeries: SERIES } },
      { method: 'getLinkageTargets', payload: { linkageTargets: VEHICLES } },
      { method: 'getArticles',       payload: { articles: ARTICLES } },
    ]);

    const results = await searchByMakeModel('Chevrolet', 'Onix', 2022, 'pastilha');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].source).toBe('tecdoc');
  });

  it('populates oem field from oemNumbers[0].displayNr', async () => {
    mockSequential([
      { method: 'getBrands',         payload: { brands: BRANDS } },
      { method: 'getModelSeries',    payload: { modelSeries: SERIES } },
      { method: 'getLinkageTargets', payload: { linkageTargets: VEHICLES } },
      { method: 'getArticles',       payload: { articles: ARTICLES } },
    ]);

    const results = await searchByMakeModel('Chevrolet', 'Onix', 2022, 'pastilha');
    const withOem = results.filter((r) => r.oem);
    expect(withOem.length).toBeGreaterThan(0);
    expect(withOem[0].oem).toBe('13302471');
  });

  it('sets confidence to high when make, model and year are all provided', async () => {
    mockSequential([
      { method: 'getBrands',         payload: { brands: BRANDS } },
      { method: 'getModelSeries',    payload: { modelSeries: SERIES } },
      { method: 'getLinkageTargets', payload: { linkageTargets: VEHICLES } },
      { method: 'getArticles',       payload: { articles: ARTICLES } },
    ]);

    const results = await searchByMakeModel('Chevrolet', 'Onix', 2022, 'pastilha');
    expect(results.every((r) => r.confidence === 'high')).toBe(true);
  });

  it('returns empty array when brand is not found', async () => {
    mockSequential([
      { method: 'getBrands', payload: { brands: BRANDS } },
    ]);

    const results = await searchByMakeModel('BrandXYZ', 'ModelABC', 2022, 'part');
    expect(results).toEqual([]);
  });

  it('returns empty array when model series does not match', async () => {
    mockSequential([
      { method: 'getBrands',      payload: { brands: BRANDS } },
      { method: 'getModelSeries', payload: { modelSeries: SERIES } },
    ]);

    const results = await searchByMakeModel('Chevrolet', 'NonExistentModel', 2022, 'part');
    expect(results).toEqual([]);
  });

  it('filters vehicles by year using YYYYMM format', async () => {
    const oldVehicle = {
      linkingTargetId: 9999,
      description: 'Onix 2015',
      yearsOfConstrFrom: 201501,
      yearsOfConstrTo: 201512,
    };

    mockSequential([
      { method: 'getBrands',         payload: { brands: BRANDS } },
      { method: 'getModelSeries',    payload: { modelSeries: [SERIES[0]] } },
      { method: 'getLinkageTargets', payload: { linkageTargets: [oldVehicle] } },
    ]);

    const results = await searchByMakeModel('Chevrolet', 'Onix', 2022, 'pastilha');
    expect(results).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    vi.stubEnv('TECDOC_PROVIDER_ID', '12345');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    const results = await searchByMakeModel('Chevrolet', 'Onix', 2022, 'part');
    expect(results).toEqual([]);
  });
});
