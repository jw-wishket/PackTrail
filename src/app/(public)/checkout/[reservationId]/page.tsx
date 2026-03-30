'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { addDays } from 'date-fns';
import { formatPrice, formatDate } from '@/lib/utils';
import { OrderSummary } from '@/components/booking/OrderSummary';
import { ScheduleTimeline } from '@/components/booking/ScheduleTimeline';
import { PaymentTimer } from '@/components/booking/PaymentTimer';
import { Input } from '@/components/ui/input';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ReservationData {
  reservation: {
    id: string;
    rentalType: 'ONE_NIGHT' | 'TWO_NIGHT';
    useStartDate: string;
    useEndDate: string;
    blockStartDate: string;
    blockEndDate: string;
    status: string;
    totalPrice: number;
    holdExpiresAt: string | null;
    deliveryAddress: string | null;
    deliveryMemo: string | null;
    product: {
      id: number;
      name: string;
      price1night: number;
      price2night: number;
    };
    options: Array<{
      optionId: number;
      quantity: number;
      priceAtOrder: number;
      option: { id: number; name: string; price: number };
    }>;
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function CheckoutPage() {
  const params = useParams<{ reservationId: string }>();
  const router = useRouter();

  const [data, setData] = useState<ReservationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Address form
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (!params.reservationId) return;
    fetch(`/api/my/reservations/${params.reservationId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((json) => {
        setData(json);
        if (json.reservation.deliveryAddress) setAddress(json.reservation.deliveryAddress);
        if (json.reservation.deliveryMemo) setMemo(json.reservation.deliveryMemo);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.reservationId]);

  const handleExpire = useCallback(() => {
    router.push('/products');
  }, [router]);

  const handlePayment = async () => {
    if (!data) return;
    setSubmitting(true);
    setError(null);

    try {
      // TODO: Task 37 will integrate PortOne payment here
      // For now, directly confirm the reservation
      const res = await fetch(`/api/reservations/${data.reservation.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryAddress: `${recipientName} / ${phone} / ${address}`,
          deliveryMemo: memo,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || '결제 확인에 실패했습니다.');
        return;
      }

      router.push(`/booking/complete?id=${data.reservation.id}`);
    } catch {
      setError('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sage animate-pulse">불러오는 중...</p>
      </div>
    );
  }

  if (!data?.reservation) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <p className="text-moss font-semibold">예약 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const rsv = data.reservation;
  const startDate = new Date(rsv.useStartDate);
  const endDate = new Date(rsv.useEndDate);
  const blockStart = new Date(rsv.blockStartDate);
  const blockEnd = new Date(rsv.blockEndDate);

  // Estimate delivery = day before useStart, pickup = day after useEnd
  const deliveryDate = addDays(startDate, -1);
  const pickupDate = addDays(endDate, 1);

  // Build options map for OrderSummary
  const optionsMap = new Map<number, { quantity: number; price: number; name?: string }>();
  for (const opt of rsv.options) {
    optionsMap.set(opt.optionId, {
      quantity: opt.quantity,
      price: opt.priceAtOrder,
      name: opt.option.name,
    });
  }

  const isFormValid = recipientName.trim() && phone.trim() && address.trim();

  return (
    <div className="min-h-screen bg-cream pb-32 lg:pb-10">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-bold text-moss mb-6">결제하기</h1>

        {/* Timer */}
        {rsv.holdExpiresAt && rsv.status === 'HOLDING' && (
          <div className="mb-6">
            <PaymentTimer
              expiresAt={new Date(rsv.holdExpiresAt)}
              onExpire={handleExpire}
            />
          </div>
        )}

        <div className="space-y-6">
          {/* Order Summary */}
          <OrderSummary
            product={rsv.product}
            rentalType={rsv.rentalType}
            startDate={startDate}
            endDate={endDate}
            options={optionsMap}
            totalPrice={rsv.totalPrice}
          />

          {/* Schedule Timeline */}
          <div className="rounded-xl border border-beige bg-white p-4">
            <ScheduleTimeline
              blockStart={blockStart}
              deliveryDate={deliveryDate}
              useStart={startDate}
              useEnd={endDate}
              pickupDate={pickupDate}
              blockEnd={blockEnd}
            />
          </div>

          {/* Delivery Address Form */}
          <div className="rounded-xl border border-beige bg-white p-4 space-y-4">
            <h3 className="text-sm font-bold text-moss">배송 정보</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-sage mb-1">수령인</label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="이름"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sage mb-1">연락처</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-0000-0000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sage mb-1">주소</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="배송 받으실 주소를 입력해 주세요"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sage mb-1">배송 메모</label>
                <Input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="배송 시 요청사항 (선택)"
                />
              </div>
            </div>
          </div>

          {/* Payment Buttons */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-moss">결제 수단</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handlePayment}
                disabled={submitting || !isFormValid}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#03C75A] bg-[#03C75A] py-3.5 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-40"
              >
                네이버페이
              </button>
              <button
                type="button"
                onClick={handlePayment}
                disabled={submitting || !isFormValid}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#FEE500] bg-[#FEE500] py-3.5 text-sm font-bold text-[#3C1E1E] hover:brightness-110 transition disabled:opacity-40"
              >
                카카오페이
              </button>
            </div>
            {!isFormValid && (
              <p className="text-xs text-warning">배송 정보를 모두 입력해 주세요.</p>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
