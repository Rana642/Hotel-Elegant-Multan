'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Tag, X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

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
 * "Promotions" widget pinned to the TOP-LEFT (under the fixed header): a red
 * vertical "Promotions" tab on the left edge attached to a white, frosted-glass
 * panel (matching the Continue-booking popup) with a badge, the current offer,
 * prev / pause / next carousel controls, an "n/total" counter and a "More
 * info" link. Auto-advances every 6s (pausable). Desktop only — on phones the
 * Continue-booking prompt + sticky bar already own the screen.
 */
const OPEN_KEY = 'he_promos_open';
const DISMISS_KEY = 'he_promos_dismissed';
const AUTOPLAY_MS = 6000;

export default function PromotionsPopup() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [promos, setPromos] = useState<SlimPromo[]>([]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOpen(localStorage.getItem(OPEN_KEY) !== '0'); // default open
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    let cancelled = false;
    fetch('/api/promotions')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SlimPromo[]) => { if (!cancelled) setPromos(Array.isArray(data) ? data : []); })
      .catch(() => { /* offline / not migrated — just don't show it */ });
    return () => { cancelled = true; };
  }, []);

  // Autoplay — advance while open, playing and there's more than one offer.
  useEffect(() => {
    if (!open || !playing || promos.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % promos.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [open, playing, promos.length]);

  if (!mounted || dismissed || promos.length === 0) return null;
  if (pathname.startsWith('/promotions')) return null; // redundant on that page

  const setOpenState = (v: boolean) => {
    localStorage.setItem(OPEN_KEY, v ? '1' : '0');
    setOpen(v);
  };
  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const promo = promos[index % promos.length];
  const iconBtn = 'w-6 h-6 flex items-center justify-center text-[#1A0B2E]/55 hover:text-[#1A0B2E] hover:bg-[#1A0B2E]/5 transition-colors';

  return (
    <div className="hidden lg:flex fixed z-40 top-[84px] left-0 items-start">
      {/* Red vertical tab — always visible; toggles the panel. Square right
          edge while open so it butts cleanly against the white panel. */}
      <button
        type="button"
        onClick={() => setOpenState(!open)}
        aria-label={open ? 'Collapse promotions' : 'Show promotions'}
        className="bg-[#E30613]/90 backdrop-blur-md text-white border border-l-0 border-white/25 py-4 px-2 flex flex-col items-center gap-2 shadow-2xl hover:bg-[#E30613] transition-colors"
      >
        <Tag size={15} className="text-white" />
        <span className="font-montserrat font-semibold text-[11px] tracking-widest uppercase" style={{ writingMode: 'vertical-rl' }}>
          Promotions
        </span>
      </button>

      {/* White frosted panel */}
      {open && (
        <div className="relative w-64 bg-white/90 backdrop-blur-md text-[#1A0B2E] border border-l-0 border-black/5 ring-1 ring-black/5 shadow-2xl">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-[#1A0B2E]/40 hover:text-[#1A0B2E] z-10"
          >
            <X size={15} />
          </button>

          <div className="p-4 pr-8">
            {promo.badge && (
              <span className="inline-block bg-[#E30613] text-white text-[10px] font-montserrat font-bold tracking-wide uppercase px-2 py-0.5 mb-2">
                {promo.badge}
              </span>
            )}
            <p className="font-playfair font-semibold text-lg leading-snug mb-1.5 text-[#1A0B2E]">{promo.title}</p>
            {promo.tagline && (
              <p className="text-[#1A0B2E]/70 text-xs font-montserrat leading-relaxed mb-3">{promo.tagline}</p>
            )}

            {/* Carousel controls + counter */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => setIndex((i) => (i - 1 + promos.length) % promos.length)} className={iconBtn} aria-label="Previous offer">
                  <ChevronLeft size={16} />
                </button>
                {promos.length > 1 && (
                  <button type="button" onClick={() => setPlaying((p) => !p)} className={iconBtn} aria-label={playing ? 'Pause' : 'Play'}>
                    {playing ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                )}
                <button type="button" onClick={() => setIndex((i) => (i + 1) % promos.length)} className={iconBtn} aria-label="Next offer">
                  <ChevronRight size={16} />
                </button>
              </div>
              <span className="font-montserrat text-[#1A0B2E]/60 text-xs tabular-nums">
                {(index % promos.length) + 1} / {promos.length}
              </span>
            </div>

            <Link href="/promotions" className="inline-flex items-center gap-1 text-[#E30613] hover:text-[#1A0B2E] font-montserrat font-semibold text-xs underline underline-offset-2 decoration-[#E30613]/30">
              More info <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
