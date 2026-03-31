import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  capacity: z.number().int().positive().default(1),
  price1night: z.number().int().nonnegative(),
  price2night: z.number().int().nonnegative(),
  images: z.array(z.string()).default([]),
  includes: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const products = await prisma.product.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { reservations: true, sets: true } },
      },
    });

    return NextResponse.json({ products });
  } catch (err) {
    console.error('Admin products error:', err);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = CreateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, description, capacity, price1night, price2night, images, includes, sortOrder, isActive } = parsed.data;
    const product = await prisma.product.create({
      data: { name, description, capacity, price1night, price2night, images, includes, sortOrder, isActive },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error('Admin create product error:', err);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
