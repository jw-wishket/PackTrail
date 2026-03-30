import { describe, it, expect } from 'vitest';
import { calculateBlockPeriodWithHolidays } from '../block-calculator';

const NO_HOLIDAYS = new Set<string>();

describe('calculateBlockPeriodWithHolidays', () => {
  it('should calculate correct block for ONE_NIGHT (design doc example)', async () => {
    // Design doc: use 3/26(Thu)~3/27(Fri), pre=3, post=4
    // blockStart: 3/26 - 3 biz days = 3/23(Mon)
    // blockEnd: 3/27 + 4 biz days = skip weekend = 4/2(Thu)
    const result = await calculateBlockPeriodWithHolidays(
      new Date('2026-03-26'), 'ONE_NIGHT', NO_HOLIDAYS
    );
    expect(result.useStart.toISOString().split('T')[0]).toBe('2026-03-26');
    expect(result.useEnd.toISOString().split('T')[0]).toBe('2026-03-27');
    expect(result.blockStart.toISOString().split('T')[0]).toBe('2026-03-23');
    expect(result.blockEnd.toISOString().split('T')[0]).toBe('2026-04-02');
    expect(result.blockRange).toBe('[2026-03-23, 2026-04-02]');
  });

  it('should calculate correct block for TWO_NIGHT', async () => {
    // use 3/26(Thu)~3/28(Sat), pre=3, post=4
    // blockStart: 3/26 - 3 = 3/23(Mon)
    // blockEnd: 3/28 + 4 = skip 3/28(Sat)3/29(Sun) → 3/30(Mon)=1, 3/31=2, 4/1=3, 4/2=4 → 4/2
    const result = await calculateBlockPeriodWithHolidays(
      new Date('2026-03-26'), 'TWO_NIGHT', NO_HOLIDAYS
    );
    expect(result.useStart.toISOString().split('T')[0]).toBe('2026-03-26');
    expect(result.useEnd.toISOString().split('T')[0]).toBe('2026-03-28');
    expect(result.blockStart.toISOString().split('T')[0]).toBe('2026-03-23');
    expect(result.blockEnd.toISOString().split('T')[0]).toBe('2026-04-02');
  });

  it('should handle holidays in pre-use period', async () => {
    // If 3/25(Wed) is a holiday, pre-use from 3/26 needs to go back one more day
    // 3/25(Wed)=holiday, so: 3/24(Tue)=1, 3/23(Mon)=2, 3/20(Fri)=3
    const holidays = new Set(['2026-03-25']);
    const result = await calculateBlockPeriodWithHolidays(
      new Date('2026-03-26'), 'ONE_NIGHT', holidays
    );
    expect(result.blockStart.toISOString().split('T')[0]).toBe('2026-03-20');
  });
});
