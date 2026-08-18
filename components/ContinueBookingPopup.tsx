'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Users, BedDouble, X, ChevronRight } from 'lucide-react';
import { readBookingIntent, BOOKING_INTENT_EVENT, type BookingIntent } from '@/lib/bookingIntent';

/**
 * "Continue your Booking" — a white, frosted-glass prompt (purple text) that
 * reappears with the guest's last-searched dates so they can resume an
 * unfinished booking. Reads the intent saved by the search bar / booking form;
 * the thank-you page clears it once a booking completes.
 *
 * Top-right on desktop (tucked under the fixed header, flush to the right
 * edge). On phones the header's menu button owns the top-right, so there it
 * sits above the mobile sticky bar instead.
 */
const DISMISS_KEY = 'he_continue_dismissed';

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

  useEffect(() => {
    setMounted(true);
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    const refresh = () => setIntent(readBookingIntent());
    refresh();
    window.addEventListener(BOOKING_INTENT_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(BOOKING_INTENT_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => { setIntent(readBookingIntent()); }, [pathname]);

  if (!mounted || !intent || dismissed) return null;
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

  return (
    <div className="fixed z-40 left-3 right-3 bottom-20 lg:left-auto lg:right-0 lg:bottom-auto lg:top-[84px] lg:w-72">
      <div className="relative bg-white/90 backdrop-blur-md text-[#1A0B2E] border border-black/5 ring-1 ring-black/5 shadow-2xl overflow-hidden">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-[#1A0B2E]/40 hover:text-[#1A0B2E] z-10"
        >
          <X size={15} />
        </button>

        <Link href={resumeHref} className="block px-4 py-3 pr-9 group">
          <p className="flex items-center gap-1.5 font-montserrat font-semibold text-sm text-[#1A0B2E]">
            Continue your Booking
            <ChevronRight size={15} className="text-[#E30613] transition-transform group-hover:translate-x-0.5" />
          </p>

          {intent.roomName && (
            <p className="flex items-center gap-1.5 text-[#1A0B2E]/85 text-xs mt-1.5">
              <BedDouble size={12} className="text-[#E30613] shrink-0" />
              <span className="truncate">{intent.roomName}</span>
            </p>
          )}
          <p className="flex items-center gap-1.5 text-[#1A0B2E] text-sm mt-1">
            <CalendarDays size={13} className="text-[#E30613] shrink-0" />
            {fmt(intent.checkIn)} — {fmt(intent.checkOut)}
            {nights > 0 && <span className="text-[#1A0B2E]/50">· {nights} night{nights !== 1 ? 's' : ''}</span>}
          </p>
          <p className="flex items-center gap-1.5 text-[#1A0B2E]/75 text-xs mt-1">
            <Users size={12} className="text-[#E30613] shrink-0" />
            {intent.adults} adult{intent.adults !== 1 ? 's' : ''}
            {intent.children > 0 && ` · ${intent.children} child${intent.children !== 1 ? 'ren' : ''}`}
          </p>
          <p className="text-[#1A0B2E]/50 text-[11px] mt-1.5">No payment now — confirm on WhatsApp</p>
        </Link>
      </div>
    </div>
  );
}
