import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryCache } from './cache';

describe('InMemoryCache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
  });

  it('returns null for a missing key', () => {
    expect(cache.get('missing')).toBeNull();
  });

  it('stores and retrieves a value', () => {
    cache.set('key', { foo: 'bar' }, 5000);
    expect(cache.get('key')).toEqual({ foo: 'bar' });
  });

  it('returns null after TTL expires', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValueOnce(now).mockReturnValueOnce(now + 10_001);
    cache.set('key', 'value', 10_000);
    expect(cache.get('key')).toBeNull();
  });

  it('has() returns true for a live key', () => {
    cache.set('key', 42, 5000);
    expect(cache.has('key')).toBe(true);
  });

  it('has() returns false for an expired key', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValueOnce(now).mockReturnValueOnce(now + 5_001);
    cache.set('key', 42, 5_000);
    expect(cache.has('key')).toBe(false);
  });

  it('overwrites an existing key', () => {
    cache.set('key', 'first', 5000);
    cache.set('key', 'second', 5000);
    expect(cache.get('key')).toBe('second');
  });
});
