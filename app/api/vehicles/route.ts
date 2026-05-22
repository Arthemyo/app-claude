import { NextRequest, NextResponse } from 'next/server';
import { sanitizeName, sanitizeYear } from '@/lib/validation';
import { cache, TTL } from '@/lib/cache';

const NHTSA_BASE = 'https://api.nhtsa.dot.gov/vehicles';
const TIMEOUT_MS = 5_000;

async function nhtsaFetch(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: 'error', signal: controller.signal });
    if (!res.ok) throw new Error('NHTSA error');
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const make = sanitizeName(searchParams.get('make'));
  const year = sanitizeYear(searchParams.get('year'));

  if (!make) {
    return NextResponse.json({ error: 'Invalid make', code: 'INVALID_MAKE' }, { status: 400 });
  }

  const cacheKey = `vehicles:${make.toLowerCase()}:${year ?? 'any'}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const url = year
      ? `${NHTSA_BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}`
      : `${NHTSA_BASE}/GetModelsForMake/${encodeURIComponent(make)}`;

    const data = await nhtsaFetch(url);
    cache.set(cacheKey, data, TTL.VEHICLES);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Vehicle lookup failed', code: 'UPSTREAM_ERROR' },
      { status: 502 }
    );
  }
}
