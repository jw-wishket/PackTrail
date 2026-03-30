import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  // Placeholder for Korean Astronomy API sync (Task 17)
  return NextResponse.json({
    success: true,
    message: 'Holiday sync placeholder — actual API integration in Task 17',
    synced: 0,
  });
}
