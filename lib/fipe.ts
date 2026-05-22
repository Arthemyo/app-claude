import type { PartResult } from '@/types';
import { cache, TTL } from '@/lib/cache';

const BASE = 'https://parallelum.com.br/fipe/api/v1/carros';
const ALLOWED_HOST = 'parallelum.com.br';
const TIMEOUT_MS = 5_000;

interface FipeBrand  { codigo: string; nome: string }
interface FipeModel  { codigo: number; nome: string }

async function safeFetch<T>(url: string): Promise<T> {
  const parsed = new URL(url);
  if (parsed.hostname !== ALLOWED_HOST) throw new Error('Disallowed host');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { redirect: 'error', signal: controller.signal });
    if (!res.ok) throw new Error(`FIPE ${res.status}`);
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) throw new Error('Unexpected content-type');
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

const normalize = (s: string) => s.toLowerCase().replace(/[-\s]/g, '');

async function getBrands(): Promise<FipeBrand[]> {
  const key = 'fipe:brands';
  const cached = cache.get<FipeBrand[]>(key);
  if (cached) return cached;
  const brands = await safeFetch<FipeBrand[]>(`${BASE}/marcas`);
  cache.set(key, brands, TTL.BRANDS);
  return brands;
}

export async function searchByMakeModel(
  make: string,
  model: string | null,
  year: number | null,
  part: string
): Promise<PartResult[]> {
  try {
    const brands = await getBrands();

    const normMake = normalize(make);
    const brand =
      brands.find((b) => normalize(b.nome) === normMake) ??
      brands.find((b) => normalize(b.nome).includes(normMake) || normMake.includes(normalize(b.nome)));

    if (!brand) return [];

    const cacheKey = `fipe:models:${brand.codigo}`;
    let models = cache.get<FipeModel[]>(cacheKey);
    if (!models) {
      const data = await safeFetch<{ modelos: FipeModel[] }>(
        `${BASE}/marcas/${brand.codigo}/modelos`
      );
      models = data.modelos;
      cache.set(cacheKey, models, TTL.VEHICLES);
    }

    const matched = model
      ? models.filter((m) => {
          const n = normalize(m.nome);
          const q = normalize(model);
          return n.includes(q) || q.includes(n);
        })
      : models.slice(0, 8);

    if (matched.length === 0) return [];

    return matched.slice(0, 8).map((m): PartResult => ({
      id: `fipe-${brand.codigo}-${m.codigo}`,
      name: part,
      source: 'fipe',
      vehicle: {
        year: year ?? undefined,
        make: brand.nome,
        model: m.nome,
      },
      confidence: model ? 'high' : 'medium',
    }));
  } catch {
    return [];
  }
}
