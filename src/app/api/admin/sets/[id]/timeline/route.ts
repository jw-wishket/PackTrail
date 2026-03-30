import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const setId = Number(id);

    if (isNaN(setId)) {
      return NextResponse.json({ error: 'Invalid set ID' }, { status: 400 });
    }

    const weeks = Math.min(12, Math.max(1, Number(request.nextUrl.searchParams.get('weeks') ?? 2)));
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + weeks * 7);

    const reservations = await prisma.reservation.findMany({
      where: {
        equipmentSetId: setId,
        status: { notIn: ['CANCELLED'] },
        blockStartDate: { lte: endDate },
        blockEndDate: { gte: startDate },
      },
      orderBy: { blockStartDate: 'asc' },
      select: {
        id: true,
        status: true,
        useStartDate: true,
        useEndDate: true,
        blockStartDate: true,
        blockEndDate: true,
        user: { select: { name: true } },
        product: { select: { name: true } },
      },
    });

    return NextResponse.json({
      setId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      reservations,
    });
  } catch (err) {
    console.error('Admin timeline error:', err);
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}
