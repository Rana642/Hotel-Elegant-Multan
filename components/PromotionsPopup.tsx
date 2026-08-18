'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Tag, X, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface SlimPromo {
  slug: string;
  title: string;
  tagline: string | null;
  badge: string | null;
  image_url: string | null;
  cta_label: string;
  cta_href: string;
}

/**
 * Floating, collapsible "Special Offers" widget pinned to the left edge
 * (item 8). Collapsed → a vertical tab; expanded → a mini carousel of active
 * promotions with a link to the full /promotions page. Desktop only: on
 * phones the Continue-booking prompt + sticky action bar already own the
 * bottom of the screen, so a second floating widget there would be clutter.
 */
const COLLAPSE_KEY = 'he_promos_collapsed';
const DISMISS_KEY = 'he_promos_dismissed';

export default function PromotionsPopup() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [promos, setPromos] = useState<SlimPromo[]>([]);
  const [index, setIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    let cancelled = false;
    fetch('/api/promotions')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SlimPromo[]) => { if (!cancelled) setPromos(Array.isArray(data) ? data : []); })
      .catch(() => { /* offline / not migrated — just don't show the widget */ });
    return () => { cancelled = true; };
  }, []);

  if (!mounted || dismissed || promos.length === 0) return null;
  // Redundant on the Promotions page itself.
  if (pathname.startsWith('/promotions')) return null;

  const setCollapse = (v: boolean) => {
    localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0');
    setCollapsed(v);
  };
  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const wrap = 'hidden lg:block fixed left-0 top-1/2 -translate-y-1/2 z-40';

  if (collapsed) {
    return (
      <div className={wrap}>
        <button
          type="button"
          onClick={() => setCollapse(false)}
          className="flex items-center gap-2 bg-[#1A0B2E] text-white pl-2.5 pr-2 py-4 rounded-r-lg shadow-xl hover:bg-[#2a1147] transition-colors"
          aria-label="Show special offers"
        >
          <Tag size={16} className="text-[#E30613]" />
          <span className="font-montserrat font-semibold text-xs tracking-widest uppercase" style={{ writingMode: 'vertical-rl' }}>
            Offers
          </span>
        </button>
      </div>
    );
  }

  const promo = promos[index % promos.length];

  return (
    <div className={wrap}>
      <div className="w-72 bg-white rounded-r-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#1A0B2E] px-3 py-2.5">
          <p className="font-montserrat font-semibold text-sm text-white flex items-center gap-2">
            <Tag size={15} className="text-[#E30613]" /> Special Offers
          </p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setCollapse(true)} aria-label="Collapse" className="w-6 h-6 flex items-center justify-center text-white/70 hover:text-white">
              <ChevronLeft size={17} />
            </button>
            <button type="button" onClick={dismiss} aria-label="Dismiss" className="w-6 h-6 flex items-center justify-center text-white/70 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Current promo */}
        <div className="relative h-32 bg-gray-100">
          {promo.image_url && (
            // Plain img (not next/image) so admin-set arbitrary URLs work
            // without domain config.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={promo.image_url} alt={promo.title} className="w-full h-full object-cover" />
          )}
          {promo.badge && (
            <span className="absolute top-2 left-0 bg-[#E30613] text-white text-[10px] font-montserrat font-semibold tracking-widest uppercase px-2 py-0.5">
              {promo.badge}
            </span>
          )}
        </div>

        <div className="px-4 py-3">
          {promo.tagline && (
            <p className="font-montserrat text-[#E30613] text-[10px] font-semibold tracking-widest uppercase mb-1">{promo.tagline}</p>
          )}
          <p className="font-playfair font-semibold text-base text-[#1A0B2E] leading-snug mb-3">{promo.title}</p>

          <Link href={promo.cta_href || '/booking'} className="btn-red w-full flex items-center justify-center gap-2 py-2.5 text-xs">
            {promo.cta_label || 'Book Now'}
            <ArrowRight size={13} />
          </Link>

          {/* Carousel controls */}
          {promos.length > 1 && (
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={() => setIndex((i) => (i - 1 + promos.length) % promos.length)}
                className="p-1 text-gray-400 hover:text-[#1A0B2E]"
                aria-label="Previous offer"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1.5">
                {promos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Offer ${i + 1}`}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index % promos.length ? 'bg-[#E30613]' : 'bg-gray-300'}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIndex((i) => (i + 1) % promos.length)}
                className="p-1 text-gray-400 hover:text-[#1A0B2E]"
                aria-label="Next offer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <Link href="/promotions" className="block text-center mt-2 font-montserrat text-[11px] text-gray-500 hover:text-[#E30613] underline">
            See all offers
          </Link>
        </div>
      </div>
    </div>
  );
}
