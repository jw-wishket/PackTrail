import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') ?? 'createdAt';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

    const where: Prisma.ReservationWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumReservationStatusFilter;
    }

    if (search) {
      // UUID fields don't support `contains`, so try exact match for id
      const isUuidLike = /^[0-9a-f-]{4,}$/i.test(search);
      where.OR = [
        ...(isUuidLike ? [{ id: { equals: search } }] : []),
        { user: { name: { contains: search, mode: 'insensitive' as const } } },
        { user: { email: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const allowedSorts = ['createdAt', 'useStartDate', 'totalPrice', 'status'];
    const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        orderBy: { [sortField]: order },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          product: { select: { id: true, name: true } },
          user: { select: { name: true, email: true } },
          equipmentSet: { select: { id: true, name: true, status: true } },
        },
      }),
      prisma.reservation.count({ where }),
    ]);

    return NextResponse.json({
      reservations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Admin reservations error:', err);
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
  }
}
