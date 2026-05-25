import { Suspense } from 'react';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { PartCard } from '@/components/PartCard';
import { ErrorBanner } from '@/components/ErrorBanner';
import { sanitizeQuery } from '@/lib/validation';
import { runSearch, runStructuredSearch } from '@/lib/search';
import type { NormalizedQuery } from '@/types';

function sanitizeField(raw: string | undefined, max = 100): string {
  if (!raw) return '';
  return raw.trim().slice(0, max);
}

async function Results({ query, label }: { query: string | NormalizedQuery; label: string }) {
  const data =
    typeof query === 'string'
      ? await runSearch(query)
      : await runStructuredSearch(query);

  if (data.results.length === 0) {
    return (
      <p className="py-12 text-center text-muted">
        Nenhuma peça encontrada para &ldquo;{label}&rdquo;. Tente uma busca mais específica.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {data.results.map((part) => (
        <PartCard key={part.id} part={part} />
      ))}
    </ul>
  );
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  // Structured search: year + make + model + part
  const rawPart = sanitizeField(params.part);
  if (rawPart.length >= 2) {
    const year = params.year ? parseInt(params.year, 10) : null;
    const make = sanitizeField(params.make) || null;
    const model = sanitizeField(params.model) || null;
    const part = rawPart;

    if (isNaN(year as number) && params.year) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-12">
          <ErrorBanner message="Ano inválido. Por favor, tente novamente." />
        </div>
      );
    }

    const normalized: NormalizedQuery = {
      year: year ?? null,
      make,
      model,
      part,
      synonyms: [],
      confidence: make && model ? 'high' : make ? 'medium' : 'low',
    };

    const vehicleParts = [year, make, model].filter(Boolean).join(' ');
    const label = vehicleParts ? `${part} — ${vehicleParts}` : part;

    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="mb-6 text-sm text-muted">
          Resultados para{' '}
          <span className="font-medium text-slate-800">&ldquo;{label}&rdquo;</span>
        </p>
        <Suspense fallback={<SkeletonLoader count={5} />}>
          <Results query={normalized} label={label} />
        </Suspense>
      </div>
    );
  }

  // Legacy text search: ?q=...
  const raw = params.q ?? '';
  const query = sanitizeQuery(raw);

  if (!query) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <ErrorBanner message="Busca inválida. Por favor, tente novamente." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="mb-6 text-sm text-muted">
        Resultados para{' '}
        <span className="font-medium text-slate-800">&ldquo;{query}&rdquo;</span>
      </p>
      <Suspense fallback={<SkeletonLoader count={5} />}>
        <Results query={query} label={query} />
      </Suspense>
    </div>
  );
}
