import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { SetStatus } from '@prisma/client';

const SetStatusSchema = z.object({
  status: z.nativeEnum(SetStatus),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const setId = Number(id);

    if (isNaN(setId)) {
      return NextResponse.json({ error: 'Invalid set ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = SetStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status', details: parsed.error.flatten() }, { status: 400 });
    }

    const set = await prisma.equipmentSet.update({
      where: { id: setId },
      data: { status: parsed.data.status },
    });

    return NextResponse.json({ set });
  } catch (err) {
    console.error('Admin set status error:', err);
    return NextResponse.json({ error: 'Failed to update set status' }, { status: 500 });
  }
}
