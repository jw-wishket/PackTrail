import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const expired = await prisma.reservation.findMany({
      where: {
        status: 'HOLDING',
        holdExpiresAt: { lt: new Date() },
      },
    });

    let cancelledCount = 0;
    const errors: string[] = [];

    for (const reservation of expired) {
      try {
        await prisma.$transaction([
          prisma.reservationBlock.deleteMany({
            where: { reservationId: reservation.id },
          }),
          prisma.reservation.update({
            where: { id: reservation.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancelReason: '결제 시간 초과',
            },
          }),
        ]);
        cancelledCount++;
      } catch (err) {
        errors.push(`Failed to cancel ${reservation.id}: ${err}`);
      }
    }

    return NextResponse.json({
      expired: expired.length,
      cancelled: cancelledCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron expire-holdings error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
