'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase.from('users').select('role').eq('id', data.user.id).single()
          .then(({ data: profile }) => setIsAdmin(profile?.role === 'ADMIN'));
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from('users').select('role').eq('id', session.user.id).single()
          .then(({ data: profile }) => setIsAdmin(profile?.role === 'ADMIN'));
      } else {
        setIsAdmin(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/products', label: '장비 소개' },
    { href: '/#how-it-works', label: '이용 방법' },
    { href: '/#reviews', label: '후기' },
  ];

  return (
    <nav className="bg-moss">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo + Desktop Nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-extrabold text-olive">
              PackTrail
            </Link>
            <div className="hidden md:flex items-center gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-sm text-cream/70 hover:text-cream transition-colors',
                    pathname === link.href && 'text-cream font-semibold border-b-2 border-olive pb-0.5'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {isAdmin && (
                  <Link href="/admin" className="text-sm text-cream/70 hover:text-cream font-medium">
                    관리자
                  </Link>
                )}
                <Link href="/my" className="text-sm text-cream/70 hover:text-cream">
                  마이페이지
                </Link>
                <Link
                  href="/my"
                  className="w-8 h-8 bg-olive rounded-full flex items-center justify-center text-sm text-white font-bold"
                >
                  {user.user_metadata?.name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                </Link>
                <button onClick={handleLogout} className="text-sm text-cream/50 hover:text-cream">
                  로그아웃
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="text-sm text-cream/70 hover:text-cream">
                로그인
              </Link>
            )}
            <Link
              href="/products"
              className="text-sm bg-olive text-white px-4 py-1.5 rounded-md font-semibold hover:bg-olive/90 transition-colors"
            >
              예약하기
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-3">
            {user ? (
              <Link
                href="/my"
                className="w-7 h-7 bg-olive rounded-full flex items-center justify-center text-xs text-white font-bold"
              >
                {user.user_metadata?.name?.[0] || 'U'}
              </Link>
            ) : (
              <Link href="/auth/login" className="text-sm text-cream/70">
                로그인
              </Link>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="w-11 h-11 flex items-center justify-center text-cream/70">
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center min-h-[44px] text-sm text-cream/70 hover:text-cream"
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <>
                <Link
                  href="/my"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center min-h-[44px] text-sm text-cream/70 hover:text-cream"
                >
                  마이페이지
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center min-h-[44px] text-sm text-cream/70 hover:text-cream"
                  >
                    관리자
                  </Link>
                )}
                <button
                  onClick={() => { setMobileOpen(false); handleLogout(); }}
                  className="flex items-center min-h-[44px] w-full text-sm text-cream/50 hover:text-cream"
                >
                  로그아웃
                </button>
              </>
            )}
            <Link
              href="/products"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center min-h-[44px] text-sm bg-olive text-white text-center rounded-md font-semibold mt-2"
            >
              예약하기
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
