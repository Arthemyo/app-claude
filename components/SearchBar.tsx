'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 3) return;
    router.push(`/results?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl gap-2">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 2019 Ford F150 brake pads"
        maxLength={200}
        className="flex-1 rounded-lg border border-border bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
        autoFocus
      />
      <button
        type="submit"
        disabled={value.trim().length < 3}
        className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
      >
        Search
      </button>
    </form>
  );
}
