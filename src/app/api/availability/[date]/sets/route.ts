import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSetCount } from '@/lib/booking-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const typeParam = request.nextUrl.searchParams.get('type');

    if (!typeParam || (typeParam !== 'ONE_NIGHT' && typeParam !== 'TWO_NIGHT')) {
      return NextResponse.json(
        { error: 'type parameter must be ONE_NIGHT or TWO_NIGHT' },
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

    const available = await getAvailableSetCount(targetDate, typeParam);

    return NextResponse.json({
      date,
      rentalType: typeParam,
      available,
      total: 10,
    });
  } catch (error) {
    console.error('Failed to fetch set availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}
