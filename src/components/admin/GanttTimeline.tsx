'use client';

import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface TimelineBlock {
  id: string;
  status: string;
  useStartDate: string;
  useEndDate: string;
  blockStartDate: string;
  blockEndDate: string;
  user: { name: string | null };
  product: { name: string };
}

interface SetData {
  id: number;
  name: string;
  status: string;
}

interface GanttTimelineProps {
  sets: SetData[];
  startDate: Date;
  days: number;
}

const STATUS_BAR_COLORS: Record<string, string> = {
  HOLDING: 'bg-holding/70',
  CONFIRMED: 'bg-price-green/70',
  SHIPPING: 'bg-warning/70',
  IN_USE: 'bg-olive/70',
  RETURNING: 'bg-holding/50',
  COMPLETED: 'bg-muted-foreground/30',
};

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function GanttTimeline({ sets, startDate, days }: GanttTimelineProps) {
  const [timelineData, setTimelineData] = useState<Record<number, TimelineBlock[]>>({});
  const [loading, setLoading] = useState(true);

  const dates = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startDate, days]);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const weeks = Math.ceil(days / 7);
        const results = await Promise.all(
          sets.map((s) =>
            fetch(`/api/admin/sets/${s.id}/timeline?weeks=${weeks}`)
              .then((r) => r.json())
              .then((data) => ({ setId: s.id, reservations: data.reservations ?? [] }))
          )
        );
        const map: Record<number, TimelineBlock[]> = {};
        for (const r of results) {
          map[r.setId] = r.reservations;
        }
        setTimelineData(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [sets, days, startDate]);

  const cellWidth = 44;
  const labelWidth = 100;

  return (
    <div className="rounded-xl bg-white ring-1 ring-foreground/10 overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          타임라인 로딩중...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: labelWidth + cellWidth * days }}>
            {/* Date header */}
            <div className="flex border-b sticky top-0 bg-white z-10">
              <div
                className="shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground border-r bg-admin-bg"
                style={{ width: labelWidth }}
              >
                세트
              </div>
              {dates.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={i}
                    className={cn(
                      'shrink-0 text-center text-[10px] py-2 border-r',
                      isWeekend && 'bg-red-50/50',
                      isToday && 'bg-olive/10 font-bold'
                    )}
                    style={{ width: cellWidth }}
                  >
                    <div className={cn(isWeekend ? 'text-red-400' : 'text-muted-foreground')}>
                      {formatShortDate(d)}
                    </div>
                    <div className={cn('text-[9px]', isWeekend ? 'text-red-300' : 'text-muted-foreground/50')}>
                      {['일', '월', '화', '수', '목', '금', '토'][d.getDay()]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {sets.map((set) => {
              const blocks = timelineData[set.id] ?? [];
              return (
                <div key={set.id} className="flex border-b last:border-0 relative" style={{ height: 40 }}>
                  <div
                    className="shrink-0 px-3 flex items-center text-xs font-medium border-r bg-admin-bg truncate"
                    style={{ width: labelWidth }}
                  >
                    {set.name}
                  </div>
                  <div className="relative flex-1" style={{ width: cellWidth * days }}>
                    {/* Grid lines */}
                    {dates.map((d, i) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <div
                          key={i}
                          className={cn(
                            'absolute top-0 bottom-0 border-r',
                            isWeekend && 'bg-red-50/30'
                          )}
                          style={{ left: i * cellWidth, width: cellWidth }}
                        />
                      );
                    })}

                    {/* Reservation blocks */}
                    {blocks.map((block) => {
                      const blockStart = new Date(block.blockStartDate);
                      const blockEnd = new Date(block.blockEndDate);
                      const offsetDays = Math.max(0, daysBetween(startDate, blockStart));
                      const endOffset = Math.min(days, daysBetween(startDate, blockEnd) + 1);
                      const widthDays = endOffset - offsetDays;

                      if (widthDays <= 0) return null;

                      return (
                        <div
                          key={block.id}
                          className={cn(
                            'absolute top-1.5 h-[calc(100%-12px)] rounded-md flex items-center px-1.5 text-[10px] text-white font-medium truncate cursor-default',
                            STATUS_BAR_COLORS[block.status] ?? 'bg-muted-foreground/40'
                          )}
                          style={{
                            left: offsetDays * cellWidth + 2,
                            width: widthDays * cellWidth - 4,
                          }}
                          title={`${block.user.name ?? '?'} - ${block.product.name} (${block.status})`}
                        >
                          {widthDays >= 2 && (block.user.name ?? '?')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
