import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeQuery } from './ai';

function mockFetchResponse(content: string, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
  }));
}

const VALID_AI_RESPONSE = JSON.stringify({
  year: 2019,
  make: 'Ford',
  model: 'F-150',
  part: 'brake pads',
  synonyms: ['disc brakes'],
  confidence: 'high',
});

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'sk-test-key';
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('normalizeQuery — AI path', () => {
  it('parses a clean JSON response from the AI', async () => {
    mockFetchResponse(VALID_AI_RESPONSE);
    const result = await normalizeQuery('2019 Ford F150 brake pads');
    expect(result.make).toBe('Ford');
    expect(result.part).toBe('brake pads');
    expect(result.confidence).toBe('high');
  });

  it('strips markdown code fences before parsing', async () => {
    mockFetchResponse('```json\n' + VALID_AI_RESPONSE + '\n```');
    const result = await normalizeQuery('2019 Ford F150 brake pads');
    expect(result.make).toBe('Ford');
    expect(result.confidence).toBe('high');
  });

  it('falls back when AI returns invalid JSON', async () => {
    mockFetchResponse('not valid json at all');
    const result = await normalizeQuery('2019 Ford F150 brake pads');
    expect(result.confidence).toBe('low');
  });

  it('falls back when API returns non-ok status', async () => {
    mockFetchResponse('', false);
    const result = await normalizeQuery('Toyota Camry oil filter');
    expect(result.confidence).toBe('low');
  });

  it('falls back when AI returns non-automotive error', async () => {
    mockFetchResponse(JSON.stringify({ error: 'non_automotive' }));
    const result = await normalizeQuery('what is the weather today');
    expect(result.confidence).toBe('low');
  });

  it('falls back when AI omits required part field', async () => {
    mockFetchResponse(JSON.stringify({ year: 2019, make: 'Ford', confidence: 'high' }));
    const result = await normalizeQuery('Ford something');
    expect(result.confidence).toBe('low');
  });

  it('falls back when AI returns invalid confidence value', async () => {
    mockFetchResponse(JSON.stringify({ ...JSON.parse(VALID_AI_RESPONSE), confidence: 'very_sure' }));
    const result = await normalizeQuery('Ford F150 brakes');
    expect(result.confidence).toBe('low');
  });
});

describe('normalizeQuery — keyword fallback', () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  it('extracts year from query', async () => {
    const result = await normalizeQuery('2019 Ford F150 brake pads');
    expect(result.year).toBe(2019);
  });

  it('extracts known make from query', async () => {
    const result = await normalizeQuery('Toyota Camry oil filter');
    expect(result.make).toBe('Toyota');
  });

  it('extracts model as first token after make', async () => {
    const result = await normalizeQuery('Honda Civic spark plugs');
    expect(result.model).toBe('Civic');
  });

  it('returns confidence low', async () => {
    const result = await normalizeQuery('Ford Mustang exhaust');
    expect(result.confidence).toBe('low');
  });

  it('returns null make when make is unknown', async () => {
    const result = await normalizeQuery('some unknown brand widget');
    expect(result.make).toBeNull();
  });

  it('handles query with no year', async () => {
    const result = await normalizeQuery('Chevy Silverado brakes');
    expect(result.year).toBeNull();
    expect(result.make).toBe('Chevy');
  });
});
