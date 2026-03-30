'use client';

import { useEffect, useState, useCallback } from 'react';
import ReservationTable from '@/components/admin/ReservationTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_FILTERS = [
  { value: '', label: '전체' },
  { value: 'HOLDING', label: '홀딩' },
  { value: 'CONFIRMED', label: '확정' },
  { value: 'SHIPPING', label: '배송중' },
  { value: 'IN_USE', label: '사용중' },
  { value: 'RETURNING', label: '반납중' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELLED', label: '취소' },
];

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  const fetchReservations = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '20',
          sort,
          order,
        });
        if (status) params.set('status', status);
        if (search) params.set('search', search);

        const res = await fetch(`/api/admin/reservations?${params}`);
        const data = await res.json();
        setReservations(data.reservations ?? []);
        setPagination(data.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [status, sort, order, search]
  );

  useEffect(() => {
    fetchReservations(1);
  }, [fetchReservations]);

  function handleSort(field: string) {
    if (sort === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field);
      setOrder('desc');
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchReservations(1);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">예약 관리</h1>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="이름, 이메일, 예약 ID 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          검색
        </Button>
      </form>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              status === f.value
                ? 'bg-moss text-white'
                : 'bg-white text-muted-foreground ring-1 ring-foreground/10 hover:bg-admin-bg'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ReservationTable
          reservations={reservations}
          sort={sort}
          order={order}
          onSort={handleSort}
        />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchReservations(pagination.page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchReservations(pagination.page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
