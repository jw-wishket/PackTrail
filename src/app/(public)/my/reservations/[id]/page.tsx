'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@/components/ui/spinner';
import { addDays } from 'date-fns';
import { formatPrice, formatDate, formatDateFull } from '@/lib/utils';
import { ReservationStatusBadge } from '@/components/reservations/ReservationStatusBadge';
import { StatusTracker } from '@/components/reservations/StatusTracker';
import { ScheduleTimeline } from '@/components/booking/ScheduleTimeline';

type ReservationStatus = 'HOLDING' | 'CONFIRMED' | 'SHIPPING' | 'IN_USE' | 'RETURNING' | 'COMPLETED' | 'CANCELLED';

interface ReservationDetail {
  id: string;
  rentalType: 'ONE_NIGHT' | 'TWO_NIGHT';
  useStartDate: string;
  useEndDate: string;
  blockStartDate: string;
  blockEndDate: string;
  status: ReservationStatus;
  totalPrice: number;
  deliveryAddress: string | null;
  deliveryMemo: string | null;
  createdAt: string;
  holdExpiresAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  product: {
    id: number;
    name: string;
    capacity: number;
    price1night: number;
    price2night: number;
  };
  equipmentSet: { name: string; status: string } | null;
  options: Array<{
    optionId: number;
    quantity: number;
    priceAtOrder: number;
    option: { id: number; name: string; price: number };
  }>;
  review: { id: string } | null;
}

const RENTAL_LABEL = { ONE_NIGHT: '1박 2일', TWO_NIGHT: '2박 3일' } as const;

const productEmoji: Record<string, string> = {
  '베이직 솔로 세트': '⛺',
  '프리미엄 듀오 세트': '🏕️',
  '풀패키지 세트': '🔥',
  '라이트 솔로 세트': '🌙',
};

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [rsv, setRsv] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/my/reservations/${params.id}`)
      .then((r) => r.json())
      .then((data) => { setRsv(data.reservation ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  const handleCancel = async () => {
    if (!rsv || !confirm('정말 예약을 취소하시겠습니까?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/reservations/${rsv.id}/cancel`, { method: 'POST' });
      if (res.ok) {
        router.refresh();
        window.location.reload();
      }
    } catch {
      // ignore
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <Spinner />
      </div>
    );
  }

  if (!rsv) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <p className="text-moss font-semibold">예약을 찾을 수 없습니다.</p>
        <Link href="/my" className="text-sm text-olive underline">마이페이지로 돌아가기</Link>
      </div>
    );
  }

  const startDate = new Date(rsv.useStartDate);
  const endDate = new Date(rsv.useEndDate);
  const blockStart = new Date(rsv.blockStartDate);
  const blockEnd = new Date(rsv.blockEndDate);
  const deliveryDate = addDays(startDate, -1);
  const pickupDate = addDays(endDate, 1);
  const emoji = productEmoji[rsv.product.name] ?? '🎒';
  const optionTotal = rsv.options.reduce((s, o) => s + o.quantity * o.priceAtOrder, 0);
  const basePrice = rsv.totalPrice - optionTotal;
  const canCancel = rsv.status === 'HOLDING' || rsv.status === 'CONFIRMED';
  const canReview = rsv.status === 'COMPLETED' && !rsv.review;

  return (
    <div className="min-h-screen bg-cream pb-10">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Back link */}
        <Link href="/my" className="text-sm text-sage hover:text-moss mb-4 inline-block">
          &larr; 마이페이지
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-cream border border-beige text-3xl">
            {emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-moss">{rsv.product.name}</h1>
              <ReservationStatusBadge status={rsv.status} />
            </div>
            <p className="text-xs text-sage">
              {RENTAL_LABEL[rsv.rentalType]} · 예약일 {formatDate(rsv.createdAt)}
            </p>
          </div>
        </div>

        {/* Status Tracker */}
        <div className="rounded-xl border border-beige bg-white p-4 mb-4">
          <StatusTracker status={rsv.status} />
        </div>

        <div className="space-y-4">
          {/* Card 1: 일정 정보 */}
          <div className="rounded-xl border border-beige bg-white p-4 space-y-3">
            <h3 className="text-sm font-bold text-moss">일정 정보</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-sage">시작일</span>
                <div className="font-semibold text-moss">{formatDateFull(startDate)}</div>
              </div>
              <div>
                <span className="text-xs text-sage">종료일</span>
                <div className="font-semibold text-moss">{formatDateFull(endDate)}</div>
              </div>
            </div>
            <ScheduleTimeline
              blockStart={blockStart}
              deliveryDate={deliveryDate}
              useStart={startDate}
              useEnd={endDate}
              pickupDate={pickupDate}
              blockEnd={blockEnd}
            />
          </div>

          {/* Card 2: 결제 정보 */}
          <div className="rounded-xl border border-beige bg-white p-4 space-y-2">
            <h3 className="text-sm font-bold text-moss">결제 정보</h3>
            <div className="flex justify-between text-sm">
              <span className="text-sage">기본 렌탈료</span>
              <span className="text-moss">{formatPrice(basePrice)}</span>
            </div>
            {rsv.options.map((opt) => (
              <div key={opt.optionId} className="flex justify-between text-sm">
                <span className="text-sage">{opt.option.name} x {opt.quantity}</span>
                <span className="text-moss">{formatPrice(opt.quantity * opt.priceAtOrder)}</span>
              </div>
            ))}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-beige">
              <span className="text-moss">총 결제 금액</span>
              <span className="text-price-green">{formatPrice(rsv.totalPrice)}</span>
            </div>
          </div>

          {/* Card 3: 배송 정보 */}
          <div className="rounded-xl border border-beige bg-white p-4 space-y-2">
            <h3 className="text-sm font-bold text-moss">배송 정보</h3>
            {rsv.deliveryAddress ? (
              <p className="text-sm text-sage">{rsv.deliveryAddress}</p>
            ) : (
              <p className="text-sm text-sage">배송 정보가 등록되지 않았습니다.</p>
            )}
            {rsv.deliveryMemo && (
              <p className="text-xs text-muted">메모: {rsv.deliveryMemo}</p>
            )}
          </div>

          {/* Card 4: 장비 세트 */}
          {rsv.equipmentSet && (
            <div className="rounded-xl border border-beige bg-white p-4 space-y-2">
              <h3 className="text-sm font-bold text-moss">배정 장비</h3>
              <p className="text-sm text-sage">{rsv.equipmentSet.name}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 rounded-xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
              >
                {cancelling ? '취소 중...' : '예약 취소'}
              </button>
            )}
            {canReview && (
              <Link
                href={`/my/reservations/${rsv.id}/review`}
                className="flex-1 rounded-xl bg-olive py-3 text-center text-sm font-bold text-white hover:brightness-110 transition"
              >
                후기 작성
              </Link>
            )}
          </div>

          {/* Cancellation info */}
          {rsv.status === 'CANCELLED' && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
              <p className="font-semibold text-destructive">예약이 취소되었습니다.</p>
              {rsv.cancelledAt && (
                <p className="text-xs text-sage mt-1">취소일: {formatDate(rsv.cancelledAt)}</p>
              )}
              {rsv.cancelReason && (
                <p className="text-xs text-sage mt-0.5">사유: {rsv.cancelReason}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
