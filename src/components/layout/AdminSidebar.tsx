'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Backpack,
  Package,
  CalendarDays,
  Settings,
  MoreHorizontal,
  X,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  emoji: string;
}

const menuItems: MenuItem[] = [
  { label: '대시보드', href: '/admin', icon: <LayoutDashboard className="size-5" />, emoji: '📊' },
  { label: '예약관리', href: '/admin/reservations', icon: <ClipboardList className="size-5" />, emoji: '📋' },
  { label: '세트관리', href: '/admin/sets', icon: <Backpack className="size-5" />, emoji: '🎒' },
  { label: '상품관리', href: '/admin/products', icon: <Package className="size-5" />, emoji: '📦' },
  { label: '공휴일관리', href: '/admin/holidays', icon: <CalendarDays className="size-5" />, emoji: '📅' },
  { label: '설정', href: '/admin/settings', icon: <Settings className="size-5" />, emoji: '⚙️' },
];

const mobileMainTabs = menuItems.slice(0, 4);
const mobileMoreItems = menuItems.slice(4);

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname.startsWith(href);
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-[220px] md:min-h-screen bg-moss text-white fixed left-0 top-0 bottom-0 z-40">
        <div className="px-4 py-5 border-b border-white/10">
          <Link href="/admin" className="text-lg font-bold tracking-tight">
            PackTrail Admin
          </Link>
        </div>

        <nav className="flex-1 py-3">
          {menuItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative',
                  active
                    ? 'bg-olive/15 text-white border-l-[3px] border-olive'
                    : 'text-white/70 hover:text-white hover:bg-white/5 border-l-[3px] border-transparent'
                )}
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-olive/30 flex items-center justify-center">
              <User className="size-4" />
            </div>
            <div className="text-xs">
              <div className="font-medium">관리자</div>
              <div className="text-white/50">Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {mobileMainTabs.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1 px-2 text-[10px] transition-colors min-w-0',
                  active ? 'text-moss font-semibold' : 'text-gray-400'
                )}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-1 px-2 text-[10px] transition-colors min-w-0',
              moreOpen || mobileMoreItems.some((i) => isActive(pathname, i.href))
                ? 'text-moss font-semibold'
                : 'text-gray-400'
            )}
          >
            <MoreHorizontal className="size-5" />
            <span>더보기</span>
          </button>
        </div>
      </nav>

      {/* Mobile "more" sheet */}
      {moreOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-50"
            onClick={() => setMoreOpen(false)}
          />
          <div className="md:hidden fixed bottom-14 left-0 right-0 bg-white rounded-t-xl border-t border-gray-200 z-50 p-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm">더보기</span>
              <button onClick={() => setMoreOpen(false)}>
                <X className="size-5 text-gray-400" />
              </button>
            </div>
            {mobileMoreItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors',
                    active ? 'bg-olive/10 text-moss font-medium' : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
