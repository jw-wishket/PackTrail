import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateHolidayCache } from '@/lib/booking-engine';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const apiKey = process.env.HOLIDAY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'HOLIDAY_API_KEY not configured' }, { status: 500 });
    }

    const nextYear = new Date().getFullYear() + 1;

    // Korean Astronomy and Space Science Institute API
    const url = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?serviceKey=${apiKey}&solYear=${nextYear}&numOfRows=50&_type=json`;

    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: 'Holiday API request failed' }, { status: 502 });
    }

    const data = await response.json();
    const items = data?.response?.body?.items?.item;

    if (!items) {
      return NextResponse.json({ error: 'No holiday data returned' }, { status: 502 });
    }

    const holidayList = Array.isArray(items) ? items : [items];
    let upsertCount = 0;

    for (const item of holidayList) {
      const dateStr = String(item.locdate);
      const date = new Date(
        `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
      );

      await prisma.holiday.upsert({
        where: { date },
        update: { name: item.dateName, year: nextYear },
        create: {
          date,
          name: item.dateName,
          year: nextYear,
          isCustom: false,
        },
      });
      upsertCount++;
    }

    invalidateHolidayCache();

    return NextResponse.json({
      year: nextYear,
      synced: upsertCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron sync-holidays error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
