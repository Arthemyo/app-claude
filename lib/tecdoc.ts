import type { PartResult } from '@/types';
import { cache, TTL } from '@/lib/cache';

const BASE = 'https://webservice.tecalliance.net/pegasus-3-0/services/TecdocToCatDLB.jsonEndpoint';
const ALLOWED_HOST = 'webservice.tecalliance.net';
const TIMEOUT_MS = 8_000;

interface TDBrand       { brandId: number; brandName: string }
interface TDModelSeries { modelSeriesId: number; modelSeriesName: string }
interface TDVehicle     { linkingTargetId: number; description: string; yearsOfConstrFrom: number; yearsOfConstrTo: number }
interface TDOemRef      { displayNr: string; brandName: string }
interface TDArticle     { articleNumber: string; mfrName: string; oemNumbers?: TDOemRef[] }

function providerId(): number | null {
  const v = process.env.TECDOC_PROVIDER_ID;
  if (!v) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

async function tdPost<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const pid = providerId();
  if (!pid) throw new Error('TECDOC_PROVIDER_ID not configured');

  const parsed = new URL(BASE);
  if (parsed.hostname !== ALLOWED_HOST) throw new Error('Disallowed host');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [method]: { ...params, provider: pid, lang: 'PT' } }),
      redirect: 'error',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`TecDoc HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 200) throw new Error(`TecDoc status ${data.status}`);
    return data[method] as T;
  } finally {
    clearTimeout(timer);
  }
}

const normalize = (s: string) => s.toLowerCase().replace(/[-\s]/g, '');

async function getBrands(): Promise<TDBrand[]> {
  const key = 'tecdoc:brands';
  const cached = cache.get<TDBrand[]>(key);
  if (cached) return cached;

  const data = await tdPost<{ brands: TDBrand[] }>('getBrands', {
    linkingTargetType: 'P',
    perPage: 500,
    page: 1,
  });
  const brands = data.brands ?? [];
  cache.set(key, brands, TTL.BRANDS);
  return brands;
}

async function getModelSeries(brandId: number): Promise<TDModelSeries[]> {
  const key = `tecdoc:series:${brandId}`;
  const cached = cache.get<TDModelSeries[]>(key);
  if (cached) return cached;

  const data = await tdPost<{ modelSeries: TDModelSeries[] }>('getModelSeries', {
    manufacturerId: brandId,
    linkingTargetType: 'P',
    perPage: 200,
    page: 1,
  });
  const series = data.modelSeries ?? [];
  cache.set(key, series, TTL.VEHICLES);
  return series;
}

async function getLinkageTargets(modelSeriesId: number): Promise<TDVehicle[]> {
  const key = `tecdoc:vehicles:${modelSeriesId}`;
  const cached = cache.get<TDVehicle[]>(key);
  if (cached) return cached;

  const data = await tdPost<{ linkageTargets: TDVehicle[] }>('getLinkageTargets', {
    modelSeriesId,
    linkingTargetType: 'P',
    perPage: 100,
    page: 1,
  });
  const vehicles = data.linkageTargets ?? [];
  cache.set(key, vehicles, TTL.VEHICLES);
  return vehicles;
}

async function getArticles(params: Record<string, unknown>): Promise<TDArticle[]> {
  const data = await tdPost<{ articles: TDArticle[] }>('getArticles', {
    ...params,
    linkingTargetType: 'P',
    perPage: 5,
    page: 1,
  });
  return data.articles ?? [];
}

// yearsOfConstrFrom/To are YYYYMM (e.g. 202201). Extract the year part.
function tdYear(yyyymm: number): number {
  return Math.floor(yyyymm / 100);
}

export async function searchByMakeModel(
  make: string,
  model: string | null,
  year: number | null,
  part: string
): Promise<PartResult[]> {
  if (!providerId()) return [];

  try {
    // Step 1 — find brand
    const brands = await getBrands();
    const normMake = normalize(make);
    const brand =
      brands.find((b) => normalize(b.brandName) === normMake) ??
      brands.find((b) => normalize(b.brandName).includes(normMake) || normMake.includes(normalize(b.brandName)));
    if (!brand) return [];

    // Step 2 — find model series + vehicles when model is given
    let vehicleIds: number[] = [];

    if (model) {
      const allSeries = await getModelSeries(brand.brandId);
      const normModel = normalize(model);
      const matched = allSeries.filter((s) => {
        const n = normalize(s.modelSeriesName);
        return n.includes(normModel) || normModel.includes(n);
      });

      if (matched.length === 0) return [];

      const vehicleArrays = await Promise.allSettled(
        matched.slice(0, 3).map((s) => getLinkageTargets(s.modelSeriesId))
      );

      const allVehicles = vehicleArrays
        .filter((r): r is PromiseFulfilledResult<TDVehicle[]> => r.status === 'fulfilled')
        .flatMap((r) => r.value);

      const yearFiltered = year
        ? allVehicles.filter(
            (v) =>
              tdYear(v.yearsOfConstrFrom) <= year &&
              (v.yearsOfConstrTo === 0 || tdYear(v.yearsOfConstrTo) >= year)
          )
        : allVehicles;

      vehicleIds = yearFiltered.slice(0, 4).map((v) => v.linkingTargetId);
      if (vehicleIds.length === 0) return [];
    }

    // Step 3 — fetch articles (one call per vehicle, or brand-level if no vehicle)
    const calls =
      vehicleIds.length > 0
        ? vehicleIds.map((id) => getArticles({ linkingTargetId: id, searchQuery: part }))
        : [getArticles({ brandId: brand.brandId, searchQuery: part })];

    const articleResults = await Promise.allSettled(calls);
    const articles = articleResults
      .filter((r): r is PromiseFulfilledResult<TDArticle[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    if (articles.length === 0) return [];

    // Deduplicate by articleNumber, prefer entries that have OEM refs
    const seen = new Set<string>();
    return articles
      .sort((a, b) => (b.oemNumbers?.length ?? 0) - (a.oemNumbers?.length ?? 0))
      .filter((a) => {
        if (seen.has(a.articleNumber)) return false;
        seen.add(a.articleNumber);
        return true;
      })
      .slice(0, 5)
      .map((a): PartResult => ({
        id: `tecdoc-${a.articleNumber}`,
        name: part,
        oem: a.oemNumbers?.[0]?.displayNr,
        source: 'tecdoc',
        vehicle: {
          year: year ?? undefined,
          make: brand.brandName,
          model: model ?? undefined,
        },
        confidence: model && year ? 'high' : 'medium',
      }));
  } catch {
    return [];
  }
}
