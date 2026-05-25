import { SearchForm } from '@/components/SearchForm';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">Encontre a peça certa</h1>
      <p className="mb-10 text-muted">Selecione o veículo e informe a peça que precisa</p>
      <SearchForm />
    </div>
  );
}
