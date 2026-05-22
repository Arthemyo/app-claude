import { SkeletonLoader } from '@/components/SkeletonLoader';

export default function ResultsLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <SkeletonLoader count={5} />
    </div>
  );
}
