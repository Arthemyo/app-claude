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

// Known Brazilian model → make mappings for when AI fails to identify the brand
const MODEL_TO_MAKE: Record<string, string> = {
  onix: 'Chevrolet', tracker: 'Chevrolet', spin: 'Chevrolet', montana: 'Chevrolet',
  s10: 'Chevrolet', cruze: 'Chevrolet', equinox: 'Chevrolet', trailblazer: 'Chevrolet',
  hb20: 'Hyundai', creta: 'Hyundai', tucson: 'Hyundai', ix35: 'Hyundai',
  gol: 'Volkswagen', polo: 'Volkswagen', virtus: 'Volkswagen', tcross: 'Volkswagen',
  saveiro: 'Volkswagen', voyage: 'Volkswagen', tiguan: 'Volkswagen', amarok: 'Volkswagen',
  argo: 'Fiat', uno: 'Fiat', mobi: 'Fiat', cronos: 'Fiat', toro: 'Fiat',
  strada: 'Fiat', pulse: 'Fiat', ducato: 'Fiat', doblo: 'Fiat', bravo: 'Fiat',
  sandero: 'Renault', kwid: 'Renault', duster: 'Renault', logan: 'Renault',
  captur: 'Renault', oroch: 'Renault', kardian: 'Renault',
  compass: 'Jeep', renegade: 'Jeep', commander: 'Jeep',
  hr: 'Honda', hrv: 'Honda', civic: 'Honda', fit: 'Honda', wrv: 'Honda', city: 'Honda',
  corolla: 'Toyota', hilux: 'Toyota', yaris: 'Toyota', sw4: 'Toyota', rav4: 'Toyota',
  kicks: 'Nissan', frontier: 'Nissan', versa: 'Nissan', march: 'Nissan',
};

function makeFromModel(model: string): string | null {
  return MODEL_TO_MAKE[normalize(model)] ?? null;
}

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
    let brand =
      brands.find((b) => normalize(b.nome) === normMake) ??
      brands.find((b) => normalize(b.nome).includes(normMake) || normMake.includes(normalize(b.nome)));

    // When AI couldn't identify the make (e.g. query is "onix suspensão"), try
    // resolving it from the model name using the known Brazilian model→make map.
    if (!brand && model) {
      const inferredMake = makeFromModel(model);
      if (inferredMake) {
        const normInferred = normalize(inferredMake);
        brand =
          brands.find((b) => normalize(b.nome) === normInferred) ??
          brands.find((b) => normalize(b.nome).includes(normInferred) || normInferred.includes(normalize(b.nome)));
      }
    }

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
