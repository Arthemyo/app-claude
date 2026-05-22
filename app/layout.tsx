import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoParts Search',
  description: 'Free automotive parts search for mechanics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-slate-900 antialiased">
        <header className="border-b border-border bg-white px-4 py-3">
          <a href="/" className="text-lg font-semibold text-primary">
            AutoParts
          </a>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
