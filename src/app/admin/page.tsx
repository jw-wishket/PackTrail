'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatsCard from '@/components/admin/StatsCard';
import SetStatusGrid from '@/components/admin/SetStatusGrid';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface DashboardData {
  todayReservations: Record<string, number>;
  monthlyRevenue: number;
  holdingCount: number;
  recentReservations: Array<{
    id: string;
    status: string;
    totalPrice: number;
    createdAt: string;
    useStartDate: string;
    useEndDate: string;
    product: { name: string };
    user: { name: string | null; email: string };
  }>;
  equipmentSets: Array<{
    id: number;
    name: string;
    status: string;
    currentReservation?: {
      id: string;
      status: string;
      useStartDate: string;
      useEndDate: string;
    } | null;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  HOLDING: '홀딩',
  CONFIRMED: '확정',
  SHIPPING: '배송중',
  IN_USE: '사용중',
  RETURNING: '반납중',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  HOLDING: 'text-holding',
  CONFIRMED: 'text-price-green',
  SHIPPING: 'text-warning',
  IN_USE: 'text-olive',
  RETURNING: 'text-holding',
  COMPLETED: 'text-muted-foreground',
  CANCELLED: 'text-destructive',
};

const TASK_TYPES = [
  { key: 'SHIPPING', label: '출고 예정', urgency: 'text-warning' },
  { key: 'RETURNING', label: '회수 예정', urgency: 'text-status-blue' },
  { key: 'MAINTENANCE', label: '정비 필요', urgency: 'text-muted-foreground' },
];

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        데이터를 불러오지 못했습니다.
      </div>
    );
  }

  const todayTotal = Object.values(data.todayReservations).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">대시보드</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label="오늘 예약" value={todayTotal} />
        <StatsCard
          label="이달 매출"
          value={`${(data.monthlyRevenue / 10000).toFixed(0)}만원`}
        />
        <StatsCard
          label="홀딩 대기"
          value={data.holdingCount}
          delta={data.holdingCount > 0 ? '결제 대기중' : '없음'}
          deltaType={data.holdingCount > 0 ? 'negative' : 'neutral'}
        />
        <StatsCard
          label="장비 세트"
          value={`${data.equipmentSets.filter((s) => s.status === 'AVAILABLE').length}/${data.equipmentSets.length}`}
          delta="가용/전체"
        />
      </div>

      {/* Today's tasks */}
      <div className="rounded-xl bg-white p-4 ring-1 ring-foreground/10">
        <h2 className="text-sm font-semibold mb-3">오늘의 업무</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TASK_TYPES.map((task) => {
            const count = data.todayReservations[task.key] ?? 0;
            return (
              <div
                key={task.key}
                className="flex items-center justify-between rounded-lg bg-admin-bg px-3 py-2"
              >
                <span className="text-sm">{task.label}</span>
                <span className={cn('text-lg font-bold', task.urgency)}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent reservations */}
      <div className="rounded-xl bg-white p-4 ring-1 ring-foreground/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">최근 예약</h2>
          <Link href="/admin/reservations" className="text-xs text-olive hover:underline">
            전체보기
          </Link>
        </div>
        <div className="space-y-2">
          {data.recentReservations.map((r) => (
            <Link
              key={r.id}
              href={`/admin/reservations/${r.id}`}
              className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-admin-bg transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    STATUS_COLORS[r.status] ?? 'text-muted-foreground'
                  )}
                >
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
                <span className="text-sm truncate">
                  {r.user.name ?? r.user.email}
                </span>
                <span className="text-xs text-muted-foreground hidden md:inline">
                  {r.product.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                {new Date(r.createdAt).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </Link>
          ))}
          {data.recentReservations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              최근 예약이 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* Equipment set status grid */}
      <div>
        <h2 className="text-sm font-semibold mb-3">장비 세트 현황</h2>
        <SetStatusGrid sets={data.equipmentSets} />
      </div>
    </div>
  );
}
