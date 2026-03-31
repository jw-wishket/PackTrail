import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const [product, reviews, consumableOptions] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId, isActive: true },
        include: { sets: { select: { id: true, status: true } } },
      }),
      prisma.review.findMany({
        where: {
          isVisible: true,
          reservation: { productId },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          rating: true,
          content: true,
          images: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
      prisma.consumableOption.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    const setCount = product.sets.length;
    const availableSets = product.sets.filter((s) => s.status === 'AVAILABLE').length;

    const { sets, ...productData } = product;

    return NextResponse.json({
      product: productData,
      setCount,
      availableSets,
      reviews,
      reviewCount: reviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
      consumableOptions,
    });
  } catch (error) {
    console.error('Failed to fetch product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
