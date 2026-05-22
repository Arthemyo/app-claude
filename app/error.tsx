'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24">
      <p className="mb-4 text-red-600">Something went wrong.</p>
      <button
        onClick={reset}
        className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover"
      >
        Try again
      </button>
    </div>
  );
}
