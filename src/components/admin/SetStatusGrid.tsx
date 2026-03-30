'use client';

import { cn } from '@/lib/utils';

interface EquipmentSet {
  id: number;
  name: string;
  status: string;
  currentReservation?: {
    id: string;
    status: string;
    useStartDate: string;
    useEndDate: string;
  } | null;
}

interface SetStatusGridProps {
  sets: EquipmentSet[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: '대기', color: 'text-price-green', bg: 'bg-price-green/10' },
  RESERVED: { label: '예약됨', color: 'text-status-blue', bg: 'bg-status-blue/10' },
  PREPARING: { label: '준비중', color: 'text-status-purple', bg: 'bg-status-purple/10' },
  SHIPPING: { label: '배송중', color: 'text-warning', bg: 'bg-warning/10' },
  IN_USE: { label: '사용중', color: 'text-olive', bg: 'bg-olive/10' },
  RETURNING: { label: '반납중', color: 'text-holding', bg: 'bg-holding/10' },
  MAINTENANCE: { label: '정비중', color: 'text-muted-foreground', bg: 'bg-muted' },
};

export default function SetStatusGrid({ sets }: SetStatusGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {sets.map((set) => {
        const config = STATUS_CONFIG[set.status] ?? {
          label: set.status,
          color: 'text-muted-foreground',
          bg: 'bg-muted',
        };
        return (
          <div
            key={set.id}
            className="rounded-xl bg-white p-3 ring-1 ring-foreground/10"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium truncate">{set.name}</span>
              <span
                className={cn(
                  'inline-flex h-2 w-2 rounded-full',
                  set.status === 'AVAILABLE' ? 'bg-price-green' :
                  set.status === 'IN_USE' ? 'bg-olive' :
                  set.status === 'SHIPPING' ? 'bg-warning' :
                  set.status === 'RETURNING' ? 'bg-holding' :
                  set.status === 'MAINTENANCE' ? 'bg-muted-foreground' :
                  'bg-status-blue'
                )}
              />
            </div>
            <span
              className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                config.bg,
                config.color
              )}
            >
              {config.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
