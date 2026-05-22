const styles: Record<string, string> = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-slate-100 text-slate-600',
};

const labels: Record<string, string> = {
  high: 'Alta compatibilidade',
  medium: 'Provável compatibilidade',
  low: 'Possível compatibilidade',
};

export function CompatibilityBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[confidence]}`}>
      {labels[confidence]}
    </span>
  );
}
