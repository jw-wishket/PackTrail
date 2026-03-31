'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { addDays } from 'date-fns';
import { formatPrice } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { BookingStepIndicator } from '@/components/booking/BookingStepIndicator';
import { RentalTypeSelector } from '@/components/booking/RentalTypeSelector';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { OptionsSelector } from '@/components/booking/OptionsSelector';
import { OrderSummary } from '@/components/booking/OrderSummary';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type RentalType = 'ONE_NIGHT' | 'TWO_NIGHT';

interface Product {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  price1night: number;
  price2night: number;
  images: unknown;
  includes: string[];
}

interface ConsumableOption {
  id: number;
  name: string;
  description?: string | null;
  price: number;
}

interface ProductData {
  product: Product;
  consumableOptions: ConsumableOption[];
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function BookingPage() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();

  const [data, setData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step state
  const [step, setStep] = useState(1);
  const [rentalType, setRentalType] = useState<RentalType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Map<number, { quantity: number; price: number; name?: string }>>(new Map());

  // Fetch product
  useEffect(() => {
    if (!params.productId) return;
    fetch(`/api/products/${params.productId}`)
      .then((r) => r.json())
      .then((json) => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.productId]);

  // Derived values
  const endDate = useMemo(() => {
    if (!selectedDate || !rentalType) return null;
    return addDays(selectedDate, rentalType === 'ONE_NIGHT' ? 1 : 2);
  }, [selectedDate, rentalType]);

  const totalPrice = useMemo(() => {
    if (!data?.product || !rentalType) return 0;
    const base = rentalType === 'ONE_NIGHT' ? data.product.price1night : data.product.price2night;
    const optTotal = Array.from(selectedOptions.values()).reduce(
      (sum, o) => sum + o.quantity * o.price, 0,
    );
    return base + optTotal;
  }, [data, rentalType, selectedOptions]);

  const completedSteps = useMemo(() => {
    const completed: number[] = [];
    if (rentalType) completed.push(1);
    if (selectedDate) completed.push(2);
    if (step > 3) completed.push(3); // options step is always completable (optional)
    return completed;
  }, [rentalType, selectedDate, step]);

  // Can advance?
  const canAdvance = () => {
    if (step === 1) return !!rentalType;
    if (step === 2) return !!selectedDate;
    if (step === 3) return true; // optional
    return false;
  };

  const handleNext = () => {
    if (step < 4 && canAdvance()) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!data?.product || !rentalType || !selectedDate) return;
    setSubmitting(true);
    setError(null);
    try {
      const options = Array.from(selectedOptions.entries()).map(([optionId, o]) => ({
        optionId,
        quantity: o.quantity,
        priceAtOrder: o.price,
      }));

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: data.product.id,
          rentalType,
          useStartDate: selectedDate.toISOString().split('T')[0],
          totalPrice,
          options: options.length > 0 ? options : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.error === 'SOLD_OUT') {
          setError('선택한 날짜의 세트가 모두 소진되었습니다. 다른 날짜를 선택해 주세요.');
        } else {
          setError('예약 생성에 실패했습니다. 다시 시도해 주세요.');
        }
        return;
      }

      const result = await res.json();
      router.push(`/checkout/${result.reservationId}`);
    } catch {
      setError('예약 생성에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Loading / Error ---------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <Spinner />
      </div>
    );
  }

  if (!data?.product) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <p className="text-moss font-semibold">상품을 찾을 수 없습니다.</p>
      </div>
    );
  }

  // Enrich options with names for OrderSummary
  const enrichedOptions = new Map(selectedOptions);
  for (const [id, val] of enrichedOptions) {
    const opt = data.consumableOptions.find((o) => o.id === id);
    if (opt) enrichedOptions.set(id, { ...val, name: opt.name });
  }

  /* ---------- Step content ---------- */
  const stepContent: Record<number, React.ReactNode> = {
    1: (
      <RentalTypeSelector
        product={data.product}
        selected={rentalType}
        onSelect={(t) => { setRentalType(t); setSelectedDate(null); }}
      />
    ),
    2: rentalType && data?.product ? (
      <BookingCalendar
        rentalType={rentalType}
        productId={data.product.id}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />
    ) : null,
    3: (
      <OptionsSelector
        options={data.consumableOptions}
        selected={selectedOptions}
        onChange={setSelectedOptions}
      />
    ),
    4: rentalType && selectedDate && endDate ? (
      <OrderSummary
        product={data.product}
        rentalType={rentalType}
        startDate={selectedDate}
        endDate={endDate}
        options={enrichedOptions}
        totalPrice={totalPrice}
      />
    ) : null,
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Mobile step indicator (hidden on desktop) */}
      <div className="lg:hidden">
        <BookingStepIndicator currentStep={step} completedSteps={completedSteps} />
      </div>

      <div className="flex">
        {/* Desktop step indicator sidebar (hidden on mobile) */}
        <div className="hidden lg:block shrink-0">
          <div className="sticky top-16">
            <BookingStepIndicator currentStep={step} completedSteps={completedSteps} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 mx-auto max-w-2xl px-4 py-6 pb-32 lg:pb-6">
          {/* Product badge */}
          <div className="mb-6 flex items-center gap-2 text-sm text-sage">
            <span className="font-semibold text-moss">{data.product.name}</span>
            {rentalType && (
              <>
                <span className="text-beige">|</span>
                <span>{rentalType === 'ONE_NIGHT' ? '1박 2일' : '2박 3일'}</span>
              </>
            )}
          </div>

          {stepContent[step]}

          {error && (
            <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Desktop navigation */}
          <div className="hidden lg:flex items-center justify-between mt-8 gap-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-xl border border-beige bg-white px-6 py-3 text-sm font-semibold text-sage hover:bg-cream transition-colors"
              >
                이전
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance()}
                className="rounded-xl bg-olive px-8 py-3 text-sm font-bold text-white shadow hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                다음 단계
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-olive px-8 py-3 text-sm font-bold text-white shadow hover:brightness-110 transition disabled:opacity-60"
              >
                {submitting ? '처리 중...' : `결제하기 ${formatPrice(totalPrice)}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-beige px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-xl border border-beige px-4 py-3 text-sm font-semibold text-sage"
            >
              이전
            </button>
          )}
          <div className="flex-1">
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance()}
                className="w-full rounded-xl bg-olive py-3 text-sm font-bold text-white shadow disabled:opacity-40"
              >
                다음 단계
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-xl bg-olive py-3 text-sm font-bold text-white shadow disabled:opacity-60"
              >
                {submitting ? '처리 중...' : `결제하기 ${formatPrice(totalPrice)}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
