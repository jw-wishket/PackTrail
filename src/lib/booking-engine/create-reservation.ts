import { prisma } from '@/lib/prisma';
import { calculateBlockPeriod } from './block-calculator';
import { getSystemSetting } from './settings';
import { formatDateISO } from '@/lib/utils';

export interface CreateReservationInput {
  userId: string;
  productId: number;
  rentalType: 'ONE_NIGHT' | 'TWO_NIGHT';
  useStartDate: Date;
  totalPrice: number;
  deliveryAddress?: string;
  deliveryMemo?: string;
  options?: { optionId: number; quantity: number; priceAtOrder: number }[];
}

export interface CreateReservationResult {
  reservationId: string;
  equipmentSetId: number;
  equipmentSetName: string;
  holdExpiresAt: Date;
  block: {
    useStart: string;
    useEnd: string;
    blockStart: string;
    blockEnd: string;
  };
}

export class SoldOutError extends Error {
  constructor() {
    super('SOLD_OUT');
    this.name = 'SoldOutError';
  }
}

export class BlockConflictError extends Error {
  constructor() {
    super('BLOCK_CONFLICT');
    this.name = 'BlockConflictError';
  }
}

async function findAvailableSet(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  blockStart: string,
  blockEnd: string
): Promise<{ id: number; name: string } | null> {
  const totalSets = await getSystemSetting('TOTAL_SETS');

  // Find set IDs that are NOT blocked in the target range
  const blockedSets = await tx.$queryRaw<{ equipment_set_id: number }[]>`
    SELECT DISTINCT equipment_set_id
    FROM reservation_blocks
    WHERE block_range && daterange(${blockStart}::date, ${blockEnd}::date, '[]')
  `;

  const blockedIds = new Set(blockedSets.map((r) => r.equipment_set_id));

  // Find first available set (round-robin by lowest ID)
  const allSets = await tx.equipmentSet.findMany({
    where: { status: 'AVAILABLE' },
    orderBy: { id: 'asc' },
    select: { id: true, name: true },
  });

  return allSets.find((s) => !blockedIds.has(s.id)) ?? null;
}

export async function createReservation(
  input: CreateReservationInput
): Promise<CreateReservationResult> {
  const block = await calculateBlockPeriod(input.useStartDate, input.rentalType);
  const holdMinutes = await getSystemSetting('HOLD_DURATION_MINUTES');

  const blockStartStr = formatDateISO(block.blockStart);
  const blockEndStr = formatDateISO(block.blockEnd);

  try {
    return await prisma.$transaction(
      async (tx) => {
        // 1. Find available set
        const availableSet = await findAvailableSet(tx, blockStartStr, blockEndStr);
        if (!availableSet) throw new SoldOutError();

        // 2. Advisory Lock on the first candidate
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${availableSet.id})`;

        // 3. Re-find available set (may have changed due to concurrent transactions)
        const confirmedSet = await findAvailableSet(tx, blockStartStr, blockEndStr);
        if (!confirmedSet) throw new SoldOutError();

        // 4. Create reservation
        const holdExpiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);
        const reservation = await tx.reservation.create({
          data: {
            userId: input.userId,
            equipmentSetId: confirmedSet.id,
            productId: input.productId,
            rentalType: input.rentalType,
            useStartDate: block.useStart,
            useEndDate: block.useEnd,
            blockStartDate: block.blockStart,
            blockEndDate: block.blockEnd,
            status: 'HOLDING',
            totalPrice: input.totalPrice,
            holdExpiresAt,
            deliveryAddress: input.deliveryAddress,
            deliveryMemo: input.deliveryMemo,
          },
        });

        // 5. Insert block (EXCLUDE constraint prevents overlaps)
        await tx.$executeRaw`
          INSERT INTO reservation_blocks
            (reservation_id, equipment_set_id, block_range)
          VALUES (
            ${reservation.id}::uuid,
            ${confirmedSet.id},
            daterange(${blockStartStr}::date, ${blockEndStr}::date, '[]')
          )
        `;

        // 6. Create options if any
        if (input.options && input.options.length > 0) {
          await tx.reservationOption.createMany({
            data: input.options.map((opt) => ({
              reservationId: reservation.id,
              optionId: opt.optionId,
              quantity: opt.quantity,
              priceAtOrder: opt.priceAtOrder,
            })),
          });
        }

        return {
          reservationId: reservation.id,
          equipmentSetId: confirmedSet.id,
          equipmentSetName: confirmedSet.name,
          holdExpiresAt,
          block: {
            useStart: formatDateISO(block.useStart),
            useEnd: formatDateISO(block.useEnd),
            blockStart: blockStartStr,
            blockEnd: blockEndStr,
          },
        };
      },
      {
        isolationLevel: 'Serializable',
      }
    );
  } catch (error: any) {
    // Handle EXCLUDE constraint violation
    if (error?.code === 'P2010' || error?.message?.includes('no_overlapping_blocks')) {
      throw new BlockConflictError();
    }
    throw error;
  }
}
