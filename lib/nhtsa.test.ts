import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchByMakeModel } from './nhtsa';

const FORD_MODELS = {
  Count: 3,
  Results: [
    { Make_ID: 460, Make_Name: 'Ford', Model_ID: 1801, Model_Name: 'F-150' },
    { Make_ID: 460, Make_Name: 'Ford', Model_ID: 1802, Model_Name: 'F-150 Heritage' },
    { Make_ID: 460, Make_Name: 'Ford', Model_ID: 1803, Model_Name: 'Mustang' },
    // Unrelated make that NHTSA sometimes returns alongside Ford
    { Make_ID: 999, Make_Name: 'Waterford Tank and Fabrication', Model_ID: 9999, Model_Name: 'Tank' },
  ],
};

function mockNHTSA(data: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    headers: { get: () => 'application/json' },
    json: async () => data,
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe('searchByMakeModel', () => {
  it('returns matching models for a make', async () => {
    mockNHTSA(FORD_MODELS);
    const results = await searchByMakeModel('Ford', null, null, 'brakes');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.vehicle.make === 'Ford')).toBe(true);
  });

  it('filters out unrelated makes (e.g. Waterford)', async () => {
    mockNHTSA(FORD_MODELS);
    const results = await searchByMakeModel('Ford', null, null, 'brakes');
    expect(results.every(r => r.vehicle.make !== 'Waterford Tank and Fabrication')).toBe(true);
  });

  it('matches model ignoring hyphens: F150 matches F-150', async () => {
    mockNHTSA(FORD_MODELS);
    const results = await searchByMakeModel('Ford', 'F150', 2019, 'brake pads');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].vehicle.model).toBe('F-150');
  });

  it('returns empty array when model does not match any result', async () => {
    mockNHTSA(FORD_MODELS);
    const results = await searchByMakeModel('Ford', 'Ka', null, 'brakes');
    expect(results).toEqual([]);
  });

  it('sets part name on each result', async () => {
    mockNHTSA(FORD_MODELS);
    const results = await searchByMakeModel('Ford', null, null, 'alternator');
    expect(results.every(r => r.name === 'alternator')).toBe(true);
  });

  it('sets confidence to high when model is specified', async () => {
    mockNHTSA(FORD_MODELS);
    const results = await searchByMakeModel('Ford', 'F150', 2019, 'brakes');
    expect(results.every(r => r.confidence === 'high')).toBe(true);
  });

  it('sets confidence to medium when no model is specified', async () => {
    mockNHTSA(FORD_MODELS);
    const results = await searchByMakeModel('Ford', null, null, 'brakes');
    expect(results.every(r => r.confidence === 'medium')).toBe(true);
  });

  it('returns empty array on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const results = await searchByMakeModel('Ford', 'F150', 2019, 'brakes');
    expect(results).toEqual([]);
  });

  it('returns empty array on non-ok HTTP response', async () => {
    mockNHTSA({}, false);
    const results = await searchByMakeModel('Ford', 'F150', 2019, 'brakes');
    expect(results).toEqual([]);
  });
});
