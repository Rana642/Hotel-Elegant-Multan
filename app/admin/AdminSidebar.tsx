'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, CalendarDays, CalendarCheck, BedDouble, Settings,
  FileText, BarChart3, LogOut, X, Globe, Images, MoreHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Full list (desktop sidebar)
const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/admin/rooms', label: 'Rooms', icon: BedDouble },
  { href: '/admin/gallery', label: 'Gallery', icon: Images },
  { href: '/admin/calendar', label: 'Availability', icon: CalendarCheck },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

// The 4 primary tabs shown in the mobile bottom bar; the rest live under "More".
const primaryTabs = [
  { href: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/admin/rooms', label: 'Rooms', icon: BedDouble },
  { href: '/admin/calendar', label: 'Calendar', icon: CalendarCheck },
];
const moreItems = navItems.filter((n) => !primaryTabs.some((p) => p.href === n.href));

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [sheetIn, setSheetIn] = useState(false); // drives the slide via CSS transition (robust vs. keyframes)

  // Mount the sheet, then flip to the "in" position on the next tick so the
  // transition runs. setTimeout (not rAF) so it still resolves in background
  // tabs — the resting target is always translate-y-0 (visible), regardless of
  // whether the animation itself plays.
  const openMore = () => {
    setMoreOpen(true);
    setTimeout(() => setSheetIn(true), 10);
  };
  const closeMore = () => {
    setSheetIn(false);
    setTimeout(() => setMoreOpen(false), 200);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const currentTitle =
    navItems.find((n) => isActive(n.href))?.label || 'Admin';
  const moreIsActive = moreItems.some((n) => isActive(n.href));

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  // ─────────────────────────── Desktop sidebar ───────────────────────────
  const DesktopNav = () => (
    <nav className="flex flex-col h-full">
      <div className="p-6 border-b border-white/15">
        <img src="/logo.png" alt="Hotel Elegant Executive Suites Multan" className="h-12 w-auto object-contain mb-1" />
        <p className="text-[#E30613] text-xs font-montserrat font-semibold tracking-widest uppercase">
          Admin Panel
        </p>
      </div>
      <ul className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-montserrat font-medium transition-colors ${
                isActive(href) ? 'bg-[#E30613] text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="p-4 border-t border-white/15 space-y-2">
        <Link href="/" target="_blank" className="flex items-center gap-3 px-4 py-2.5 text-sm font-montserrat text-white/80 hover:text-white transition-colors">
          <Globe size={16} /> View Website
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-montserrat text-white/80 hover:text-white transition-colors">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-[#1A0B2E] min-h-screen flex-col shrink-0">
        <DesktopNav />
      </aside>

      {/* ───────────────── Mobile: app-style header ───────────────── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#1A0B2E] text-white flex items-center justify-between px-4 shadow-lg"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-2.5 h-14">
          <img src="/icon.png" alt="" className="h-8 w-8 rounded-lg object-cover" />
          <div className="leading-tight">
            <p className="font-playfair font-semibold text-base">{currentTitle}</p>
            <p className="text-[9px] font-montserrat tracking-widest uppercase text-[#E30613]">Admin Panel</p>
          </div>
        </div>
        <Link href="/" target="_blank" aria-label="View website" className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors">
          <Globe size={17} />
        </Link>
      </header>

      {/* ───────────────── Mobile: bottom tab bar ───────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {primaryTabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                active ? 'text-[#E30613]' : 'text-gray-400 active:text-gray-600'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-montserrat font-medium leading-none">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={openMore}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
            moreIsActive || moreOpen ? 'text-[#E30613]' : 'text-gray-400 active:text-gray-600'
          }`}
        >
          <MoreHorizontal size={22} strokeWidth={moreIsActive ? 2.5 : 2} />
          <span className="text-[10px] font-montserrat font-medium leading-none">More</span>
        </button>
      </nav>

      {/* ───────────────── Mobile: "More" bottom sheet ───────────────── */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${sheetIn ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeMore}
          />
          <div
            className={`absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-200 ease-out ${
              sheetIn ? 'translate-y-0' : 'translate-y-full'
            }`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="relative flex items-center justify-between px-5 pt-4 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-200 absolute left-1/2 -translate-x-1/2 top-2" />
              <p className="font-playfair font-semibold text-lg text-[#1A0B2E] mt-1">Menu</p>
              <button onClick={closeMore} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 px-4 py-3">
              {moreItems.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMore}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-colors ${
                      active ? 'border-[#E30613] bg-red-50 text-[#E30613]' : 'border-gray-100 bg-gray-50 text-gray-600 active:bg-gray-100'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-xs font-montserrat font-medium">{label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-gray-100 px-4 py-3 space-y-1">
              <Link href="/" target="_blank" onClick={closeMore} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-montserrat text-gray-700 active:bg-gray-100">
                <Globe size={18} className="text-gray-400" /> View Website
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-montserrat text-red-600 active:bg-red-50">
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
