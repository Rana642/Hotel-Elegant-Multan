'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { Promotion } from '@/lib/promotions';

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
            className={`relative pb-3 font-montserrat text-sm font-semibold tracking-wide transition-colors ${
              i === active ? 'text-[#1A0B2E]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {p.title}
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
          <h2 className="font-playfair font-semibold text-3xl text-[#1A0B2E] mb-4">{promo.title}</h2>
          <p className="font-montserrat text-gray-600 leading-relaxed mb-8 whitespace-pre-line">
            {promo.description}
          </p>
          <Link href={promo.cta_href || '/booking'} className="btn-red inline-flex items-center gap-2 py-3.5 px-9">
            {promo.cta_label || 'Book Now'}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
