'use client';

import { useRef, useState } from 'react';
import { Info, X, Wallet, BadgeCheck, Wifi, ParkingCircle, Coffee, Clock, ShieldCheck } from 'lucide-react';
import Popover from './Popover';

// Why guests are better off booking with us directly vs. an OTA — grounded in
// the hotel's real amenities.
const BENEFITS = [
  { icon: Wallet, text: 'Book now & pay at the hotel — no advance payment' },
  { icon: BadgeCheck, text: 'Best direct rate — no OTA markup or hidden fees' },
  { icon: Coffee, text: 'Free breakfast with every stay' },
  { icon: Wifi, text: 'Free high-speed WiFi in all areas' },
  { icon: ParkingCircle, text: 'Free on-site parking' },
  { icon: Clock, text: '24-hour reception & check-in — arrive any time' },
  { icon: ShieldCheck, text: '24/7 CCTV security' },
];

export default function WhyBookDirect({ className = '' }: { className?: string }) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={className || 'inline-flex items-center gap-1.5 text-xs font-montserrat font-medium'}
      >
        <Info size={13} />
        Why Book Direct?
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} desktopWidth={300} className="bg-white border border-gray-200 shadow-2xl">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-playfair font-semibold text-base text-[#1A0B2E]">Why Book Direct?</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-gray-400 hover:text-[#1A0B2E]">
              <X size={16} />
            </button>
          </div>
          <ul className="space-y-2.5">
            {BENEFITS.map((b) => (
              <li key={b.text} className="flex items-start gap-2.5">
                <b.icon size={16} className="text-[#E30613] mt-0.5 shrink-0" />
                <span className="font-montserrat text-sm text-gray-700 leading-snug">{b.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </Popover>
    </>
  );
}
