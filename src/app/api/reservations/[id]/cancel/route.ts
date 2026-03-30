import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation || reservation.userId !== user.id) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    if (!['HOLDING', 'CONFIRMED'].includes(reservation.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel reservation in current status' },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.reservationBlock.deleteMany({
        where: { reservationId: id },
      }),
      prisma.reservation.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: body.reason || '사용자 취소',
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to cancel reservation:', error);
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }
}
