'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check } from 'lucide-react';

function BookingCompleteContent() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('id');

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Checkmark */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-olive/15">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-olive">
            <Check className="size-8 text-white" strokeWidth={3} />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-moss">예약 완료</h1>
          <p className="mt-2 text-sm text-sage">
            예약이 성공적으로 완료되었습니다.
            <br />
            배송 일정에 맞춰 장비를 준비해 드리겠습니다.
          </p>
        </div>

        {reservationId && (
          <div className="rounded-xl border border-beige bg-white px-4 py-3">
            <div className="text-xs text-sage mb-1">예약 번호</div>
            <div className="text-sm font-mono font-semibold text-moss break-all">
              {reservationId}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {reservationId && (
            <Link
              href={`/my/reservations/${reservationId}`}
              className="block w-full rounded-xl bg-olive py-3 text-center font-bold text-white text-sm shadow hover:brightness-110 transition"
            >
              예약 상세 보기
            </Link>
          )}
          <Link
            href="/my"
            className="block w-full rounded-xl border border-beige bg-white py-3 text-center font-semibold text-sage text-sm hover:bg-cream transition"
          >
            마이페이지로 이동
          </Link>
          <Link
            href="/"
            className="text-sm text-sage hover:text-moss transition-colors underline"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BookingCompletePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingCompleteContent />
    </Suspense>
  );
}
