'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';

interface Holiday {
  id: number;
  date: string;
  name: string;
  year: number;
  isCustom: boolean;
}

export default function AdminHolidaysPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addName, setAddName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/holidays?year=${selectedYear}`);
      const data = await res.json();
      setHolidays(data.holidays ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  async function handleSync() {
    if (!confirm(`${selectedYear}년 공휴일을 동기화하시겠습니까?`)) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/holidays/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear }),
      });
      if (res.ok) {
        await fetchHolidays();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  }

  async function handleAdd() {
    if (!addDate || !addName) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: addDate, name: addName }),
      });
      if (res.ok) {
        await fetchHolidays();
        setAddOpen(false);
        setAddDate('');
        setAddName('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('이 휴무일을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/admin/holidays/${id}`, { method: 'DELETE' });
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-xl font-bold">공휴일 관리</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="size-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="size-4 mr-1" />
            )}
            공휴일 동기화
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setAddDate('');
              setAddName('');
              setAddOpen(true);
            }}
          >
            <Plus className="size-4 mr-1" />
            임시 휴무 추가
          </Button>
        </div>
      </div>

      {/* Year tabs */}
      <div className="flex items-center rounded-lg bg-white ring-1 ring-foreground/10 p-1 w-fit">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              selectedYear === y
                ? 'bg-moss text-white'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {y}년
          </button>
        ))}
      </div>

      {/* Holiday list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl bg-white ring-1 ring-foreground/10 overflow-hidden">
          {holidays.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              {selectedYear}년 공휴일이 없습니다. 동기화 버튼을 눌러 공휴일을 불러오세요.
            </div>
          ) : (
            <div className="divide-y">
              {holidays.map((h) => {
                const date = new Date(h.date);
                const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-muted-foreground w-24 shrink-0">
                        {date.toLocaleDateString('ko-KR', {
                          month: '2-digit',
                          day: '2-digit',
                        })}
                        <span className="ml-1 text-xs">({dayOfWeek})</span>
                      </span>
                      <span className="text-sm font-medium">{h.name}</span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium',
                          h.isCustom
                            ? 'bg-status-purple/10 text-status-purple'
                            : 'bg-status-blue/10 text-status-blue'
                        )}
                      >
                        {h.isCustom ? '수동' : '공휴일'}
                      </span>
                    </div>
                    {h.isCustom && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(h.id)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add holiday dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>임시 휴무 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>날짜</Label>
              <Input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
              />
            </div>
            <div>
              <Label>명칭</Label>
              <Input
                placeholder="예: 임시 휴무, 재고 정비일..."
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAdd} disabled={saving || !addDate || !addName}>
              {saving && <Loader2 className="size-3 animate-spin mr-1" />}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
