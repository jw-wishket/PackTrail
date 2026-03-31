import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { ReservationStatus, SetStatus } from '@prisma/client';

const StatusSchema = z.object({
  status: z.nativeEnum(ReservationStatus),
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  HOLDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['IN_USE', 'CANCELLED'],
  IN_USE: ['RETURNING'],
  RETURNING: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

const RESERVATION_TO_SET_STATUS: Partial<Record<ReservationStatus, SetStatus>> = {
  SHIPPING: 'SHIPPING',
  IN_USE: 'IN_USE',
  RETURNING: 'RETURNING',
  COMPLETED: 'AVAILABLE',
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = StatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status', details: parsed.error.flatten() }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: { equipmentSetId: true, status: true },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const newStatus = parsed.data.status;
    const currentStatus = reservation.status;
    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${newStatus}` },
        { status: 400 }
      );
    }

    const setStatus = RESERVATION_TO_SET_STATUS[newStatus];

    const updated = await prisma.$transaction(async (tx) => {
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
        },
      });

      if (reservation.equipmentSetId && setStatus) {
        await tx.equipmentSet.update({
          where: { id: reservation.equipmentSetId },
          data: {
            status: setStatus,
            ...(setStatus === 'AVAILABLE' ? { currentReservationId: null } : {}),
          },
        });
      }

      return updatedReservation;
    });

    return NextResponse.json({ reservation: updated });
  } catch (err) {
    console.error('Admin status update error:', err);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
