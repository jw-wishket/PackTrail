'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import HoldingTimer from '@/components/admin/HoldingTimer';
import { cn } from '@/lib/utils';
import { Loader2, ArrowLeft } from 'lucide-react';

interface ReservationDetail {
  id: string;
  status: string;
  totalPrice: number;
  basePrice: number;
  optionsPrice: number;
  createdAt: string;
  useStartDate: string;
  useEndDate: string;
  blockStartDate: string;
  blockEndDate: string;
  deliveryAddress: string | null;
  deliveryPhone: string | null;
  deliveryMemo: string | null;
  paymentId: string | null;
  cancelledAt: string | null;
  product: {
    id: number;
    name: string;
    description: string | null;
    capacity: number;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  equipmentSet?: { id: number; name: string; status: string } | null;
  options: Array<{
    quantity: number;
    unitPrice: number;
    option: { id: number; name: string };
  }>;
  review?: {
    rating: number;
    content: string;
    createdAt: string;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  HOLDING: '홀딩',
  CONFIRMED: '확정',
  SHIPPING: '배송중',
  IN_USE: '사용중',
  RETURNING: '반납중',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  HOLDING: 'bg-holding/10 text-holding',
  CONFIRMED: 'bg-price-green/10 text-price-green',
  SHIPPING: 'bg-warning/10 text-warning',
  IN_USE: 'bg-olive/10 text-olive',
  RETURNING: 'bg-holding/10 text-holding',
  COMPLETED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  HOLDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['IN_USE', 'CANCELLED'],
  IN_USE: ['RETURNING'],
  RETURNING: ['COMPLETED'],
};

export default function AdminReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/reservations/${id}`)
      .then((res) => res.json())
      .then((data) => setReservation(data.reservation))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(newStatus: string) {
    if (!confirm(`상태를 "${STATUS_LABELS[newStatus]}"(으)로 변경하시겠습니까?`)) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/reservations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setReservation((prev) =>
          prev ? { ...prev, status: data.reservation.status } : prev
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        예약을 찾을 수 없습니다.
      </div>
    );
  }

  const nextStatuses = STATUS_TRANSITIONS[reservation.status] ?? [];

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">예약 상세</h1>
      </div>

      {/* Status + Actions */}
      <div className="rounded-xl bg-white p-4 ring-1 ring-foreground/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center rounded-lg px-3 py-1 text-sm font-medium',
                STATUS_COLORS[reservation.status] ?? 'bg-muted text-muted-foreground'
              )}
            >
              {STATUS_LABELS[reservation.status] ?? reservation.status}
            </span>
            {reservation.status === 'HOLDING' && (
              <HoldingTimer createdAt={reservation.createdAt} />
            )}
            <span className="text-xs text-muted-foreground font-mono">
              {reservation.id.slice(0, 8)}...
            </span>
          </div>

          {nextStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((s) => (
                <Button
                  key={s}
                  variant={s === 'CANCELLED' ? 'destructive' : 'outline'}
                  size="sm"
                  disabled={updating}
                  onClick={() => handleStatusChange(s)}
                >
                  {updating && <Loader2 className="size-3 animate-spin mr-1" />}
                  {STATUS_LABELS[s]}(으)로 변경
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reservation info */}
        <div className="rounded-xl bg-white p-4 ring-1 ring-foreground/10 space-y-3">
          <h2 className="text-sm font-semibold border-b pb-2">예약 정보</h2>
          <InfoRow label="이용 기간" value={`${formatDate(reservation.useStartDate)} ~ ${formatDate(reservation.useEndDate)}`} />
          <InfoRow label="블록 기간" value={`${formatDate(reservation.blockStartDate)} ~ ${formatDate(reservation.blockEndDate)}`} />
          <InfoRow label="생성일" value={formatDate(reservation.createdAt)} />
          {reservation.cancelledAt && (
            <InfoRow label="취소일" value={formatDate(reservation.cancelledAt)} />
          )}
          {reservation.equipmentSet && (
            <InfoRow label="장비 세트" value={reservation.equipmentSet.name} />
          )}
        </div>

        {/* User info */}
        <div className="rounded-xl bg-white p-4 ring-1 ring-foreground/10 space-y-3">
          <h2 className="text-sm font-semibold border-b pb-2">고객 정보</h2>
          <InfoRow label="이름" value={reservation.user.name ?? '-'} />
          <InfoRow label="이메일" value={reservation.user.email} />
          <InfoRow label="연락처" value={reservation.user.phone ?? '-'} />
        </div>

        {/* Product info */}
        <div className="rounded-xl bg-white p-4 ring-1 ring-foreground/10 space-y-3">
          <h2 className="text-sm font-semibold border-b pb-2">상품 정보</h2>
          <InfoRow label="상품명" value={reservation.product.name} />
          <InfoRow label="수용인원" value={`${reservation.product.capacity}인`} />
          {reservation.options.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">추가 옵션</span>
              <ul className="mt-1 space-y-1">
                {reservation.options.map((opt, i) => (
                  <li key={i} className="text-sm">
                    {opt.option.name} x{opt.quantity} ({opt.unitPrice.toLocaleString()}원)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Payment / Delivery */}
        <div className="rounded-xl bg-white p-4 ring-1 ring-foreground/10 space-y-3">
          <h2 className="text-sm font-semibold border-b pb-2">결제 / 배송</h2>
          <InfoRow label="기본 금액" value={`${reservation.basePrice.toLocaleString()}원`} />
          <InfoRow label="옵션 금액" value={`${reservation.optionsPrice.toLocaleString()}원`} />
          <InfoRow
            label="총 결제금액"
            value={`${reservation.totalPrice.toLocaleString()}원`}
            bold
          />
          {reservation.paymentId && (
            <InfoRow label="결제 ID" value={reservation.paymentId} />
          )}
          {reservation.deliveryAddress && (
            <InfoRow label="배송 주소" value={reservation.deliveryAddress} />
          )}
          {reservation.deliveryPhone && (
            <InfoRow label="배송 연락처" value={reservation.deliveryPhone} />
          )}
          {reservation.deliveryMemo && (
            <InfoRow label="배송 메모" value={reservation.deliveryMemo} />
          )}
        </div>
      </div>

      {/* Review */}
      {reservation.review && (
        <div className="rounded-xl bg-white p-4 ring-1 ring-foreground/10 space-y-2">
          <h2 className="text-sm font-semibold border-b pb-2">후기</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {'★'.repeat(reservation.review.rating)}
              {'☆'.repeat(5 - reservation.review.rating)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(reservation.review.createdAt)}
            </span>
          </div>
          <p className="text-sm">{reservation.review.content}</p>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={cn('text-sm text-right', bold && 'font-semibold')}>
        {value}
      </span>
    </div>
  );
}
