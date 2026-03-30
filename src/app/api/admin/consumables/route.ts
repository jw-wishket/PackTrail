import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const CreateConsumableSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().int().nonnegative(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const consumables = await prisma.consumableOption.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ consumables });
  } catch (err) {
    console.error('Admin consumables error:', err);
    return NextResponse.json({ error: 'Failed to fetch consumables' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = CreateConsumableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, description, price, sortOrder, isActive } = parsed.data;
    const consumable = await prisma.consumableOption.create({
      data: { name, description, price, sortOrder, isActive },
    });

    return NextResponse.json({ consumable }, { status: 201 });
  } catch (err) {
    console.error('Admin create consumable error:', err);
    return NextResponse.json({ error: 'Failed to create consumable' }, { status: 500 });
  }
}
