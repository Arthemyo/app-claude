import { SearchBar } from '@/components/SearchBar';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">Encontre a peça certa</h1>
      <p className="mb-10 text-muted">Busque por ano, marca, modelo e nome da peça</p>
      <SearchBar />
    </div>
  );
}
