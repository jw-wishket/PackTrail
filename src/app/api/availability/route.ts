import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyAvailability } from '@/lib/booking-engine';
import { getSystemSetting } from '@/lib/booking-engine/settings';
import { addBusinessDays } from '@/lib/booking-engine/business-days';
import { formatDateISO } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const monthParam = searchParams.get('month'); // YYYY-MM
    const typeParam = searchParams.get('type'); // ONE_NIGHT or TWO_NIGHT

    if (!monthParam || !typeParam) {
      return NextResponse.json(
        { error: 'month and type parameters are required' },
        { status: 400 }
      );
    }

    if (typeParam !== 'ONE_NIGHT' && typeParam !== 'TWO_NIGHT') {
      return NextResponse.json(
        { error: 'type must be ONE_NIGHT or TWO_NIGHT' },
        { status: 400 }
      );
    }

    const [yearStr, monthStr] = monthParam.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // JS Date is 0-indexed

    if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM' },
        { status: 400 }
      );
    }

    // Calculate minimum bookable date
    const minAdvanceDays = await getSystemSetting('MIN_ADVANCE_BUSINESS_DAYS');
    const minBookableDate = await addBusinessDays(new Date(), minAdvanceDays);

    const availability = await getMonthlyAvailability(year, month, typeParam);

    // Convert Map to object for JSON
    const availabilityObj: Record<string, { available: number; total: number }> = {};
    for (const [dateStr, data] of availability) {
      availabilityObj[dateStr] = data;
    }

    return NextResponse.json({
      month: monthParam,
      rentalType: typeParam,
      minBookableDate: formatDateISO(minBookableDate),
      availability: availabilityObj,
    });
  } catch (error) {
    console.error('Failed to fetch availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}
