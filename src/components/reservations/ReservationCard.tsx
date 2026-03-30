'use client';

import Link from 'next/link';
import { formatPrice, formatDate } from '@/lib/utils';
import { ReservationStatusBadge } from './ReservationStatusBadge';
import { StatusTracker } from './StatusTracker';

type ReservationStatus = 'HOLDING' | 'CONFIRMED' | 'SHIPPING' | 'IN_USE' | 'RETURNING' | 'COMPLETED' | 'CANCELLED';

interface ReservationCardProps {
  reservation: {
    id: string;
    rentalType: 'ONE_NIGHT' | 'TWO_NIGHT';
    useStartDate: string;
    useEndDate: string;
    status: ReservationStatus;
    totalPrice: number;
    product: {
      id: number;
      name: string;
      capacity: number;
      images: unknown;
    };
  };
}

const productEmoji: Record<string, string> = {
  '베이직 솔로 세트': '⛺',
  '프리미엄 듀오 세트': '🏕️',
  '풀패키지 세트': '🔥',
  '라이트 솔로 세트': '🌙',
};

const RENTAL_LABEL = { ONE_NIGHT: '1박 2일', TWO_NIGHT: '2박 3일' } as const;

export function ReservationCard({ reservation }: ReservationCardProps) {
  const emoji = productEmoji[reservation.product.name] ?? '🎒';

  return (
    <Link
      href={`/my/reservations/${reservation.id}`}
      className="block rounded-xl border border-beige bg-white p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Product icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cream text-2xl">
          {emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-moss truncate">
              {reservation.product.name}
            </span>
            <ReservationStatusBadge status={reservation.status} />
          </div>
          <div className="text-xs text-sage">
            {RENTAL_LABEL[reservation.rentalType]} ·{' '}
            {formatDate(reservation.useStartDate)} ~ {formatDate(reservation.useEndDate)}
          </div>
          <div className="mt-1 text-sm font-bold text-price-green">
            {formatPrice(reservation.totalPrice)}
          </div>
        </div>
      </div>

      {/* Mini status tracker */}
      {reservation.status !== 'CANCELLED' && reservation.status !== 'HOLDING' && (
        <div className="mt-3 pt-3 border-t border-beige">
          <StatusTracker status={reservation.status} compact />
        </div>
      )}
    </Link>
  );
}
