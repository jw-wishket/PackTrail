import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPortOneSignature } from '@/lib/portone/webhook';

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get('x-portone-signature');

    if (!verifyPortOneSignature(bodyText, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(bodyText);
    const { paymentId, status } = body;

    if (status === 'PAID') {
      await prisma.reservation.updateMany({
        where: { paymentId, status: 'HOLDING' },
        data: {
          status: 'CONFIRMED',
          holdExpiresAt: null,
        },
      });
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      const reservation = await prisma.reservation.findFirst({
        where: { paymentId },
      });
      if (reservation) {
        await prisma.$transaction([
          prisma.reservationBlock.deleteMany({
            where: { reservationId: reservation.id },
          }),
          prisma.reservation.update({
            where: { id: reservation.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancelReason: `결제 ${status === 'FAILED' ? '실패' : '취소'}`,
            },
          }),
        ]);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
