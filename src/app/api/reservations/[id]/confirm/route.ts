import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { verifyPayment } from '@/lib/portone/verify';

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
    const { paymentId, deliveryAddress, deliveryMemo } = body as {
      paymentId?: string | null;
      deliveryAddress?: string | null;
      deliveryMemo?: string | null;
    };

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation || reservation.userId !== user.id) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    if (reservation.status !== 'HOLDING') {
      return NextResponse.json({ error: 'Reservation is not in HOLDING status' }, { status: 400 });
    }

    if (reservation.holdExpiresAt && new Date(reservation.holdExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Hold has expired' }, { status: 410 });
    }

    if (paymentId) {
      const verification = await verifyPayment(paymentId);
      if (!verification.verified) {
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
      }
      if (verification.amount !== reservation.totalPrice) {
        return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
      }
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        holdExpiresAt: null,
        paymentId: paymentId ?? null,
        ...(deliveryAddress != null && { deliveryAddress }),
        ...(deliveryMemo != null && { deliveryMemo }),
      },
    });

    return NextResponse.json({ reservation: updated });
  } catch (error) {
    console.error('Failed to confirm reservation:', error);
    return NextResponse.json({ error: 'Failed to confirm' }, { status: 500 });
  }
}
