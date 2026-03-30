import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { createReservation, SoldOutError, BlockConflictError } from '@/lib/booking-engine';

const CreateReservationSchema = z.object({
  productId: z.number().int().positive(),
  rentalType: z.enum(['ONE_NIGHT', 'TWO_NIGHT']),
  useStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deliveryAddress: z.string().optional(),
  deliveryMemo: z.string().optional(),
  totalPrice: z.number().int().positive(),
  options: z.array(z.object({
    optionId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    priceAtOrder: z.number().int().nonneg(),
  })).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await createReservation({
      userId: user.id,
      productId: parsed.data.productId,
      rentalType: parsed.data.rentalType,
      useStartDate: new Date(parsed.data.useStartDate),
      totalPrice: parsed.data.totalPrice,
      deliveryAddress: parsed.data.deliveryAddress,
      deliveryMemo: parsed.data.deliveryMemo,
      options: parsed.data.options,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SoldOutError) {
      return NextResponse.json({ error: 'SOLD_OUT' }, { status: 409 });
    }
    if (error instanceof BlockConflictError) {
      return NextResponse.json({ error: 'BLOCK_CONFLICT' }, { status: 409 });
    }
    console.error('Failed to create reservation:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}
