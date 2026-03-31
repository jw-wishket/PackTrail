'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const STEPS = [
  { label: '타입', number: 1 },
  { label: '날짜', number: 2 },
  { label: '옵션', number: 3 },
  { label: '결제', number: 4 },
];

interface BookingStepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
}

export function BookingStepIndicator({ currentStep, completedSteps }: BookingStepIndicatorProps) {
  return (
    <>
      {/* Desktop: vertical sidebar */}
      <div className="hidden lg:flex flex-col w-56 bg-white border-r border-beige p-6 gap-2" aria-label="예약 단계">
        {STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.number);
          const isActive = currentStep === step.number;
          return (
            <div
              key={step.number}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 transition-colors',
                isActive && 'bg-olive text-white',
                !isActive && !isCompleted && 'text-sage',
                !isActive && isCompleted && 'text-moss',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  isActive && 'bg-white text-olive',
                  !isActive && isCompleted && 'bg-olive/10 text-olive',
                  !isActive && !isCompleted && 'bg-beige text-sage',
                )}
              >
                {isCompleted && !isActive ? <Check className="size-4 text-olive" /> : step.number}
              </span>
              <span className="text-sm font-semibold">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Mobile: horizontal bar */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-beige px-4 py-3" aria-label="예약 단계">
        {STEPS.map((step, i) => {
          const isCompleted = completedSteps.includes(step.number);
          const isActive = currentStep === step.number;
          return (
            <div key={step.number} className="flex items-center gap-1" aria-current={isActive ? 'step' : undefined}>
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                    isActive && 'bg-olive text-white',
                    !isActive && isCompleted && 'bg-olive/10 text-olive',
                    !isActive && !isCompleted && 'bg-beige text-sage',
                  )}
                >
                  {isCompleted && !isActive ? <Check className="size-3.5 text-olive" /> : step.number}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-semibold',
                    isActive ? 'text-olive' : isCompleted ? 'text-moss' : 'text-sage',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('h-px w-6 mx-1', isCompleted ? 'bg-olive' : 'bg-beige')} />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
