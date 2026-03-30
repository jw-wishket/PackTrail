import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const holidayId = Number(id);

    if (isNaN(holidayId)) {
      return NextResponse.json({ error: 'Invalid holiday ID' }, { status: 400 });
    }

    const holiday = await prisma.holiday.findUnique({
      where: { id: holidayId },
    });

    if (!holiday) {
      return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
    }

    if (!holiday.isCustom) {
      return NextResponse.json({ error: 'Cannot delete non-custom holidays' }, { status: 403 });
    }

    await prisma.holiday.delete({
      where: { id: holidayId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin delete holiday error:', err);
    return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
  }
}
