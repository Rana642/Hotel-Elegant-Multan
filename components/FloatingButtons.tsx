'use client';

import { Phone, MessageCircle } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

export default function FloatingButtons() {
  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-3">
      <a
        href="https://wa.me/923173330998"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        onClick={() => trackEvent('whatsapp_click', { location: 'floating_button' })}
        className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center
                   shadow-lg hover:scale-110 transition-transform"
      >
        <MessageCircle size={22} />
      </a>
      <a
        href="tel:+923173330998"
        aria-label="Call us"
        onClick={() => trackEvent('call_click', { location: 'floating_button' })}
        className="w-12 h-12 rounded-full bg-[#E30613] text-white flex items-center justify-center
                   shadow-lg hover:scale-110 transition-transform"
      >
        <Phone size={20} />
      </a>
    </div>
  );
}
