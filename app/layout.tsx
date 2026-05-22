import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoPeças — Busca de Peças Automotivas',
  description: 'Busca gratuita de peças automotivas para mecânicos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-surface text-slate-900 antialiased">
        <header className="border-b border-border bg-white px-4 py-3">
          <a href="/" className="text-lg font-semibold text-primary">
            AutoPeças
          </a>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
