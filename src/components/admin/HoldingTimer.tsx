'use client';

import { useEffect, useState } from 'react';

interface HoldingTimerProps {
  createdAt: string;
  holdDurationMinutes?: number;
}

export default function HoldingTimer({
  createdAt,
  holdDurationMinutes = 30,
}: HoldingTimerProps) {
  const [remaining, setRemaining] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function update() {
      const expiresAt = new Date(createdAt).getTime() + holdDurationMinutes * 60 * 1000;
      const diff = expiresAt - Date.now();

      if (diff <= 0) {
        setRemaining('만료');
        setExpired(true);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      setExpired(false);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt, holdDurationMinutes]);

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono font-medium ${
        expired ? 'text-destructive' : 'text-holding'
      }`}
    >
      {expired ? '만료' : remaining}
    </span>
  );
}
