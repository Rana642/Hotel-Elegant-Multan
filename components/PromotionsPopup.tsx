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
 * Red, frosted-glass "Promotions" widget pinned to the TOP-LEFT (under the
 * fixed header): a vertical "Promotions" tab on the left edge, a glassy red
 * panel with a badge, the current offer, prev / pause / next carousel
 * controls, an "n/total" counter and a "More info" link. Auto-advances every
 * 6s (pausable). Desktop only — on phones the Continue-booking prompt + sticky
 * bar already own the screen.
 */
const OPEN_KEY = 'he_promos_open';
const DISMISS_KEY = 'he_promos_dismissed';
const AUTOPLAY_MS = 6000;

// Glassy brand red — shared by the tab + panel so they read as one surface.
const GLASS = 'bg-[#E30613]/90 backdrop-blur-md text-white border-white/25';

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
  const iconBtn = 'w-6 h-6 flex items-center justify-center rounded text-white/80 hover:text-white hover:bg-white/15 transition-colors';

  return (
    <div className="hidden lg:flex fixed z-40 top-[84px] left-0 items-start">
      {/* Vertical tab — always visible; toggles the panel. */}
      <button
        type="button"
        onClick={() => setOpenState(!open)}
        aria-label={open ? 'Collapse promotions' : 'Show promotions'}
        className={`${GLASS} border border-l-0 rounded-r-lg py-4 px-2 flex flex-col items-center gap-2 shadow-2xl hover:bg-[#E30613] transition-colors`}
      >
        <Tag size={15} className="text-white" />
        <span className="font-montserrat font-semibold text-[11px] tracking-widest uppercase" style={{ writingMode: 'vertical-rl' }}>
          Promotions
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div className={`${GLASS} relative w-64 border border-l-0 shadow-2xl`}>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-white/70 hover:text-white z-10"
          >
            <X size={15} />
          </button>

          <div className="p-4 pr-8">
            {promo.badge && (
              <span className="inline-block bg-white text-[#E30613] text-[10px] font-montserrat font-bold tracking-wide uppercase px-2 py-0.5 rounded mb-2">
                {promo.badge}
              </span>
            )}
            <p className="font-playfair font-semibold text-lg leading-snug mb-1.5 text-white">{promo.title}</p>
            {promo.tagline && (
              <p className="text-white/85 text-xs font-montserrat leading-relaxed mb-3">{promo.tagline}</p>
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
              <span className="font-montserrat text-white/80 text-xs tabular-nums">
                {(index % promos.length) + 1} / {promos.length}
              </span>
            </div>

            <Link href="/promotions" className="inline-flex items-center gap-1 text-white hover:text-white/80 font-montserrat font-semibold text-xs underline underline-offset-2 decoration-white/40">
              More info <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
