'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, Tag, CalendarClock, Moon } from 'lucide-react';
import type { Promotion } from '@/lib/promotions';
import DealCountdown from '@/components/DealCountdown';

/** Plain-English label for the promotion's "when does it apply?" rule
 *  (mirrors the admin's dropdown), or null when there's none set. */
function ruleLabel(p: Promotion): string | null {
  if (p.lead_time_type === 'early_bird' && p.lead_time_days > 0) {
    return `Book ${p.lead_time_days}+ day${p.lead_time_days === 1 ? '' : 's'} before check-in`;
  }
  if (p.lead_time_type === 'last_minute' && p.lead_time_days > 0) {
    return `Book within ${p.lead_time_days} day${p.lead_time_days === 1 ? '' : 's'} of check-in`;
  }
  if (p.min_nights > 1) {
    return `Stay ${p.min_nights}+ nights`;
  }
  return null;
}

/**
 * Tabbed offers browser (item 7): a row of tab buttons across the top, one
 * offer shown at a time below — image + title + description + Book Now.
 * Guests move between offers by tapping a tab.
 */
export default function PromotionTabs({ promotions }: { promotions: Promotion[] }) {
  const [active, setActive] = useState(0);
  const promo = promotions[active];
  if (!promo) return null;

  return (
    <div>
      {/* Tab strip */}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 border-b border-gray-200 mb-10">
        {promotions.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActive(i)}
            className={`relative flex items-center gap-1.5 pb-3 font-montserrat text-sm font-semibold tracking-wide transition-colors ${
              i === active ? 'text-[#1A0B2E]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {p.title}
            {p.discount_percent > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 ${i === active ? 'bg-[#E30613] text-white' : 'bg-gray-100 text-gray-500'}`}>
                {Math.round(p.discount_percent)}%
              </span>
            )}
            {i === active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#E30613]" />}
          </button>
        ))}
      </div>

      {/* Active offer */}
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center max-w-5xl mx-auto">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 order-1 md:order-none">
          {promo.image_url ? (
            <Image
              src={promo.image_url}
              alt={promo.title}
              fill
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 font-playfair text-2xl">
              {promo.title}
            </div>
          )}
          {promo.badge && (
            <span className="absolute top-4 left-0 bg-[#E30613] text-white text-[11px] font-montserrat font-semibold tracking-widest uppercase px-3 py-1">
              {promo.badge}
            </span>
          )}
        </div>

        <div>
          {promo.tagline && (
            <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
              {promo.tagline}
            </p>
          )}
          <h2 className="font-playfair font-semibold text-3xl text-[#1A0B2E] mb-3">{promo.title}</h2>

          {/* Discount % + rule chips — mirrors the Automatic Discount block
              set in the admin dashboard. Hidden entirely when the promo is
              marketing-only (no discount configured). */}
          {promo.discount_percent > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-[#E30613] text-white font-montserrat font-bold text-sm px-3 py-1.5">
                <Tag size={14} /> {Math.round(promo.discount_percent)}% OFF
              </span>
              {ruleLabel(promo) && (
                <span className="inline-flex items-center gap-1.5 bg-[#1A0B2E]/[0.06] text-[#1A0B2E] border border-[#1A0B2E]/15 font-montserrat text-xs font-semibold px-2.5 py-1.5">
                  <CalendarClock size={13} /> {ruleLabel(promo)}
                </span>
              )}
              {!promo.refundable && (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 font-montserrat text-xs font-semibold px-2.5 py-1.5">
                  <Moon size={13} /> Non-refundable
                </span>
              )}
              <DealCountdown
                startTime={promo.start_time}
                endTime={promo.end_time}
                weekdays={promo.weekdays}
                variant="dark"
              />
            </div>
          )}

          <p className="font-montserrat text-gray-600 leading-relaxed mb-6 whitespace-pre-line">
            {promo.description}
          </p>

          {promo.benefits && promo.benefits.length > 0 && (
            <ul className="mb-6 space-y-1.5">
              {promo.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 font-montserrat text-sm text-gray-700">
                  <Check size={15} className="text-green-600 shrink-0 mt-0.5" /> {b}
                </li>
              ))}
            </ul>
          )}

          <Link href={promo.cta_href || '/reservations'} className="btn-red inline-flex items-center gap-2 py-3.5 px-9">
            {promo.cta_label || 'Book Now'}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
