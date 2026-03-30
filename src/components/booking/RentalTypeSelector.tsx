'use client';

import { cn, formatPrice } from '@/lib/utils';

type RentalType = 'ONE_NIGHT' | 'TWO_NIGHT';

interface RentalTypeSelectorProps {
  product: { price1night: number; price2night: number };
  selected: RentalType | null;
  onSelect: (type: RentalType) => void;
}

const OPTIONS: { type: RentalType; label: string; desc: string; recommended?: boolean }[] = [
  { type: 'ONE_NIGHT', label: '1박 2일', desc: '짧은 캠핑 여행에 딱 맞는 코스', recommended: true },
  { type: 'TWO_NIGHT', label: '2박 3일', desc: '여유로운 캠핑을 즐기고 싶다면' },
];

export function RentalTypeSelector({ product, selected, onSelect }: RentalTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-moss">렌탈 타입 선택</h2>
      <p className="text-sm text-sage">원하시는 캠핑 일정을 선택해 주세요.</p>
      <div className="grid gap-3 sm:grid-cols-2 mt-4">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.type;
          const price = opt.type === 'ONE_NIGHT' ? product.price1night : product.price2night;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelect(opt.type)}
              className={cn(
                'relative rounded-xl border-2 bg-white p-5 text-left transition-all',
                isSelected ? 'border-olive shadow-md' : 'border-beige hover:border-sage',
              )}
            >
              {opt.recommended && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-olive px-2.5 py-0.5 text-[10px] font-bold text-white">
                  추천
                </span>
              )}
              <div className="text-base font-bold text-moss">{opt.label}</div>
              <div className="mt-1 text-xs text-sage">{opt.desc}</div>
              <div className="mt-3 text-xl font-extrabold text-price-green">
                {formatPrice(price)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
