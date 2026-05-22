import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./cache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./cache')>();
  return { ...actual, cache: new actual.InMemoryCache(), TTL: actual.TTL };
});

import { searchByMakeModel } from './fipe';
import { cache } from './cache';

const BRANDS = [
  { codigo: '23', nome: 'Chevrolet' },
  { codigo: '25', nome: 'Fiat' },
  { codigo: '59', nome: 'Volkswagen' },
  { codigo: '97', nome: 'Hyundai' },
];

const CHEVROLET_MODELS = {
  modelos: [
    { codigo: 1, nome: 'Onix' },
    { codigo: 2, nome: 'Onix Plus' },
    { codigo: 3, nome: 'Tracker' },
    { codigo: 4, nome: 'S10' },
  ],
};

const FIAT_MODELS = {
  modelos: [
    { codigo: 10, nome: 'Argo' },
    { codigo: 11, nome: 'Mobi' },
    { codigo: 12, nome: 'Uno' },
  ],
};

function mockFIPESequence(...responses: unknown[]) {
  let i = 0;
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
    const data = responses[i++] ?? [];
    return Promise.resolve({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => data,
    });
  }));
}

beforeEach(() => {
  vi.unstubAllGlobals();
  cache.clear();
});

describe('fipe.searchByMakeModel', () => {
  it('returns models matching the make', async () => {
    mockFIPESequence(BRANDS, CHEVROLET_MODELS);
    const results = await searchByMakeModel('Chevrolet', null, null, 'pastilha de freio');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.vehicle.make === 'Chevrolet')).toBe(true);
    expect(results.every(r => r.source === 'fipe')).toBe(true);
  });

  it('filters models by name when model is specified', async () => {
    mockFIPESequence(BRANDS, CHEVROLET_MODELS);
    const results = await searchByMakeModel('Chevrolet', 'Onix', 2022, 'amortecedor');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every(r => /onix/i.test(r.vehicle.model ?? ''))).toBe(true);
  });

  it('sets confidence to high when model is specified', async () => {
    mockFIPESequence(BRANDS, CHEVROLET_MODELS);
    const results = await searchByMakeModel('Chevrolet', 'Onix', 2022, 'vela');
    expect(results.every(r => r.confidence === 'high')).toBe(true);
  });

  it('sets confidence to medium when no model is specified', async () => {
    mockFIPESequence(BRANDS, CHEVROLET_MODELS);
    const results = await searchByMakeModel('Chevrolet', null, null, 'vela');
    expect(results.every(r => r.confidence === 'medium')).toBe(true);
  });

  it('propagates part name to all results', async () => {
    mockFIPESequence(BRANDS, FIAT_MODELS);
    const results = await searchByMakeModel('Fiat', 'Argo', 2021, 'correia dentada');
    expect(results.every(r => r.name === 'correia dentada')).toBe(true);
  });

  it('propagates year to all results', async () => {
    mockFIPESequence(BRANDS, CHEVROLET_MODELS);
    const results = await searchByMakeModel('Chevrolet', 'Tracker', 2023, 'filtro de ar');
    expect(results.every(r => r.vehicle.year === 2023)).toBe(true);
  });

  it('returns empty array when make is not in FIPE', async () => {
    mockFIPESequence(BRANDS);
    const results = await searchByMakeModel('FakeBrand', 'X', null, 'part');
    expect(results).toEqual([]);
  });

  it('returns empty array when model does not match any FIPE model', async () => {
    mockFIPESequence(BRANDS, CHEVROLET_MODELS);
    const results = await searchByMakeModel('Chevrolet', 'Camaro', null, 'part');
    expect(results).toEqual([]);
  });

  it('resolves make from model name when make is not a known brand (e.g. "onix" → Chevrolet)', async () => {
    // Simulates keywordFallback passing make="onix" (the model itself) because it
    // couldn't identify the brand — FIPE should still find results via MODEL_TO_MAKE
    mockFIPESequence(BRANDS, CHEVROLET_MODELS);
    const results = await searchByMakeModel('onix', 'onix', 2022, 'suspensão');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].vehicle.make).toBe('Chevrolet');
  });

  it('returns empty array on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    const results = await searchByMakeModel('Chevrolet', 'Onix', null, 'part');
    expect(results).toEqual([]);
  });

  it('returns empty array on non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      headers: { get: () => 'application/json' },
    }));
    const results = await searchByMakeModel('Fiat', null, null, 'part');
    expect(results).toEqual([]);
  });
});
