import type { PartResult } from '@/types';

const BASE = 'https://www.carqueryapi.com/api/0.3/';
const TIMEOUT_MS = 3_000;
const ALLOWED_HOST = 'www.carqueryapi.com';

async function safeFetch(url: string): Promise<unknown> {
  const parsed = new URL(url);
  if (parsed.hostname !== ALLOWED_HOST) throw new Error('Disallowed host');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { redirect: 'error', signal: controller.signal });
    if (!res.ok) throw new Error(`CarQuery error: ${res.status}`);
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
    const params = new URLSearchParams({ cmd: 'getModels', make });
    if (year) params.set('year', String(year));
    if (model) params.set('model', model);

    const data = await safeFetch(`${BASE}?${params}`);
    if (typeof data !== 'object' || data === null) return [];

    const models = (data as { Models?: unknown[] }).Models ?? [];

    return models.slice(0, 10).map((m, i): PartResult => {
      const row = m as Record<string, unknown>;
      return {
        id: `carquery-${i}`,
        name: part,
        source: 'carquery',
        vehicle: {
          year: year ?? undefined,
          make: String(row.model_make_id ?? make),
          model: String(row.model_name ?? model ?? ''),
          trim: row.model_trim ? String(row.model_trim) : undefined,
        },
        confidence: 'medium',
      };
    });
  } catch {
    return [];
  }
}
