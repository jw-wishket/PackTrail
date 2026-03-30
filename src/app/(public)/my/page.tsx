'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ReservationCard } from '@/components/reservations/ReservationCard';

type ReservationStatus = 'HOLDING' | 'CONFIRMED' | 'SHIPPING' | 'IN_USE' | 'RETURNING' | 'COMPLETED' | 'CANCELLED';

interface Reservation {
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
}

type FilterTab = '전체' | '진행중' | '완료' | '취소';

const FILTER_TABS: FilterTab[] = ['전체', '진행중', '완료', '취소'];

const ACTIVE_STATUSES: ReservationStatus[] = ['HOLDING', 'CONFIRMED', 'SHIPPING', 'IN_USE', 'RETURNING'];

function filterReservations(reservations: Reservation[], tab: FilterTab): Reservation[] {
  switch (tab) {
    case '진행중':
      return reservations.filter((r) => ACTIVE_STATUSES.includes(r.status));
    case '완료':
      return reservations.filter((r) => r.status === 'COMPLETED');
    case '취소':
      return reservations.filter((r) => r.status === 'CANCELLED');
    default:
      return reservations;
  }
}

export default function MyPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('전체');

  useEffect(() => {
    fetch('/api/my/reservations')
      .then((r) => r.json())
      .then((data) => {
        setReservations(data.reservations ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filterReservations(reservations, activeTab);

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-bold text-moss mb-6">마이페이지</h1>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-beige mb-6">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                activeTab === tab
                  ? 'border-olive text-olive'
                  : 'border-transparent text-sage hover:text-moss',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <p className="text-sage animate-pulse">불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sage">예약 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <ReservationCard key={r.id} reservation={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
