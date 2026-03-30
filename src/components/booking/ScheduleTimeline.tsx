'use client';

import { formatDate } from '@/lib/utils';

interface ScheduleTimelineProps {
  blockStart: string | Date;
  deliveryDate: string | Date;
  useStart: string | Date;
  useEnd: string | Date;
  pickupDate: string | Date;
  blockEnd: string | Date;
}

const STEPS = [
  { key: 'deliveryDate', label: '배송도착', color: 'bg-olive', textColor: 'text-olive' },
  { key: 'useStart', label: '사용시작', color: 'bg-moss', textColor: 'text-moss' },
  { key: 'useEnd', label: '사용종료', color: 'bg-moss', textColor: 'text-moss' },
  { key: 'pickupDate', label: '회수예정', color: 'bg-muted', textColor: 'text-sage' },
] as const;

export function ScheduleTimeline(props: ScheduleTimelineProps) {
  const dates: Record<string, string | Date> = {
    deliveryDate: props.deliveryDate,
    useStart: props.useStart,
    useEnd: props.useEnd,
    pickupDate: props.pickupDate,
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-moss">일정 타임라인</h3>
      <div className="relative flex items-start justify-between px-2">
        {/* Connector line */}
        <div className="absolute top-3 left-6 right-6 h-0.5 bg-beige" />

        {STEPS.map((step) => (
          <div key={step.key} className="relative flex flex-col items-center gap-1.5 z-10">
            <div className={`h-6 w-6 rounded-full ${step.color} ring-2 ring-white`} />
            <span className={`text-[10px] font-bold ${step.textColor}`}>{step.label}</span>
            <span className="text-[10px] text-sage">{formatDate(dates[step.key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
