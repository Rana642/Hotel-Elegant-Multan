'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, CalendarDays, CalendarCheck, BedDouble, Settings,
  FileText, BarChart3, LogOut, X, Globe, Images, MoreHorizontal, MessageSquare, Ticket, Sparkles, Users, Filter, Megaphone,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type UserRole = 'admin' | 'receptionist';

// Inquiries UI is temporarily hidden — the pre-contact modal that fed it
// has been disabled on the public site (see ContactIntentButton), so no
// new inquiries are being captured. The pages + tables still exist; flip
// this to true to bring the nav entries back once the modal is re-enabled.
const INQUIRIES_ENABLED = false;

// Full nav — admins see everything.
const ADMIN_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  ...(INQUIRIES_ENABLED ? [{ href: '/admin/inquiries', label: 'Inquiries', icon: MessageSquare }] : []),
  { href: '/admin/contacts', label: 'Contacts', icon: Users },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { href: '/admin/promotions', label: 'Promotions', icon: Megaphone },
  { href: '/admin/rooms', label: 'Rooms', icon: BedDouble },
  { href: '/admin/gallery', label: 'Gallery', icon: Images },
  { href: '/admin/calendar', label: 'Availability', icon: CalendarCheck },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/funnel', label: 'Funnel', icon: Filter },
  { href: '/admin/google-hotels', label: 'Google Hotels', icon: Sparkles },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

// Receptionist nav — only the operational surfaces they're allowed on.
// Matches the RECEPTION_ALLOWED_PREFIXES list in lib/auth.ts.
const RECEPTIONIST_NAV = [
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  ...(INQUIRIES_ENABLED ? [{ href: '/admin/inquiries', label: 'Inquiries', icon: MessageSquare }] : []),
  { href: '/admin/contacts', label: 'Contacts', icon: Users },
  { href: '/admin/calendar', label: 'Availability', icon: CalendarCheck },
];

// Admin mobile primaries (bottom tab bar) — the rest live under "More".
const ADMIN_PRIMARY = [
  { href: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/admin/rooms', label: 'Rooms', icon: BedDouble },
  { href: '/admin/calendar', label: 'Calendar', icon: CalendarCheck },
];

interface Props {
  userRole: UserRole;
}

export default function AdminSidebar({ userRole }: Props) {
  const isReceptionist = userRole === 'receptionist';

  // Reception has so few items that we render ALL of them as primary tabs on
  // mobile — no "More" sheet needed. Admin keeps the split.
  const navItems     = isReceptionist ? RECEPTIONIST_NAV : ADMIN_NAV;
  const primaryTabs  = isReceptionist ? RECEPTIONIST_NAV : ADMIN_PRIMARY;
  const moreItems    = isReceptionist ? [] : ADMIN_NAV.filter((n) => !ADMIN_PRIMARY.some((p) => p.href === n.href));
  const pathname = usePathname();
  const router = useRouter();
  const hasMoreSheet = moreItems.length > 0;
  const [moreOpen, setMoreOpen] = useState(false);
  const [sheetIn, setSheetIn] = useState(false); // drives the slide via CSS transition (robust vs. keyframes)

  // Desktop sidebar collapse (icon-only rail). Persisted so it stays how the
  // admin left it. Starts expanded on the server render to avoid a hydration
  // mismatch, then snaps to the stored preference after mount.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(localStorage.getItem('he_admin_collapsed') === '1');
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem('he_admin_collapsed', next ? '1' : '0'); } catch { /* private mode */ }
      return next;
    });
  };

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
      {/* Header: logo (or icon when collapsed) + collapse toggle */}
      <div className={`border-b border-white/10 flex items-center ${collapsed ? 'flex-col gap-3 py-4 px-2' : 'justify-between gap-2 p-5'}`}>
        {collapsed ? (
          <img src="/icon.png" alt="Hotel Elegant" className="h-8 w-8 object-cover" />
        ) : (
          <div className="min-w-0">
            <img src="/logo.png" alt="Hotel Elegant Executive Suites Multan" className="h-11 w-auto object-contain mb-1" />
            <p className="text-[#E30613] text-xs font-montserrat font-semibold tracking-widest uppercase">
              Admin Panel
            </p>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="text-white/50 hover:text-white p-1.5 shrink-0 transition-colors"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <ul className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-3 text-sm font-montserrat font-medium transition-colors ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive(href) ? 'bg-[#E30613] text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          </li>
        ))}
      </ul>
      <div className="p-3 border-t border-white/10 space-y-1">
        <Link
          href="/"
          target="_blank"
          title={collapsed ? 'View Website' : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-montserrat text-white/80 hover:text-white transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <Globe size={16} className="shrink-0" /> {!collapsed && 'View Website'}
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-montserrat text-white/80 hover:text-white transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} className="shrink-0" /> {!collapsed && 'Sign Out'}
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar — frosted glass over the layout's gradient shell. */}
      <aside className={`hidden lg:flex ${collapsed ? 'w-16' : 'w-60'} bg-white/[0.06] backdrop-blur-2xl border-r border-white/10 min-h-screen flex-col shrink-0 transition-[width] duration-200`}>
        <DesktopNav />
      </aside>

      {/* ───────────────── Mobile: app-style header ───────────────── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#1A0B2E]/80 backdrop-blur-md text-white flex items-center justify-between px-4 shadow-lg"
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
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-md border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] flex items-stretch"
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
        {/* "More" sheet exists only when there are additional items to
            show — receptionist nav has none, so we render just their two
            primary tabs and skip the More button entirely. */}
        {hasMoreSheet && (
          <button
            onClick={openMore}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
              moreIsActive || moreOpen ? 'text-[#E30613]' : 'text-gray-400 active:text-gray-600'
            }`}
          >
            <MoreHorizontal size={22} strokeWidth={moreIsActive ? 2.5 : 2} />
            <span className="text-[10px] font-montserrat font-medium leading-none">More</span>
          </button>
        )}
      </nav>

      {/* ───────────────── Mobile: "More" bottom sheet ───────────────── */}
      {hasMoreSheet && moreOpen && (
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
