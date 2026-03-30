import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] expire-holdings cron started`);

  try {
    const expired = await prisma.reservation.findMany({
      where: {
        status: 'HOLDING',
        holdExpiresAt: { lt: new Date() },
      },
    });

    console.log(`[${new Date().toISOString()}] Found ${expired.length} expired holding(s)`);

    let cancelledCount = 0;
    let affectedSetCount = 0;
    const errors: string[] = [];

    for (const reservation of expired) {
      try {
        const setId = reservation.equipmentSetId;

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
          ...(setId != null
            ? [
                prisma.equipmentSet.updateMany({
                  where: {
                    id: setId,
                    status: 'RESERVED',
                  },
                  data: { status: 'AVAILABLE' },
                }),
              ]
            : []),
        ]);

        cancelledCount++;
        if (setId != null) affectedSetCount++;
        console.log(
          `[${new Date().toISOString()}] Cancelled reservation ${reservation.id}` +
            (setId != null ? `, reset set ${setId} to AVAILABLE` : '')
        );
      } catch (err) {
        const msg = `Failed to cancel ${reservation.id}: ${err}`;
        errors.push(msg);
        console.error(`[${new Date().toISOString()}] ${msg}`);
      }
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    console.log(
      `[${endTime.toISOString()}] expire-holdings cron finished — cancelled: ${cancelledCount}, affectedSets: ${affectedSetCount}, errors: ${errors.length}, duration: ${durationMs}ms`
    );

    return NextResponse.json({
      expired: expired.length,
      cancelled: cancelledCount,
      affectedSets: affectedSetCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: endTime.toISOString(),
      durationMs,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cron expire-holdings error:`, error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
