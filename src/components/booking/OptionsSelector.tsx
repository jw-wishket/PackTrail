'use client';

import { cn, formatPrice } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';

interface ConsumableOption {
  id: number;
  name: string;
  description?: string | null;
  price: number;
}

interface OptionsSelectorProps {
  options: ConsumableOption[];
  selected: Map<number, { quantity: number; price: number }>;
  onChange: (map: Map<number, { quantity: number; price: number }>) => void;
}

const optionEmoji: Record<string, string> = {
  '장작': '🪵',
  '숯': '🔥',
  '착화제': '🕯️',
  '랜턴': '🔦',
  '모기향': '🌿',
  '핫팩': '🧤',
  '물티슈': '🧻',
  '비닐봉투': '🗑️',
};

function getOptionEmoji(name: string): string {
  for (const [key, emoji] of Object.entries(optionEmoji)) {
    if (name.includes(key)) return emoji;
  }
  return '📦';
}

export function OptionsSelector({ options, selected, onChange }: OptionsSelectorProps) {
  const updateQuantity = (opt: ConsumableOption, delta: number) => {
    const next = new Map(selected);
    const current = next.get(opt.id);
    const qty = (current?.quantity ?? 0) + delta;
    if (qty <= 0) {
      next.delete(opt.id);
    } else {
      next.set(opt.id, { quantity: qty, price: opt.price });
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-moss">추가 옵션</h2>
      <p className="text-sm text-sage">필요한 소모품을 추가해 보세요. 선택하지 않아도 됩니다.</p>
      <div className="mt-4 space-y-2">
        {options.map((opt) => {
          const sel = selected.get(opt.id);
          const qty = sel?.quantity ?? 0;
          return (
            <div
              key={opt.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border-2 bg-white p-4 transition-colors',
                qty > 0 ? 'border-olive' : 'border-beige',
              )}
            >
              <span className="text-2xl shrink-0">{getOptionEmoji(opt.name)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-moss">{opt.name}</div>
                {opt.description && (
                  <div className="text-xs text-sage truncate">{opt.description}</div>
                )}
                <div className="text-sm font-bold text-price-green mt-0.5">
                  {formatPrice(opt.price)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => updateQuantity(opt, -1)}
                  disabled={qty === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-beige bg-cream text-sage disabled:opacity-30 hover:bg-beige transition-colors"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-bold text-moss">{qty}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(opt, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-olive bg-olive/10 text-olive hover:bg-olive/20 transition-colors"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
