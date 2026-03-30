import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  capacity: z.number().int().positive().optional(),
  price1night: z.number().int().nonnegative().optional(),
  price2night: z.number().int().nonnegative().optional(),
  images: z.array(z.string()).optional(),
  includes: z.array(z.string()).optional(),
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
    const productId = Number(id);

    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = UpdateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: parsed.data,
    });

    return NextResponse.json({ product });
  } catch (err) {
    console.error('Admin update product error:', err);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
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
    const productId = Number(id);

    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });

    return NextResponse.json({ product });
  } catch (err) {
    console.error('Admin delete product error:', err);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
