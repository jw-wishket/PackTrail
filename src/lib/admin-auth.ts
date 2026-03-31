import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Cache admin role checks for 5 minutes
const roleCache = new Map<string, { role: string; expiresAt: number }>();
const ROLE_CACHE_TTL = 5 * 60 * 1000;

export async function requireAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }

  // Check cache first
  const cached = roleCache.get(user.id);
  if (cached && Date.now() < cached.expiresAt) {
    if (cached.role !== 'ADMIN') {
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
    }
    return { error: null, user };
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  const role = profile?.role || 'USER';
  roleCache.set(user.id, { role, expiresAt: Date.now() + ROLE_CACHE_TTL });

  if (role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  }

  return { error: null, user };
}
