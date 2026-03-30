import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const sets = await prisma.equipmentSet.findMany({
      orderBy: { id: 'asc' },
      include: {
        currentReservation: {
          select: {
            id: true,
            status: true,
            useStartDate: true,
            useEndDate: true,
            user: { select: { name: true, email: true } },
            product: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ sets });
  } catch (err) {
    console.error('Admin sets error:', err);
    return NextResponse.json({ error: 'Failed to fetch sets' }, { status: 500 });
  }
}
