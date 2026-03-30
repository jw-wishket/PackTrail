'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import HoldingTimer from './HoldingTimer';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Reservation {
  id: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  useStartDate: string;
  useEndDate: string;
  product: { id: number; name: string };
  user: { name: string | null; email: string };
  equipmentSet?: { id: number; name: string; status: string } | null;
}

interface ReservationTableProps {
  reservations: Reservation[];
  sort: string;
  order: 'asc' | 'desc';
  onSort: (field: string) => void;
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
  HOLDING: 'bg-holding/10 text-holding',
  CONFIRMED: 'bg-price-green/10 text-price-green',
  SHIPPING: 'bg-warning/10 text-warning',
  IN_USE: 'bg-olive/10 text-olive',
  RETURNING: 'bg-holding/10 text-holding',
  COMPLETED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

function SortIcon({ field, sort, order }: { field: string; sort: string; order: string }) {
  if (sort !== field) return null;
  return order === 'asc' ? (
    <ChevronUp className="size-3 inline" />
  ) : (
    <ChevronDown className="size-3 inline" />
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

export default function ReservationTable({
  reservations,
  sort,
  order,
  onSort,
}: ReservationTableProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-xl bg-white ring-1 ring-foreground/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-admin-bg">
              <th className="px-4 py-3 text-left font-medium">상태</th>
              <th className="px-4 py-3 text-left font-medium">고객</th>
              <th className="px-4 py-3 text-left font-medium">상품</th>
              <th
                className="px-4 py-3 text-left font-medium cursor-pointer select-none"
                onClick={() => onSort('useStartDate')}
              >
                이용기간 <SortIcon field="useStartDate" sort={sort} order={order} />
              </th>
              <th
                className="px-4 py-3 text-left font-medium cursor-pointer select-none"
                onClick={() => onSort('totalPrice')}
              >
                금액 <SortIcon field="totalPrice" sort={sort} order={order} />
              </th>
              <th
                className="px-4 py-3 text-left font-medium cursor-pointer select-none"
                onClick={() => onSort('createdAt')}
              >
                생성일 <SortIcon field="createdAt" sort={sort} order={order} />
              </th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-admin-bg/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                        STATUS_COLORS[r.status] ?? 'bg-muted text-muted-foreground'
                      )}
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                    {r.status === 'HOLDING' && <HoldingTimer createdAt={r.createdAt} />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/reservations/${r.id}`} className="hover:underline text-moss">
                    {r.user.name ?? r.user.email}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.product.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(r.useStartDate)} ~ {formatDate(r.useEndDate)}
                </td>
                <td className="px-4 py-3 font-medium">
                  {r.totalPrice.toLocaleString()}원
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(r.createdAt)}
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  예약이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {reservations.map((r) => (
          <Link
            key={r.id}
            href={`/admin/reservations/${r.id}`}
            className="block rounded-xl bg-white p-4 ring-1 ring-foreground/10"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                    STATUS_COLORS[r.status] ?? 'bg-muted text-muted-foreground'
                  )}
                >
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
                {r.status === 'HOLDING' && <HoldingTimer createdAt={r.createdAt} />}
              </div>
              <span className="text-sm font-medium">{r.totalPrice.toLocaleString()}원</span>
            </div>
            <div className="text-sm font-medium">{r.user.name ?? r.user.email}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {r.product.name} | {formatDate(r.useStartDate)} ~ {formatDate(r.useEndDate)}
            </div>
          </Link>
        ))}
        {reservations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            예약이 없습니다.
          </div>
        )}
      </div>
    </>
  );
}
