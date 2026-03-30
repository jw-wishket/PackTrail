import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

const CreateReviewSchema = z.object({
  reservationId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(10).max(2000),
  images: z.array(z.string().url()).max(5).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get('productId');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
    const limit = 10;

    const where: any = { isVisible: true };
    if (productId) {
      where.reservation = { productId: parseInt(productId, 10) };
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          rating: true,
          content: true,
          images: true,
          createdAt: true,
          user: { select: { name: true } },
          reservation: {
            select: {
              product: { select: { name: true } },
              rentalType: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return NextResponse.json({
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    // Verify reservation belongs to user and is COMPLETED
    const reservation = await prisma.reservation.findUnique({
      where: { id: parsed.data.reservationId },
      include: { review: true },
    });

    if (!reservation || reservation.userId !== user.id) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    if (reservation.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Can only review completed reservations' }, { status: 400 });
    }

    if (reservation.review) {
      return NextResponse.json({ error: 'Review already exists' }, { status: 409 });
    }

    const review = await prisma.review.create({
      data: {
        reservationId: parsed.data.reservationId,
        userId: user.id,
        rating: parsed.data.rating,
        content: parsed.data.content,
        images: parsed.data.images || [],
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error('Failed to create review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
