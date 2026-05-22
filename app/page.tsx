import { SearchBar } from '@/components/SearchBar';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">Find the right part</h1>
      <p className="mb-10 text-muted">Search by year, make, model, and part name</p>
      <SearchBar />
    </div>
  );
}
