'use client';

import { Zap } from 'lucide-react';
import DealCountdown from '@/components/DealCountdown';

/** "Deal starts soon" teaser for the reservations room list — shown when a
 *  deal is otherwise eligible (room, dates, lead-time, weekday all match)
 *  but its daily window hasn't opened yet, so no room card is showing it
 *  live. Lets the guest know to come back / wait for the discount. */
export default function UpcomingDealBanner({
  name,
  discountPct,
  startTime,
  endTime,
  weekdays,
}: {
  name: string;
  discountPct: number;
  startTime: string;
  endTime: string;
  weekdays: number[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-[#1A0B2E] via-[#2a1247] to-[#1A0B2E] text-white px-4 py-3 border border-white/10 shadow-lg">
      <div className="flex items-center gap-2 shrink-0">
        <Zap size={18} className="text-[#E30613] drop-shadow" />
        <p className="font-playfair font-bold text-sm sm:text-base leading-tight">
          {name} — {discountPct}% off coming soon
        </p>
      </div>
      <DealCountdown
        startTime={startTime}
        endTime={endTime}
        weekdays={weekdays}
        variant="light"
        className="ml-auto"
      />
    </div>
  );
}
