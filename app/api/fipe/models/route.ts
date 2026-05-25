import { NextRequest, NextResponse } from 'next/server';
import { cache, TTL } from '@/lib/cache';

const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1/carros';
const ALLOWED_HOST = 'parallelum.com.br';

export async function GET(req: NextRequest) {
  const brandId = req.nextUrl.searchParams.get('brandId') ?? '';

  if (!/^\d{1,6}$/.test(brandId)) {
    return NextResponse.json({ error: 'brandId inválido' }, { status: 400 });
  }

  const cacheKey = `fipe:models:${brandId}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const url = `${FIPE_BASE}/marcas/${brandId}/modelos`;
    const parsed = new URL(url);
    if (parsed.hostname !== ALLOWED_HOST) throw new Error('Disallowed host');

    const res = await fetch(url, { redirect: 'error' });
    if (!res.ok) throw new Error(`FIPE ${res.status}`);

    const data = await res.json();
    const models = data.modelos ?? [];
    cache.set(cacheKey, models, TTL.VEHICLES);
    return NextResponse.json(models);
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar modelos' }, { status: 502 });
  }
}
