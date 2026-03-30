import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const UpdateConsumableSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  price: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const optionId = Number(id);

    if (isNaN(optionId)) {
      return NextResponse.json({ error: 'Invalid consumable ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = UpdateConsumableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const consumable = await prisma.consumableOption.update({
      where: { id: optionId },
      data: parsed.data,
    });

    return NextResponse.json({ consumable });
  } catch (err) {
    console.error('Admin update consumable error:', err);
    return NextResponse.json({ error: 'Failed to update consumable' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const optionId = Number(id);

    if (isNaN(optionId)) {
      return NextResponse.json({ error: 'Invalid consumable ID' }, { status: 400 });
    }

    const consumable = await prisma.consumableOption.update({
      where: { id: optionId },
      data: { isActive: false },
    });

    return NextResponse.json({ consumable });
  } catch (err) {
    console.error('Admin delete consumable error:', err);
    return NextResponse.json({ error: 'Failed to delete consumable' }, { status: 500 });
  }
}
