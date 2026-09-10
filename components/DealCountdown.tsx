'use client';

import { useEffect, useState } from 'react';
import { Clock, CalendarDays } from 'lucide-react';

/**
 * Live "Starts in / Ends in" countdown for a Last-Minute-style deal that
 * has a recurring daily window (start_time / end_time in PKT) and/or a
 * check-in weekday whitelist. Ticks every second on the client; nothing
 * to render server-side because the deal is a live-window signal.
 *
 * If both times are blank the window is 24/7 → we skip the countdown and
 * just render the weekday chips (still useful marketing info).
 */
interface Props {
  /** "HH:MM" PKT. Blank = all day. */
  startTime: string | null;
  endTime: string | null;
  /** 0=Sun..6=Sat; empty = every day. */
  weekdays: number[];
  /** Colour intent — 'light' for dark-on-white surfaces (booking form),
   *  'dark' for placement on a white card (default). */
  variant?: 'light' | 'dark';
  className?: string;
}

const DAY_LABELS: Record<number, string> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

/** Pakistan Standard Time is fixed UTC+5 (no DST) — compute a Date that,
 *  when we read its UTC getters, actually gives us PKT-wall clock values. */
function pktNow(): Date {
  const n = new Date();
  return new Date(n.getTime() + 5 * 3600 * 1000);
}

// Accepts "HH:MM" or Postgres's "HH:MM:SS" (a TIME column round-trips with
// seconds through the Supabase client) — trailing seconds are ignored.
function parseHM(s: string): { h: number; m: number } | null {
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

/** Milliseconds until the next boundary (either the start or the end of
 *  the deal's daily window, considering the weekday whitelist and possibly
 *  an overnight window). Returns a discriminated tuple. */
function timeToNextBoundary(
  startHM: string,
  endHM: string,
  weekdays: number[],
): { phase: 'active' | 'upcoming'; ms: number; targetLabel: string } {
  const s = parseHM(startHM);
  const e = parseHM(endHM);
  if (!s || !e) return { phase: 'upcoming', ms: 0, targetLabel: '' };

  const now = pktNow();
  // UTC getters on the shifted date return PKT wall-clock.
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const d  = now.getUTCDate();
  const dow = now.getUTCDay();

  const startToday = Date.UTC(y, mo, d, s.h, s.m, 0);
  const endToday   = Date.UTC(y, mo, d, e.h, e.m, 0);
  const nowMs      = now.getTime();

  const overnight = endToday <= startToday; // e.g. 22:00 → 02:00
  const dayOk = (dayIdx: number) => weekdays.length === 0 || weekdays.includes(dayIdx);

  // 1) currently inside window?
  if (!overnight) {
    if (dayOk(dow) && nowMs >= startToday && nowMs < endToday) {
      return { phase: 'active', ms: endToday - nowMs, targetLabel: 'Ends' };
    }
  } else {
    // Overnight window straddling midnight: either after startToday (today part)
    // OR before endToday when yesterday (in PKT) matched the weekday.
    if (dayOk(dow) && nowMs >= startToday) {
      // in the late-night portion of today's window
      const endTomorrow = endToday + 86_400_000;
      return { phase: 'active', ms: endTomorrow - nowMs, targetLabel: 'Ends' };
    }
    const yesterdayDow = (dow + 6) % 7;
    if (dayOk(yesterdayDow) && nowMs < endToday) {
      return { phase: 'active', ms: endToday - nowMs, targetLabel: 'Ends' };
    }
  }

  // 2) not active — find the next start that satisfies the weekday rule.
  //    Walk day by day (max 8 iterations covers a full week).
  for (let offset = 0; offset < 8; offset++) {
    const cand = Date.UTC(y, mo, d + offset, s.h, s.m, 0);
    if (cand <= nowMs) continue;                    // skip past start
    const candDow = (dow + offset) % 7;
    if (!dayOk(candDow)) continue;
    return { phase: 'upcoming', ms: cand - nowMs, targetLabel: 'Starts' };
  }
  return { phase: 'upcoming', ms: 0, targetLabel: 'Starts' };
}

function humanise(ms: number): string {
  if (ms <= 0) return '0s';
  const s  = Math.floor(ms / 1000);
  const d  = Math.floor(s / 86400);
  const h  = Math.floor((s % 86400) / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (d > 0)  return `${d}d ${h}h ${m}m`;
  if (h > 0)  return `${h}h ${m}m ${ss.toString().padStart(2, '0')}s`;
  if (m > 0)  return `${m}m ${ss.toString().padStart(2, '0')}s`;
  return `${ss}s`;
}

export default function DealCountdown({
  startTime,
  endTime,
  weekdays,
  variant = 'dark',
  className = '',
}: Props) {
  const has24hWindow = !startTime || !endTime;
  const [, tick] = useState(0);

  useEffect(() => {
    if (has24hWindow) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [has24hWindow]);

  // Nothing to render at all if there's no window AND no weekday filter.
  if (has24hWindow && weekdays.length === 0) return null;

  // Palette — light variant sits on dark bars (booking form top strip),
  // dark variant sits on white cards (reservations list, promotions page).
  const chipCls =
    variant === 'light'
      ? 'bg-white/15 text-white border-white/25'
      : 'bg-[#1A0B2E]/[0.06] text-[#1A0B2E] border-[#1A0B2E]/15';
  const pillCls =
    variant === 'light'
      ? 'bg-white text-[#E30613]'
      : 'bg-[#E30613] text-white';

  const dayChips =
    weekdays.length > 0 ? (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 border ${chipCls}`}>
        <CalendarDays size={12} />
        <span className="font-montserrat text-[11px] font-semibold tracking-wide">
          {weekdays
            .slice()
            .sort()
            .map((d) => DAY_LABELS[d])
            .join(' · ')}{' '}
          only
        </span>
      </span>
    ) : null;

  if (has24hWindow) {
    // No countdown — just the day chips.
    return <span className={`inline-flex items-center gap-1.5 ${className}`}>{dayChips}</span>;
  }

  const { phase, ms, targetLabel } = timeToNextBoundary(startTime!, endTime!, weekdays);

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 font-montserrat text-[11px] font-bold uppercase tracking-widest ${pillCls}`}>
        <Clock size={12} className={phase === 'active' ? 'animate-pulse' : ''} />
        {targetLabel} in {humanise(ms)}
      </span>
      {dayChips}
    </span>
  );
}
