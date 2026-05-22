import type { PartResult } from '@/types';

const BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';
const TIMEOUT_MS = 5_000;
const ALLOWED_HOST = 'vpic.nhtsa.dot.gov';

async function safeFetch(url: string): Promise<unknown> {
  const parsed = new URL(url);
  if (parsed.hostname !== ALLOWED_HOST) throw new Error('Disallowed host');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { redirect: 'error', signal: controller.signal });
    if (!res.ok) throw new Error(`NHTSA error: ${res.status}`);
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) throw new Error('Unexpected content-type');
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function searchByMakeModel(
  make: string,
  model: string | null,
  year: number | null,
  part: string
): Promise<PartResult[]> {
  try {
    const url = `${BASE}/GetModelsForMake/${encodeURIComponent(make)}?format=json`;
    const data = await safeFetch(url);
    if (typeof data !== 'object' || data === null) return [];

    const allModels = (data as { Results?: unknown[] }).Results ?? [];

    // Strip hyphens/spaces for fuzzy comparison: "F-150" matches "F150"
    const normalize = (s: string) => s.toLowerCase().replace(/[-\s]/g, '');

    // Exact-match the make first to drop unrelated makes returned by NHTSA
    // (e.g. "GetModelsForMake/ford" also returns "Waterford Tank and Fabrication")
    const makeModels = allModels.filter((r) => {
      const row = r as Record<string, unknown>;
      return normalize(String(row.Make_Name ?? '')) === normalize(make);
    });

    const filtered = model
      ? makeModels.filter((r) => {
          const row = r as Record<string, unknown>;
          const name = normalize(String(row.Model_Name ?? ''));
          return name.includes(normalize(model));
        })
      : makeModels.slice(0, 10);

    if (filtered.length === 0) return [];

    return filtered.slice(0, 10).map((r, i): PartResult => {
      const row = r as Record<string, unknown>;
      return {
        id: `nhtsa-${i}`,
        name: part,
        source: 'nhtsa',
        vehicle: {
          year: year ?? undefined,
          make: String(row.Make_Name ?? make),
          model: String(row.Model_Name ?? model ?? ''),
        },
        confidence: model ? 'high' : 'medium',
      };
    });
  } catch {
    return [];
  }
}
