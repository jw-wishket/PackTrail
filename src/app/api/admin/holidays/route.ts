import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const CreateHolidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(1).max(100),
});

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const year = Number(request.nextUrl.searchParams.get('year') ?? new Date().getFullYear());

    const holidays = await prisma.holiday.findMany({
      where: { year },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ holidays });
  } catch (err) {
    console.error('Admin holidays error:', err);
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = CreateHolidaySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const date = new Date(parsed.data.date);
    const year = date.getFullYear();

    const existing = await prisma.holiday.findUnique({
      where: { date },
    });

    if (existing) {
      return NextResponse.json({ error: 'Holiday already exists for this date' }, { status: 409 });
    }

    const holiday = await prisma.holiday.create({
      data: {
        date,
        name: parsed.data.name,
        year,
        isCustom: true,
      },
    });

    return NextResponse.json({ holiday }, { status: 201 });
  } catch (err) {
    console.error('Admin create holiday error:', err);
    return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 });
  }
}
