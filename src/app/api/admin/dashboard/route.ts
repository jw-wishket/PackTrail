import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const [statusCounts, monthlyRevenue, holdingCount, recentReservations, equipmentSets] =
      await Promise.all([
        prisma.reservation.groupBy({
          by: ['status'],
          _count: true,
          where: {
            createdAt: {
              gte: new Date(today.toISOString().split('T')[0]),
              lt: new Date(new Date(today.getTime() + 86400000).toISOString().split('T')[0]),
            },
          },
        }),
        prisma.reservation.aggregate({
          _sum: { totalPrice: true },
          where: {
            status: { in: ['CONFIRMED', 'SHIPPING', 'IN_USE', 'RETURNING', 'COMPLETED'] },
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        prisma.reservation.count({
          where: { status: 'HOLDING' },
        }),
        prisma.reservation.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            product: { select: { name: true } },
            user: { select: { name: true, email: true } },
          },
        }),
        prisma.equipmentSet.findMany({
          orderBy: { id: 'asc' },
          include: {
            currentReservation: {
              select: { id: true, status: true, useStartDate: true, useEndDate: true },
            },
          },
        }),
      ]);

    return NextResponse.json({
      todayReservations: statusCounts.reduce(
        (acc, { status, _count }) => ({ ...acc, [status]: _count }),
        {} as Record<string, number>
      ),
      monthlyRevenue: monthlyRevenue._sum.totalPrice ?? 0,
      holdingCount,
      recentReservations,
      equipmentSets,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
