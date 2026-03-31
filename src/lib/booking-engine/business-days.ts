import { prisma } from '@/lib/prisma';
import { formatDateISO } from '@/lib/utils';

// Holiday cache: refresh every 10 minutes
let holidayCache: { dates: Set<string>; expiresAt: number } | null = null;
const HOLIDAY_CACHE_TTL = 10 * 60 * 1000;

export async function getHolidaySet(): Promise<Set<string>> {
  if (holidayCache && Date.now() < holidayCache.expiresAt) {
    return holidayCache.dates;
  }

  const holidays = await prisma.holiday.findMany({
    select: { date: true },
  });

  const dates = new Set(
    holidays.map((h) => formatDateISO(h.date))
  );

  holidayCache = { dates, expiresAt: Date.now() + HOLIDAY_CACHE_TTL };
  return dates;
}

export function invalidateHolidayCache(): void {
  holidayCache = null;
}

export async function isBusinessDay(date: Date): Promise<boolean> {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false; // Weekend

  const dateStr = formatDateISO(date);
  const holidays = await getHolidaySet();
  return !holidays.has(dateStr);
}

export async function addBusinessDays(date: Date, days: number): Promise<Date> {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (await isBusinessDay(result)) added++;
  }
  return result;
}

export async function subtractBusinessDays(date: Date, days: number): Promise<Date> {
  const result = new Date(date);
  let subtracted = 0;
  while (subtracted < days) {
    result.setUTCDate(result.getUTCDate() - 1);
    if (await isBusinessDay(result)) subtracted++;
  }
  return result;
}

// Synchronous versions — accept pre-fetched holiday set
export function isBusinessDaySync(date: Date, holidays: Set<string>): boolean {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !holidays.has(formatDateISO(date));
}

export function addBusinessDaysSync(date: Date, days: number, holidays: Set<string>): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (isBusinessDaySync(result, holidays)) added++;
  }
  return result;
}

export function subtractBusinessDaysSync(date: Date, days: number, holidays: Set<string>): Date {
  const result = new Date(date);
  let subtracted = 0;
  while (subtracted < days) {
    result.setUTCDate(result.getUTCDate() - 1);
    if (isBusinessDaySync(result, holidays)) subtracted++;
  }
  return result;
}

// For testing: inject holidays without DB
export async function isBusinessDayWithHolidays(
  date: Date,
  holidays: Set<string>
): Promise<boolean> {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  const dateStr = formatDateISO(date);
  return !holidays.has(dateStr);
}

export async function addBusinessDaysWithHolidays(
  date: Date,
  days: number,
  holidays: Set<string>
): Promise<Date> {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (await isBusinessDayWithHolidays(result, holidays)) added++;
  }
  return result;
}

export async function subtractBusinessDaysWithHolidays(
  date: Date,
  days: number,
  holidays: Set<string>
): Promise<Date> {
  const result = new Date(date);
  let subtracted = 0;
  while (subtracted < days) {
    result.setUTCDate(result.getUTCDate() - 1);
    if (await isBusinessDayWithHolidays(result, holidays)) subtracted++;
  }
  return result;
}
