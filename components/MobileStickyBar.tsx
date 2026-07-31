'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Phone, BedDouble } from 'lucide-react';
import Link from 'next/link';
import ContactIntentButton from '@/app/_components/ContactIntentButton';
import { trackEvent } from '@/lib/analytics';

/**
 * Site-wide mobile sticky action bar — WhatsApp · Call · Book.
 *
 * Same shape as the LP-only StickyBar (which stays where it is to keep LP
 * attribution granular — its clicks carry lp_variant + location), but this
 * one is site-wide and doesn't require an LpVariantKey. Lives at the
 * bottom of every public page on mobile only (md:hidden) so the guest is
 * always one tap away from booking, on the surface that produces 70%+ of
 * hotel traffic.
 *
 * Not shown while the intent modal is open (would sit on top of it) — the
 * modal renders in its own portal at z-100, this bar is z-40, so the
 * modal already covers it visually. No JS coordination needed.
 *
 * Contact modal wrapping is preserved (via ContactIntentButton) so the
 * hashed Meta CAPI Lead still fires with a real guest name before the
 * WhatsApp/tel: handoff.
 */
export default function MobileStickyBar() {
  // Wait for mount before rendering to avoid a hydration flash on very
  // narrow desktop viewports the SSR guesses wrong for.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const btn =
    'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-white font-montserrat font-semibold text-[11px]';

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 flex md:hidden border-t border-black/10 shadow-[0_-2px_10px_rgba(0,0,0,0.12)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ContactIntentButton
        channel="whatsapp"
        ariaLabel="Chat on WhatsApp"
        className={`${btn} bg-[#25D366]`}
      >
        <MessageCircle size={18} />
        <span>WhatsApp</span>
      </ContactIntentButton>
      <ContactIntentButton
        channel="call"
        ariaLabel="Call the hotel"
        className={`${btn} bg-[#1A0B2E]`}
      >
        <Phone size={18} />
        <span>Call</span>
      </ContactIntentButton>
      <Link
        href="/booking"
        onClick={() => trackEvent('book_now_click', { location: 'mobile_sticky_bar' })}
        className={`${btn} bg-[#E30613]`}
      >
        <BedDouble size={18} />
        <span>Book</span>
      </Link>
    </div>
  );
}
