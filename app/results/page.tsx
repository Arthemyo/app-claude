import { Suspense } from 'react';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { PartCard } from '@/components/PartCard';
import { ErrorBanner } from '@/components/ErrorBanner';
import { sanitizeQuery } from '@/lib/validation';
import { runSearch } from '@/lib/search';

async function Results({ query }: { query: string }) {
  const data = await runSearch(query);

  if (data.results.length === 0) {
    return (
      <p className="text-center text-muted py-12">
        Nenhuma peça encontrada para &ldquo;{query}&rdquo;. Tente uma busca mais específica.
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
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
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
        Resultados para <span className="font-medium text-slate-800">&ldquo;{query}&rdquo;</span>
      </p>
      <Suspense fallback={<SkeletonLoader count={5} />}>
        <Results query={query} />
      </Suspense>
    </div>
  );
}
