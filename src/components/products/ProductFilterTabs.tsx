'use client';

import { cn } from '@/lib/utils';

interface Props {
  selected: string;
  onChange: (value: string) => void;
}

const filters = [
  { value: 'all', label: '전체' },
  { value: '1', label: '1인용' },
  { value: '2', label: '2인용' },
];

export function ProductFilterTabs({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            'text-sm px-4 py-1.5 rounded-full font-semibold transition-colors',
            selected === f.value
              ? 'bg-moss text-white'
              : 'bg-white text-sage border border-beige hover:border-sage'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
