import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { invalidateSettingsCache } from '@/lib/booking-engine/settings';

const UpdateSettingsSchema = z.record(
  z.string(),
  z.union([z.number(), z.string(), z.boolean()])
);

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    return NextResponse.json({ settings });
  } catch (err) {
    console.error('Admin settings error:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = UpdateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const updates = Object.entries(parsed.data).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: value as number, updatedAt: new Date() },
        create: { key, value: value as number },
      })
    );

    await Promise.all(updates);
    invalidateSettingsCache();

    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    return NextResponse.json({ settings });
  } catch (err) {
    console.error('Admin update settings error:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
