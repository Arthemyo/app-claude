export function SkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/5 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}
