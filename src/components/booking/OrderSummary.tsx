'use client';

import { formatPrice, formatDate } from '@/lib/utils';

type RentalType = 'ONE_NIGHT' | 'TWO_NIGHT';

interface OrderSummaryProps {
  product: { name: string };
  rentalType: RentalType;
  startDate: Date;
  endDate: Date;
  options: Map<number, { quantity: number; price: number; name?: string }>;
  totalPrice: number;
}

const RENTAL_LABEL: Record<RentalType, string> = {
  ONE_NIGHT: '1박 2일',
  TWO_NIGHT: '2박 3일',
};

export function OrderSummary({ product, rentalType, startDate, endDate, options, totalPrice }: OrderSummaryProps) {
  const optionTotal = Array.from(options.values()).reduce(
    (sum, o) => sum + o.quantity * o.price,
    0,
  );
  const basePrice = totalPrice - optionTotal;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-moss">주문 요약</h2>

      <div className="rounded-xl border border-beige bg-white divide-y divide-beige">
        {/* Product info */}
        <div className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-sage">상품</span>
            <span className="font-semibold text-moss">{product.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-sage">렌탈 타입</span>
            <span className="font-semibold text-moss">{RENTAL_LABEL[rentalType]}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-sage">이용 기간</span>
            <span className="font-semibold text-moss">
              {formatDate(startDate)} ~ {formatDate(endDate)}
            </span>
          </div>
        </div>

        {/* Options */}
        {options.size > 0 && (
          <div className="p-4 space-y-2">
            <div className="text-xs font-semibold text-sage mb-1">추가 옵션</div>
            {Array.from(options.entries()).map(([id, opt]) => (
              <div key={id} className="flex justify-between text-sm">
                <span className="text-sage">
                  {opt.name ?? `옵션 #${id}`} x {opt.quantity}
                </span>
                <span className="text-moss">{formatPrice(opt.quantity * opt.price)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-sage">기본 렌탈료</span>
            <span className="text-moss">{formatPrice(basePrice)}</span>
          </div>
          {optionTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-sage">옵션 합계</span>
              <span className="text-moss">{formatPrice(optionTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-2 border-t border-beige">
            <span className="text-moss">총 결제 금액</span>
            <span className="text-price-green">{formatPrice(totalPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
