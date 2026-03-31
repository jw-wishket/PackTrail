import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSetCount } from '@/lib/booking-engine';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const typeParam = request.nextUrl.searchParams.get('type');
    const productIdParam = request.nextUrl.searchParams.get('productId');

    if (!typeParam || (typeParam !== 'ONE_NIGHT' && typeParam !== 'TWO_NIGHT')) {
      return NextResponse.json(
        { error: 'type parameter must be ONE_NIGHT or TWO_NIGHT' },
        { status: 400 }
      );
    }

    if (!productIdParam) {
      return NextResponse.json(
        { error: 'productId parameter is required' },
        { status: 400 }
      );
    }

    const productId = parseInt(productIdParam, 10);
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'Invalid productId' },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const available = await getAvailableSetCount(targetDate, typeParam, productId);
    const total = await prisma.equipmentSet.count({ where: { productId } });

    return NextResponse.json({
      date,
      rentalType: typeParam,
      productId,
      available,
      total,
    });
  } catch (error) {
    console.error('Failed to fetch set availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}
