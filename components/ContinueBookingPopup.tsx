'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Users, BedDouble, X, ChevronDown, ArrowRight } from 'lucide-react';
import { readBookingIntent, BOOKING_INTENT_EVENT, type BookingIntent } from '@/lib/bookingIntent';

/**
 * "Continue your booking" — a collapsible floating prompt that reappears with
 * the guest's last-searched dates so they can resume a booking they started
 * but didn't finish. Reads the intent saved by the search bar / booking form
 * (lib/bookingIntent); the thank-you page clears the intent once a booking
 * completes, so a converted guest never sees this.
 *
 * Placement avoids the existing floating UI: bottom-left on desktop (the
 * WhatsApp/Call stack is bottom-right), and above the mobile sticky bar on
 * phones.
 */
const DISMISS_KEY = 'he_continue_dismissed';   // per-session hide (X)
const COLLAPSE_KEY = 'he_continue_collapsed';  // persisted minimise pref

function fmt(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function nightsBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400000);
}

export default function ContinueBookingPopup() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [intent, setIntent] = useState<BookingIntent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    const refresh = () => setIntent(readBookingIntent());
    refresh();
    window.addEventListener(BOOKING_INTENT_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(BOOKING_INTENT_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Re-read on route change — the intent may have just been written (or
  // cleared, on the thank-you page) during this navigation.
  useEffect(() => { setIntent(readBookingIntent()); }, [pathname]);

  if (!mounted || !intent || dismissed) return null;
  // Hide where it would be noise: the booking form itself and the
  // confirmation page.
  if (pathname.startsWith('/booking') || pathname.startsWith('/thank-you')) return null;

  const nights = nightsBetween(intent.checkIn, intent.checkOut);
  const params = new URLSearchParams({
    checkIn: intent.checkIn,
    checkOut: intent.checkOut,
    adults: String(intent.adults),
    children: String(intent.children),
  });
  if (intent.roomId) params.set('roomId', intent.roomId);
  const resumeHref = `/booking?${params.toString()}`;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };
  const setCollapse = (v: boolean) => {
    localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0');
    setCollapsed(v);
  };

  const wrap = 'fixed z-40 left-3 right-3 bottom-20 sm:left-4 sm:right-auto sm:bottom-6 sm:w-80';

  // Collapsed → a small tab that expands on tap.
  if (collapsed) {
    return (
      <div className={wrap}>
        <button
          type="button"
          onClick={() => setCollapse(false)}
          className="w-full sm:w-auto flex items-center gap-2 bg-[#1A0B2E] text-white px-4 py-3 rounded-full shadow-xl hover:bg-[#2a1147] transition-colors"
        >
          <CalendarDays size={16} className="text-[#E30613]" />
          <span className="font-montserrat font-semibold text-sm">Continue your booking</span>
          <ArrowRight size={15} className="ml-auto sm:ml-1" />
        </button>
      </div>
    );
  }

  return (
    <div className={wrap}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#1A0B2E] px-4 py-2.5">
          <p className="font-montserrat font-semibold text-sm text-white">Continue your booking</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCollapse(true)}
              aria-label="Minimise"
              className="w-6 h-6 flex items-center justify-center text-white/70 hover:text-white"
            >
              <ChevronDown size={17} />
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="w-6 h-6 flex items-center justify-center text-white/70 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2">
          {intent.roomName && (
            <div className="flex items-center gap-2 text-sm font-montserrat text-[#1A0B2E]">
              <BedDouble size={15} className="text-[#E30613] shrink-0" />
              <span className="font-semibold truncate">{intent.roomName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm font-montserrat text-gray-700">
            <CalendarDays size={15} className="text-[#E30613] shrink-0" />
            <span>
              {fmt(intent.checkIn)} — {fmt(intent.checkOut)}
              {nights > 0 && <span className="text-gray-400"> · {nights} night{nights !== 1 ? 's' : ''}</span>}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm font-montserrat text-gray-700">
            <Users size={15} className="text-[#E30613] shrink-0" />
            <span>
              {intent.adults} adult{intent.adults !== 1 ? 's' : ''}
              {intent.children > 0 && ` · ${intent.children} child${intent.children !== 1 ? 'ren' : ''}`}
            </span>
          </div>
          <Link
            href={resumeHref}
            className="btn-red w-full flex items-center justify-center gap-2 py-2.5 mt-1 text-xs"
          >
            Continue
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
