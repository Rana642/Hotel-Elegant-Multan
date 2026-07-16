'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, CalendarDays, BedDouble, Settings,
  FileText, BarChart3, LogOut, Menu, X, Globe,
} from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/admin/rooms', label: 'Rooms', icon: BedDouble },
  { href: '/admin/calendar', label: 'Availability', icon: CalendarDays },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  const NavContent = () => (
    <nav className="flex flex-col h-full">
      <div className="p-6 border-b border-white/15">
        <img src="/logo.png" alt="Hotel Elegant Executive Suites Multan" className="h-12 w-auto object-contain mb-1" />
        <p className="text-[#E30613] text-xs font-montserrat font-semibold tracking-widest uppercase">
          Admin Panel
        </p>
      </div>

      <ul className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-montserrat font-medium transition-colors ${
                  active
                    ? 'bg-[#E30613] text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="p-4 border-t border-white/15 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-4 py-2.5 text-sm font-montserrat text-white/80 hover:text-white transition-colors"
        >
          <Globe size={16} />
          View Website
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-montserrat text-white/80 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-[#1A0B2E] min-h-screen flex-col shrink-0">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#1A0B2E] flex items-center justify-between px-4 py-3 shadow-lg">
        <p className="font-playfair text-white font-semibold">Admin Panel</p>
        <button onClick={() => setOpen(!open)} className="text-white">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-[#1A0B2E] flex flex-col">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
