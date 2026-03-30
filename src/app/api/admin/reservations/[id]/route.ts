import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        product: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        equipmentSet: { select: { id: true, name: true, status: true } },
        options: {
          include: { option: { select: { id: true, name: true } } },
        },
        review: true,
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    return NextResponse.json({ reservation });
  } catch (err) {
    console.error('Admin reservation detail error:', err);
    return NextResponse.json({ error: 'Failed to fetch reservation' }, { status: 500 });
  }
}
