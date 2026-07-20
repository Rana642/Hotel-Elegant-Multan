'use client';

import { MessageCircle, Phone, BedDouble } from 'lucide-react';
import { WhatsAppCta, CallCta, BookCta } from './LpCtas';
import { HOTEL_PHONE_DISPLAY, type LpVariantKey } from '@/lib/lpConfig';

/**
 * Fixed bottom CTA bar — mobile only. Most Multan ad traffic is on a phone, so
 * WhatsApp / Call / Book stay one tap away at all times. The page adds bottom
 * padding (pb-16 md:pb-0) so this never covers content.
 */
export default function StickyBar({ variant }: { variant: LpVariantKey }) {
  const btn =
    'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-white font-montserrat font-semibold text-xs';

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex md:hidden border-t border-black/10 shadow-[0_-2px_10px_rgba(0,0,0,0.12)]">
      <WhatsAppCta
        variant={variant}
        location="sticky_bar"
        className={`${btn} bg-[#25D366]`}
      >
        <MessageCircle size={18} />
        <span>WhatsApp</span>
      </WhatsAppCta>
      <CallCta
        variant={variant}
        location="sticky_bar"
        className={`${btn} bg-[#1A0B2E]`}
      >
        <Phone size={18} />
        <span>Call</span>
      </CallCta>
      <BookCta
        variant={variant}
        location="sticky_bar"
        className={`${btn} bg-[#E30613]`}
      >
        <BedDouble size={18} />
        <span>Book</span>
      </BookCta>
    </div>
  );
}
