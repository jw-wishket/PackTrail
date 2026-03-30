import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        product: true,
        equipmentSet: { select: { name: true, status: true } },
        options: {
          include: { option: true },
        },
        review: { select: { id: true } },
      },
    });

    if (!reservation || reservation.userId !== user.id) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error('Failed to fetch reservation:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
