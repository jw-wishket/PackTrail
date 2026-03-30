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
    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation || reservation.userId !== user.id) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    if (reservation.status !== 'HOLDING') {
      return NextResponse.json({ error: 'Reservation is not in HOLDING status' }, { status: 400 });
    }

    // TODO: In Task 37, add PortOne payment verification here

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        holdExpiresAt: null,
      },
    });

    return NextResponse.json({ reservation: updated });
  } catch (error) {
    console.error('Failed to confirm reservation:', error);
    return NextResponse.json({ error: 'Failed to confirm' }, { status: 500 });
  }
}
