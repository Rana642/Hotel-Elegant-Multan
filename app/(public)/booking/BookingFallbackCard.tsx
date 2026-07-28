'use client';

import { MessageCircle, Phone } from 'lucide-react';
import ContactIntentButton from '@/app/_components/ContactIntentButton';

// Callout that sits above the booking form for guests who'd rather message
// than fill 8 fields. Same intent-capture modal fires on click, so even a
// WhatsApp-preferred booker leaves us a named Lead with attribution intact
// — exactly the traffic we were losing before this component existed.

export default function BookingFallbackCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-playfair font-semibold text-[#1A0B2E] text-base sm:text-lg leading-tight">
            Form ka janjhat pasand nahi?
          </p>
          <p className="font-montserrat text-gray-500 text-xs sm:text-sm mt-1">
            Bas apna naam bata dein — WhatsApp par bookings faster confirm hoti hain, no advance payment.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <ContactIntentButton
            channel="whatsapp"
            ariaLabel="WhatsApp us instead of filling the form"
            waMessage="Hi Hotel Elegant! I'd like to book a room via WhatsApp."
            className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white font-montserrat font-semibold text-xs tracking-wider uppercase rounded hover:bg-green-600 transition-colors"
          >
            <MessageCircle size={14} /> WhatsApp
          </ContactIntentButton>
          <ContactIntentButton
            channel="call"
            ariaLabel="Call the hotel"
            className="flex items-center gap-2 px-4 py-2.5 border border-[#1A0B2E] text-[#1A0B2E] font-montserrat font-semibold text-xs tracking-wider uppercase rounded hover:bg-[#1A0B2E] hover:text-white transition-colors"
          >
            <Phone size={14} /> Call
          </ContactIntentButton>
        </div>
      </div>
    </div>
  );
}
