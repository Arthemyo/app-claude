'use client';

import { useState } from 'react';
import { CompatibilityBadge } from './CompatibilityBadge';
import type { PartResult } from '@/types';

interface LinkDef {
  label: string;
  href: string;
}

function buildLinks(part: PartResult): { suppliers: LinkDef[]; tutorials: LinkDef[]; info: LinkDef[] } {
  const { vehicle, name } = part;
  const vehicleStr = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const partQuery = encodeURIComponent(`${vehicleStr} ${name}`);
  const tutorialQuery = encodeURIComponent(`como trocar ${name} ${vehicleStr}`);

  const suppliers: LinkDef[] = [
    { label: 'Mercado Livre', href: `https://lista.mercadolivre.com.br/${partQuery}` },
    { label: 'Amazon Brasil', href: `https://www.amazon.com.br/s?k=${partQuery}` },
    { label: 'Shopee', href: `https://shopee.com.br/search?keyword=${partQuery}` },
    { label: 'Magazine Luiza', href: `https://www.magazineluiza.com.br/busca/${partQuery}/` },
    { label: 'Americanas', href: `https://www.americanas.com.br/busca/${partQuery}` },
  ];

  const tutorials: LinkDef[] = [
    { label: 'Tutorial no YouTube', href: `https://www.youtube.com/results?search_query=${tutorialQuery}` },
    { label: 'Pesquisar no Google', href: `https://www.google.com.br/search?q=${tutorialQuery}` },
  ];

  const oemQuery = encodeURIComponent(`código OEM número peça ${name} ${vehicleStr}`.trim());
  const techQuery = encodeURIComponent(`ficha técnica ${name} ${vehicleStr}`.trim());
  const torqueQuery = encodeURIComponent(`torque especificações ${name} ${vehicleStr}`.trim());
  const mecanicoQuery = encodeURIComponent(`${name} ${vehicleStr}`.trim());

  const info: LinkDef[] = [
    {
      label: 'Buscar código OEM',
      href: `https://www.google.com.br/search?q=${oemQuery}`,
    },
    {
      label: 'Ficha técnica',
      href: `https://www.google.com.br/search?q=${techQuery}`,
    },
    {
      label: 'Torque e medidas',
      href: `https://www.google.com.br/search?q=${torqueQuery}`,
    },
    {
      label: 'Guia do Mecânico',
      href: `https://www.guiadomecanico.com.br/?s=${mecanicoQuery}`,
    },
  ];

  if (vehicle.make && vehicle.model && vehicle.year) {
    info.push({
      label: 'Recalls NHTSA',
      href: `https://www.nhtsa.gov/recalls?nhtsaId=&make=${encodeURIComponent(vehicle.make)}&model=${encodeURIComponent(vehicle.model)}&year=${vehicle.year}`,
    });
  }

  return { suppliers, tutorials, info };
}

function ExternalLink({ href, label }: LinkDef) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-primary hover:text-primary transition-colors"
    >
      {label}
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-50">
        <path d="M5.5 1H9M9 1V4.5M9 1L4 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 2H2C1.44772 2 1 2.44772 1 3V8C1 8.55228 1.44772 9 2 9H7C7.55228 9 8 8.55228 8 8V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </a>
  );
}

function LinkGroup({ title, links }: { title: string; links: LinkDef[] }) {
  if (links.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => <ExternalLink key={l.label} {...l} />)}
      </div>
    </div>
  );
}

export function PartCard({ part }: { part: PartResult }) {
  const [open, setOpen] = useState(false);
  const { vehicle } = part;
  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const links = buildLinks(part);

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-4 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-slate-900">{part.name}</p>
            {vehicleLabel && <p className="mt-0.5 text-sm text-muted">{vehicleLabel}</p>}
            {part.oem && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-xs font-medium text-amber-800">
                OEM {part.oem}
              </span>
            )}
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-1">
            <CompatibilityBadge confidence={part.confidence} />
            <span className="text-xs text-muted capitalize">{part.source}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-primary">
          <span>{open ? 'Ocultar links' : 'Ver links'}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border bg-slate-50 px-4 py-4">
          <LinkGroup title="Comprar esta peça" links={links.suppliers} />
          <LinkGroup title="Tutorial" links={links.tutorials} />
          <LinkGroup title="Dados oficiais" links={links.info} />
        </div>
      )}
    </li>
  );
}
