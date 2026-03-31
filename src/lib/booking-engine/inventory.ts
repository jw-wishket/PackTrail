import { prisma } from '@/lib/prisma';
import { calculateBlockPeriod, type BlockPeriod } from './block-calculator';
import { formatDateISO } from '@/lib/utils';

async function getTotalSetsForProduct(productId: number): Promise<number> {
  return prisma.equipmentSet.count({ where: { productId } });
}

async function getSetIdsForProduct(productId: number): Promise<number[]> {
  const sets = await prisma.equipmentSet.findMany({
    where: { productId },
    select: { id: true },
  });
  return sets.map((s) => s.id);
}

export async function getAvailableSetCount(
  targetDate: Date,
  rentalType: 'ONE_NIGHT' | 'TWO_NIGHT',
  productId: number
): Promise<number> {
  const block = await calculateBlockPeriod(targetDate, rentalType);
  const totalSets = await getTotalSetsForProduct(productId);
  const setIds = await getSetIdsForProduct(productId);

  if (setIds.length === 0) return 0;

  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT equipment_set_id) as count
    FROM reservation_blocks
    WHERE equipment_set_id = ANY(${setIds})
      AND block_range && daterange(
        ${formatDateISO(block.blockStart)}::date,
        ${formatDateISO(block.blockEnd)}::date,
        '[]'
      )
  `;

  return totalSets - Number(result[0].count);
}

export interface DayAvailability {
  available: number;
  total: number;
}

export async function getMonthlyAvailability(
  year: number,
  month: number, // 0-indexed (JS Date convention)
  rentalType: 'ONE_NIGHT' | 'TWO_NIGHT',
  productId: number
): Promise<Map<string, DayAvailability>> {
  const totalSets = await getTotalSetsForProduct(productId);
  const setIds = await getSetIdsForProduct(productId);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const availability = new Map<string, DayAvailability>();

  if (setIds.length === 0) {
    // No sets for this product — all days show 0 availability
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      availability.set(formatDateISO(date), { available: 0, total: 0 });
    }
    return availability;
  }

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  // Fetch all blocks that might overlap with any day in this month
  // We need a wider window because block periods extend before/after use dates
  const windowStart = new Date(monthStart);
  windowStart.setDate(windowStart.getDate() - 20); // generous buffer
  const windowEnd = new Date(monthEnd);
  windowEnd.setDate(windowEnd.getDate() + 20);

  const allBlocks = await prisma.$queryRaw<
    { equipment_set_id: number; block_start: string; block_end: string }[]
  >`
    SELECT
      equipment_set_id,
      lower(block_range)::text as block_start,
      upper(block_range)::text as block_end
    FROM reservation_blocks
    WHERE equipment_set_id = ANY(${setIds})
      AND block_range && daterange(
        ${formatDateISO(windowStart)}::date,
        ${formatDateISO(windowEnd)}::date,
        '[]'
      )
  `;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDateISO(date);

    // Calculate what the block period would be if someone booked this date
    const block = await calculateBlockPeriod(date, rentalType);
    const blockStartStr = formatDateISO(block.blockStart);
    const blockEndStr = formatDateISO(block.blockEnd);

    // Count how many sets are blocked for this potential booking
    const blockedSetIds = new Set(
      allBlocks
        .filter((b) => b.block_start <= blockEndStr && b.block_end >= blockStartStr)
        .map((b) => b.equipment_set_id)
    );

    availability.set(dateStr, {
      available: totalSets - blockedSetIds.size,
      total: totalSets,
    });
  }

  return availability;
}
