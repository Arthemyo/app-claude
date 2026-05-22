import { CompatibilityBadge } from './CompatibilityBadge';
import type { PartResult } from '@/types';

export function PartCard({ part }: { part: PartResult }) {
  const { vehicle } = part;
  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');

  return (
    <li className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-slate-900">{part.name}</p>
          {vehicleLabel && (
            <p className="mt-0.5 text-sm text-muted">{vehicleLabel}</p>
          )}
          {part.oem && (
            <p className="mt-0.5 text-xs text-muted">OEM: {part.oem}</p>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <CompatibilityBadge confidence={part.confidence} />
          <span className="text-xs text-muted capitalize">{part.source}</span>
        </div>
      </div>
    </li>
  );
}
