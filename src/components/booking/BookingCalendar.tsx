'use client';

import { useState, useEffect, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import { ko } from 'date-fns/locale';
import { addDays, format, isBefore, startOfDay } from 'date-fns';
import { cn, formatDateISO } from '@/lib/utils';

type RentalType = 'ONE_NIGHT' | 'TWO_NIGHT';

interface BookingCalendarProps {
  rentalType: RentalType;
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}

interface AvailabilityData {
  minBookableDate: string;
  availability: Record<string, { available: number; total: number }>;
}

export function BookingCalendar({ rentalType, selectedDate, onSelect }: BookingCalendarProps) {
  const [month, setMonth] = useState(new Date());
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAvailable, setSelectedAvailable] = useState<number | null>(null);

  const fetchAvailability = useCallback(async (d: Date) => {
    setLoading(true);
    try {
      const monthStr = format(d, 'yyyy-MM');
      const res = await fetch(`/api/availability?month=${monthStr}&type=${rentalType}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [rentalType]);

  useEffect(() => {
    fetchAvailability(month);
  }, [month, fetchAvailability]);

  // When a date is selected, fetch its set count
  useEffect(() => {
    if (!selectedDate) {
      setSelectedAvailable(null);
      return;
    }
    const dateStr = formatDateISO(selectedDate);
    fetch(`/api/availability/${dateStr}/sets?type=${rentalType}`)
      .then((r) => r.json())
      .then((d) => setSelectedAvailable(d.available))
      .catch(() => setSelectedAvailable(null));
  }, [selectedDate, rentalType]);

  const today = startOfDay(new Date());
  const minBookable = data?.minBookableDate ? startOfDay(new Date(data.minBookableDate)) : null;
  const endDate = selectedDate
    ? addDays(selectedDate, rentalType === 'ONE_NIGHT' ? 1 : 2)
    : null;

  const disabledMatcher = (date: Date) => {
    const d = startOfDay(date);
    if (isBefore(d, today)) return true;
    if (minBookable && isBefore(d, minBookable)) return true;
    // Check availability
    const key = formatDateISO(d);
    if (data?.availability[key] && data.availability[key].available === 0) return true;
    return false;
  };

  const modifiers = {
    endDate: endDate ? [endDate] : [],
  };

  const modifiersClassNames = {
    endDate: 'bg-olive/15 text-olive font-semibold rounded-xl',
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-moss">날짜 선택</h2>
      <p className="text-sm text-sage">
        캠핑 시작일을 선택하면 종료일이 자동으로 설정됩니다.
      </p>

      <div className="mt-4 flex justify-center">
        <div className="rounded-xl border border-beige bg-white p-4">
          {loading && (
            <div className="text-center text-sm text-sage py-2 animate-pulse">
              가용성 확인 중...
            </div>
          )}
          <DayPicker
            mode="single"
            locale={ko}
            selected={selectedDate ?? undefined}
            onSelect={(date) => date && onSelect(date)}
            disabled={disabledMatcher}
            month={month}
            onMonthChange={setMonth}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            classNames={{
              today: 'font-bold text-olive',
              selected: 'bg-olive text-white rounded-xl font-bold',
              disabled: 'text-muted/50 line-through',
            }}
          />
        </div>
      </div>

      {selectedDate && (
        <div className="rounded-xl border border-beige bg-white p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-sage">시작일</span>
            <span className="font-semibold text-moss">{format(selectedDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sage">종료일</span>
            <span className="font-semibold text-moss">{endDate && format(endDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}</span>
          </div>
          {selectedAvailable !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sage">잔여 세트</span>
              <span className={cn('font-bold', selectedAvailable <= 2 ? 'text-warning' : 'text-price-green')}>
                {selectedAvailable}세트 남음
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
