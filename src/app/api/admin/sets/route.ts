import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const productIdParam = request.nextUrl.searchParams.get('productId');
    const where = productIdParam ? { productId: parseInt(productIdParam, 10) } : {};

    const sets = await prisma.equipmentSet.findMany({
      where,
      orderBy: { id: 'asc' },
      include: {
        product: { select: { id: true, name: true } },
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
