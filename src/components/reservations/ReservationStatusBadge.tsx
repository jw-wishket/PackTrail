'use client';

import { cn } from '@/lib/utils';

type ReservationStatus = 'HOLDING' | 'CONFIRMED' | 'SHIPPING' | 'IN_USE' | 'RETURNING' | 'COMPLETED' | 'CANCELLED';

const STATUS_CONFIG: Record<ReservationStatus, { label: string; bg: string; text: string }> = {
  HOLDING: { label: '결제대기', bg: 'bg-holding/15', text: 'text-holding' },
  CONFIRMED: { label: '확정', bg: 'bg-olive/15', text: 'text-olive' },
  SHIPPING: { label: '배송중', bg: 'bg-status-blue/15', text: 'text-status-blue' },
  IN_USE: { label: '사용중', bg: 'bg-moss/15', text: 'text-moss' },
  RETURNING: { label: '반납중', bg: 'bg-status-purple/15', text: 'text-status-purple' },
  COMPLETED: { label: '완료', bg: 'bg-sage/15', text: 'text-sage' },
  CANCELLED: { label: '취소', bg: 'bg-destructive/10', text: 'text-destructive' },
};

interface ReservationStatusBadgeProps {
  status: ReservationStatus;
  className?: string;
}

export function ReservationStatusBadge({ status, className }: ReservationStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.HOLDING;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
        config.bg,
        config.text,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
