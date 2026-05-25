import { NextResponse } from 'next/server';
import { cache, TTL } from '@/lib/cache';

const FIPE_BRANDS_URL = 'https://parallelum.com.br/fipe/api/v1/carros/marcas';
const ALLOWED_HOST = 'parallelum.com.br';

export async function GET() {
  const cacheKey = 'fipe:brands';
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const url = new URL(FIPE_BRANDS_URL);
    if (url.hostname !== ALLOWED_HOST) throw new Error('Disallowed host');

    const res = await fetch(FIPE_BRANDS_URL, { redirect: 'error' });
    if (!res.ok) throw new Error(`FIPE ${res.status}`);

    const data = await res.json();
    cache.set(cacheKey, data, TTL.BRANDS);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar marcas' }, { status: 502 });
  }
}
