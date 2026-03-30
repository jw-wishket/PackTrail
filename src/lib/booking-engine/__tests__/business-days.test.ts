import { describe, it, expect } from 'vitest';
import {
  isBusinessDayWithHolidays,
  addBusinessDaysWithHolidays,
  subtractBusinessDaysWithHolidays,
} from '../business-days';

const NO_HOLIDAYS = new Set<string>();
const HOLIDAYS_2026 = new Set([
  '2026-01-01', '2026-01-29', '2026-01-30', '2026-01-31',
  '2026-03-01', '2026-05-05', '2026-05-24', '2026-06-06',
  '2026-08-15', '2026-09-24', '2026-09-25', '2026-09-26',
  '2026-10-03', '2026-10-09', '2026-12-25',
]);

describe('isBusinessDayWithHolidays', () => {
  it('should return true for a regular weekday', async () => {
    // 2026-03-26 is Thursday
    expect(await isBusinessDayWithHolidays(new Date('2026-03-26'), NO_HOLIDAYS)).toBe(true);
  });

  it('should return false for Saturday', async () => {
    // 2026-03-28 is Saturday
    expect(await isBusinessDayWithHolidays(new Date('2026-03-28'), NO_HOLIDAYS)).toBe(false);
  });

  it('should return false for Sunday', async () => {
    // 2026-03-29 is Sunday
    expect(await isBusinessDayWithHolidays(new Date('2026-03-29'), NO_HOLIDAYS)).toBe(false);
  });

  it('should return false for a holiday', async () => {
    // 2026-03-01 is 삼일절 (Sunday anyway, but also a holiday)
    expect(await isBusinessDayWithHolidays(new Date('2026-03-01'), HOLIDAYS_2026)).toBe(false);
    // 2026-05-05 is 어린이날 (Tuesday)
    expect(await isBusinessDayWithHolidays(new Date('2026-05-05'), HOLIDAYS_2026)).toBe(false);
  });
});

describe('addBusinessDaysWithHolidays', () => {
  it('should skip weekends', async () => {
    // 2026-03-27 (Fri) + 1 business day = 2026-03-30 (Mon)
    const result = await addBusinessDaysWithHolidays(new Date('2026-03-27'), 1, NO_HOLIDAYS);
    expect(result.toISOString().split('T')[0]).toBe('2026-03-30');
  });

  it('should skip weekends and holidays', async () => {
    // 2026-03-27 (Fri) + 4 business days with no holidays = 2026-04-02 (Thu)
    const result = await addBusinessDaysWithHolidays(new Date('2026-03-27'), 4, NO_HOLIDAYS);
    expect(result.toISOString().split('T')[0]).toBe('2026-04-02');
  });

  it('should handle the design doc example: post-use days', async () => {
    // From design doc: use_end=3/27(Fri), post_use=4 days
    // Skip 3/28(Sat), 3/29(Sun) → 3/30(Mon)=1, 3/31(Tue)=2, 4/1(Wed)=3, 4/2(Thu)=4
    const result = await addBusinessDaysWithHolidays(new Date('2026-03-27'), 4, NO_HOLIDAYS);
    expect(result.toISOString().split('T')[0]).toBe('2026-04-02');
  });
});

describe('subtractBusinessDaysWithHolidays', () => {
  it('should skip weekends backwards', async () => {
    // 2026-03-30 (Mon) - 1 business day = 2026-03-27 (Fri)
    const result = await subtractBusinessDaysWithHolidays(new Date('2026-03-30'), 1, NO_HOLIDAYS);
    expect(result.toISOString().split('T')[0]).toBe('2026-03-27');
  });

  it('should handle the design doc example: pre-use days', async () => {
    // From design doc: use_start=3/26(Thu), pre_use=3 days
    // 3/25(Wed)=1, 3/24(Tue)=2, 3/23(Mon)=3
    const result = await subtractBusinessDaysWithHolidays(new Date('2026-03-26'), 3, NO_HOLIDAYS);
    expect(result.toISOString().split('T')[0]).toBe('2026-03-23');
  });
});
