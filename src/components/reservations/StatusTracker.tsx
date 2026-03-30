'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

type ReservationStatus = 'HOLDING' | 'CONFIRMED' | 'SHIPPING' | 'IN_USE' | 'RETURNING' | 'COMPLETED' | 'CANCELLED';

const TRACKER_STEPS = [
  { key: 'CONFIRMED', label: '확정' },
  { key: 'SHIPPING', label: '배송' },
  { key: 'IN_USE', label: '사용' },
  { key: 'RETURNING', label: '회수' },
  { key: 'COMPLETED', label: '완료' },
] as const;

const STATUS_ORDER: Record<string, number> = {
  HOLDING: 0,
  CONFIRMED: 1,
  SHIPPING: 2,
  IN_USE: 3,
  RETURNING: 4,
  COMPLETED: 5,
  CANCELLED: -1,
};

interface StatusTrackerProps {
  status: ReservationStatus;
  compact?: boolean;
}

export function StatusTracker({ status, compact = false }: StatusTrackerProps) {
  const currentOrder = STATUS_ORDER[status] ?? 0;
  const isCancelled = status === 'CANCELLED';

  if (isCancelled) {
    return (
      <div className="flex items-center justify-center py-2">
        <span className="text-sm font-semibold text-destructive">예약이 취소되었습니다</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full">
      {TRACKER_STEPS.map((step, i) => {
        const stepOrder = STATUS_ORDER[step.key];
        const isCompleted = currentOrder > stepOrder;
        const isActive = currentOrder === stepOrder;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex items-center justify-center rounded-full transition-colors',
                  compact ? 'h-5 w-5' : 'h-7 w-7',
                  isCompleted && 'bg-olive text-white',
                  isActive && 'bg-olive text-white ring-2 ring-olive/30',
                  !isCompleted && !isActive && 'bg-beige text-sage',
                )}
              >
                {isCompleted ? (
                  <Check className={compact ? 'size-3' : 'size-3.5'} />
                ) : (
                  <span className={cn('font-bold', compact ? 'text-[8px]' : 'text-[10px]')}>
                    {i + 1}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'font-semibold',
                  compact ? 'text-[8px]' : 'text-[10px]',
                  isActive ? 'text-olive' : isCompleted ? 'text-moss' : 'text-sage',
                )}
              >
                {step.label}
              </span>
            </div>
            {i < TRACKER_STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1',
                  currentOrder > stepOrder ? 'bg-olive' : 'bg-beige',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
