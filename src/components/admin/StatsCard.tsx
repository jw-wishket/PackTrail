'use client';

import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
}

export default function StatsCard({ label, value, delta, deltaType = 'neutral' }: StatsCardProps) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-foreground/10">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {delta && (
        <p
          className={cn(
            'mt-1 text-xs font-medium',
            deltaType === 'positive' && 'text-price-green',
            deltaType === 'negative' && 'text-destructive',
            deltaType === 'neutral' && 'text-muted-foreground'
          )}
        >
          {delta}
        </p>
      )}
    </div>
  );
}
