'use client';

import { Phone, MessageCircle } from 'lucide-react';
import ContactIntentButton from '@/app/_components/ContactIntentButton';

// Site-wide floating quick-contact buttons. Wrapped in the intent-capture
// modal so every click leaves us a named lead (with attribution preserved
// via sessionStorage) before the guest hops to wa.me / tel:. This is the
// single highest-traffic contact path on the site — floating on every
// page — so leaving it as a direct link cost us most of our real inquiries.

export default function FloatingButtons() {
  // Desktop only — mobile uses the full-width MobileStickyBar which puts the
  // same actions at the bottom of the viewport. Two floating stacks + a
  // sticky bar would double-up in the bottom-right corner on phones.
  return (
    <div className="fixed bottom-6 right-4 z-50 hidden md:flex flex-col gap-3">
      <ContactIntentButton
        channel="whatsapp"
        ariaLabel="Chat on WhatsApp"
        className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
      >
        <MessageCircle size={22} />
      </ContactIntentButton>
      <ContactIntentButton
        channel="call"
        ariaLabel="Call us"
        className="w-12 h-12 rounded-full bg-[#E30613] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
      >
        <Phone size={20} />
      </ContactIntentButton>
    </div>
  );
}
