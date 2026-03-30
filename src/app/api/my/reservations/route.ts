import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status');
    const where: any = { userId: user.id };
    if (status) where.status = status;

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, capacity: true, images: true } },
        equipmentSet: { select: { name: true } },
      },
    });

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error('Failed to fetch reservations:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
