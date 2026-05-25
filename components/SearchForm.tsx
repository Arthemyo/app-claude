'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface FipeBrand { codigo: string; nome: string }
interface FipeModel { codigo: number; nome: string }

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1969 }, (_, i) => CURRENT_YEAR - i);

const selectClass =
  'w-full rounded-lg border border-border bg-white px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed';

export function SearchForm() {
  const router = useRouter();

  const [brands, setBrands] = useState<FipeBrand[]>([]);
  const [models, setModels] = useState<FipeModel[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);

  const [year, setYear] = useState('');
  const [brandId, setBrandId] = useState('');
  const [brandName, setBrandName] = useState('');
  const [modelName, setModelName] = useState('');
  const [part, setPart] = useState('');

  useEffect(() => {
    fetch('/api/fipe/brands')
      .then((r) => r.json())
      .then((data: FipeBrand[]) => setBrands(data))
      .catch(() => {})
      .finally(() => setLoadingBrands(false));
  }, []);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      setModelName('');
      return;
    }
    setLoadingModels(true);
    setModelName('');
    fetch(`/api/fipe/models?brandId=${encodeURIComponent(brandId)}`)
      .then((r) => r.json())
      .then((data: FipeModel[]) => setModels(data))
      .catch(() => {})
      .finally(() => setLoadingModels(false));
  }, [brandId]);

  function handleBrandChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = brands.find((b) => b.codigo === e.target.value);
    setBrandId(e.target.value);
    setBrandName(selected?.nome ?? '');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedPart = part.trim();
    if (trimmedPart.length < 2) return;

    const params = new URLSearchParams();
    if (year) params.set('year', year);
    if (brandName) params.set('make', brandName);
    if (modelName) params.set('model', modelName);
    params.set('part', trimmedPart);

    router.push(`/results?${params.toString()}`);
  }

  const canSubmit = part.trim().length >= 2;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Ano
          </label>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
            <option value="">Qualquer</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Marca
          </label>
          <select
            value={brandId}
            onChange={handleBrandChange}
            disabled={loadingBrands}
            className={selectClass}
          >
            <option value="">{loadingBrands ? 'Carregando…' : 'Selecione'}</option>
            {brands.map((b) => (
              <option key={b.codigo} value={b.codigo}>{b.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Modelo
          </label>
          <select
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            disabled={!brandId || loadingModels}
            className={selectClass}
          >
            <option value="">
              {!brandId ? 'Escolha a marca' : loadingModels ? 'Carregando…' : 'Selecione'}
            </option>
            {models.map((m) => (
              <option key={m.codigo} value={m.nome}>{m.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Peça
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={part}
            onChange={(e) => setPart(e.target.value)}
            placeholder="ex: pastilha de freio, amortecedor, correia…"
            maxLength={200}
            autoFocus
            className="flex-1 rounded-lg border border-border bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            Buscar
          </button>
        </div>
      </div>
    </form>
  );
}
