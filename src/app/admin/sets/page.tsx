'use client';

import { useEffect, useState } from 'react';
import GanttTimeline from '@/components/admin/GanttTimeline';
import SetStatusGrid from '@/components/admin/SetStatusGrid';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, ChevronLeft, ChevronRight, BarChart3, LayoutGrid } from 'lucide-react';

interface SetData {
  id: number;
  name: string;
  status: string;
  currentReservation?: {
    id: string;
    status: string;
    useStartDate: string;
    useEndDate: string;
    user?: { name: string | null; email: string };
    product?: { name: string };
  } | null;
}

export default function AdminSetsPage() {
  const [sets, setSets] = useState<SetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'gantt' | 'grid'>('gantt');
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    fetch('/api/admin/sets')
      .then((res) => res.json())
      .then((data) => setSets(data.sets ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() + weekOffset * 7);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-xl font-bold">세트 관리</h1>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg bg-admin-bg p-0.5">
            <button
              onClick={() => setView('gantt')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                view === 'gantt' ? 'bg-white shadow-sm text-moss' : 'text-muted-foreground'
              )}
            >
              <BarChart3 className="size-3.5" />
              <span className="hidden md:inline">타임라인</span>
            </button>
            <button
              onClick={() => setView('grid')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                view === 'grid' ? 'bg-white shadow-sm text-moss' : 'text-muted-foreground'
              )}
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden md:inline">카드</span>
            </button>
          </div>

          {/* Date navigation (Gantt only) */}
          {view === 'gantt' && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setWeekOffset((v) => v - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset(0)}
                className="text-xs"
              >
                이번 주
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setWeekOffset((v) => v + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Gantt view, Mobile: defaults to grid but can toggle */}
      {view === 'gantt' ? (
        <>
          <div className="hidden md:block">
            <GanttTimeline sets={sets} startDate={startDate} days={14} />
          </div>
          <div className="md:hidden">
            <GanttTimeline sets={sets} startDate={startDate} days={7} />
          </div>
        </>
      ) : (
        <div>
          <SetStatusGrid sets={sets} />

          {/* Extended detail for grid view */}
          <div className="mt-4 space-y-3">
            {sets
              .filter((s) => s.currentReservation)
              .map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl bg-white p-3 ring-1 ring-foreground/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.currentReservation?.status}
                    </span>
                  </div>
                  {s.currentReservation?.user && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.currentReservation.user.name ?? s.currentReservation.user.email}
                      {s.currentReservation.product && ` - ${s.currentReservation.product.name}`}
                    </p>
                  )}
                  {s.currentReservation && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.currentReservation.useStartDate).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      ~{' '}
                      {new Date(s.currentReservation.useEndDate).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
