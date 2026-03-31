import { addBusinessDays, subtractBusinessDays, addBusinessDaysWithHolidays, subtractBusinessDaysWithHolidays, addBusinessDaysSync, subtractBusinessDaysSync } from './business-days';
import { getSystemSettings } from './settings';
import { formatDateISO } from '@/lib/utils';

export interface BlockPeriod {
  useStart: Date;
  useEnd: Date;
  blockStart: Date;
  blockEnd: Date;
  blockRange: string; // PostgreSQL daterange format: [start, end]
}

export async function calculateBlockPeriod(
  useStartDate: Date,
  rentalType: 'ONE_NIGHT' | 'TWO_NIGHT'
): Promise<BlockPeriod> {
  const settings = await getSystemSettings();
  const preUseDays = settings.PRE_USE_BUSINESS_DAYS;
  const postUseDays = settings.POST_USE_BUSINESS_DAYS;

  const nights = rentalType === 'TWO_NIGHT' ? 2 : 1;
  const useEnd = new Date(useStartDate);
  useEnd.setDate(useEnd.getDate() + nights);

  const blockStart = await subtractBusinessDays(useStartDate, preUseDays);
  const blockEnd = await addBusinessDays(useEnd, postUseDays);

  return {
    useStart: useStartDate,
    useEnd,
    blockStart,
    blockEnd,
    blockRange: `[${formatDateISO(blockStart)}, ${formatDateISO(blockEnd)}]`,
  };
}

export interface SystemSettingsLike {
  PRE_USE_BUSINESS_DAYS: number;
  POST_USE_BUSINESS_DAYS: number;
}

export function calculateBlockPeriodSync(
  useStartDate: Date,
  rentalType: 'ONE_NIGHT' | 'TWO_NIGHT',
  settings: SystemSettingsLike,
  holidays: Set<string>
): BlockPeriod {
  const nights = rentalType === 'TWO_NIGHT' ? 2 : 1;
  const useEnd = new Date(useStartDate);
  useEnd.setUTCDate(useEnd.getUTCDate() + nights);

  const blockStart = subtractBusinessDaysSync(useStartDate, settings.PRE_USE_BUSINESS_DAYS, holidays);
  const blockEnd = addBusinessDaysSync(useEnd, settings.POST_USE_BUSINESS_DAYS, holidays);

  return {
    useStart: useStartDate,
    useEnd,
    blockStart,
    blockEnd,
    blockRange: `[${formatDateISO(blockStart)}, ${formatDateISO(blockEnd)}]`,
  };
}

// For testing without DB
export async function calculateBlockPeriodWithHolidays(
  useStartDate: Date,
  rentalType: 'ONE_NIGHT' | 'TWO_NIGHT',
  holidays: Set<string>,
  preUseDays: number = 3,
  postUseDays: number = 4
): Promise<BlockPeriod> {
  const nights = rentalType === 'TWO_NIGHT' ? 2 : 1;
  const useEnd = new Date(useStartDate);
  useEnd.setDate(useEnd.getDate() + nights);

  const blockStart = await subtractBusinessDaysWithHolidays(useStartDate, preUseDays, holidays);
  const blockEnd = await addBusinessDaysWithHolidays(useEnd, postUseDays, holidays);

  return {
    useStart: useStartDate,
    useEnd,
    blockStart,
    blockEnd,
    blockRange: `[${formatDateISO(blockStart)}, ${formatDateISO(blockEnd)}]`,
  };
}
