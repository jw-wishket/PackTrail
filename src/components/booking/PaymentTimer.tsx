'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PaymentTimerProps {
  expiresAt: Date;
  onExpire: () => void;
}

export function PaymentTimer({ expiresAt, onExpire }: PaymentTimerProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)));

  useEffect(() => {
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const timer = setInterval(() => {
      const secs = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) {
        clearInterval(timer);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpire, remaining]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isWarning = remaining < 180; // under 3 minutes

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
        isWarning ? 'bg-warning/15 text-warning' : 'bg-olive/10 text-olive',
      )}
    >
      <span>결제 대기 시간:</span>
      <span className="tabular-nums font-bold">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      <span>남음</span>
    </div>
  );
}
