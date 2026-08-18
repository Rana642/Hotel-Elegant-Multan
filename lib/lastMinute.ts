// Last-Minute Deal — pure logic (no I/O), safe to import on client + server.
//
// A last-minute discount auto-activates for check-ins inside a short window
// (today / next day) during a daily time window (e.g. 2pm–11:59pm), on
// eligible rooms only, and is NON-STACKABLE with coupons + NON-REFUNDABLE.
//
// IMPORTANT: the window is judged in **Pakistan time (PKT = UTC+5, no DST)**,
// never the visitor's device time — a guest in the US must see the same
// on/off state as the hotel does. All time/date maths below runs in PKT.

export interface LastMinuteConfig {
  enabled: boolean;
  discountPercent: number;         // e.g. 30
  startHour: number;               // PKT hour the deal turns on (0-23), e.g. 14 = 2pm
  endHour: number;                 // PKT hour it stays on THROUGH (inclusive), e.g. 23 = until 23:59
  maxDaysWindow: number;           // 0 = same-day only, 1 = today + tomorrow, ...
  eligibleRoomIds: string[] | null; // null/empty = every room
  blackoutDates: string[];         // ['yyyy-mm-dd'] the deal is force-off
  blackoutWeekends: boolean;       // also force-off on Fri + Sat check-ins
  jazzcashNumber: string;          // advance-payment account shown at checkout
  jazzcashName: string;            // account holder name
  paymentWindowMins: number;       // "send screenshot within N minutes"
  termsText: string;               // editable T&C shown on the booking form
}

export const DEFAULT_LAST_MINUTE_TERMS =
  '1. This is a 100% Non-Refundable rate — it cannot be cancelled, amended or date-changed.\n' +
  '2. Full advance payment is required to secure the room; the booking is confirmed only after payment is received.\n' +
  '3. Valid for same-day / next-day check-ins only, on selected rooms, subject to availability (first come, first served).\n' +
  '4. This special rate cannot be combined with any coupon, membership or other discount.';

export const DEFAULT_LAST_MINUTE_CONFIG: LastMinuteConfig = {
  enabled: false,
  discountPercent: 30,
  startHour: 14,
  endHour: 23,
  maxDaysWindow: 1,
  eligibleRoomIds: null,
  blackoutDates: [],
  blackoutWeekends: false,
  jazzcashNumber: '',
  jazzcashName: '',
  paymentWindowMins: 30,
  termsText: DEFAULT_LAST_MINUTE_TERMS,
};

/** Merge a partial (possibly from JSON) onto the defaults so missing keys are
 *  always populated and types stay sane. */
export function normalizeLastMinuteConfig(raw: Partial<LastMinuteConfig> | null | undefined): LastMinuteConfig {
  const c = { ...DEFAULT_LAST_MINUTE_CONFIG, ...(raw || {}) };
  return {
    enabled: Boolean(c.enabled),
    discountPercent: clampInt(c.discountPercent, 1, 90, 30),
    startHour: clampInt(c.startHour, 0, 23, 14),
    endHour: clampInt(c.endHour, 0, 23, 23),
    maxDaysWindow: clampInt(c.maxDaysWindow, 0, 7, 1),
    eligibleRoomIds: Array.isArray(c.eligibleRoomIds) && c.eligibleRoomIds.length > 0 ? c.eligibleRoomIds : null,
    blackoutDates: Array.isArray(c.blackoutDates) ? c.blackoutDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) : [],
    blackoutWeekends: Boolean(c.blackoutWeekends),
    jazzcashNumber: String(c.jazzcashNumber || '').trim(),
    jazzcashName: String(c.jazzcashName || '').trim(),
    paymentWindowMins: clampInt(c.paymentWindowMins, 5, 240, 30),
    termsText: String(c.termsText || DEFAULT_LAST_MINUTE_TERMS),
  };
}

function clampInt(v: unknown, min: number, max: number, dflt: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, n));
}

// ── PKT clock ───────────────────────────────────────────────────────────
/** Current wall-clock in Pakistan (UTC+5, no DST) derived from any instant. */
export function pktNow(base: Date = new Date()): { hour: number; today: string; weekday: number } {
  const shifted = new Date(base.getTime() + 5 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const d = shifted.getUTCDate();
  return {
    hour: shifted.getUTCHours(),
    today: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    weekday: shifted.getUTCDay(), // 0 Sun … 6 Sat
  };
}

function daysBetween(fromISO: string, toISO: string): number {
  const [y1, m1, d1] = fromISO.split('-').map(Number);
  const [y2, m2, d2] = toISO.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export interface LastMinuteEval {
  active: boolean;
  discountPercent: number;
}

/**
 * Decide whether the last-minute deal applies to a given check-in / room
 * right now. Pure + deterministic given `now` — used identically by the
 * client preview and the server-authoritative booking commit.
 */
export function evaluateLastMinute(params: {
  config: LastMinuteConfig | null | undefined;
  checkIn: string;      // yyyy-mm-dd
  roomId?: string;
  now?: Date;
}): LastMinuteEval {
  const off = { active: false, discountPercent: 0 };
  const { config, checkIn, roomId } = params;
  if (!config || !config.enabled || !checkIn) return off;

  const { hour, today } = pktNow(params.now);

  // Daily time window (PKT).
  if (hour < config.startHour || hour > config.endHour) return off;

  // Date window — check-in must be within [today, today + maxDaysWindow].
  const days = daysBetween(today, checkIn);
  if (days < 0 || days > config.maxDaysWindow) return off;

  // Blackouts.
  if (config.blackoutDates.includes(checkIn)) return off;
  if (config.blackoutWeekends) {
    const wd = weekdayOf(checkIn);
    if (wd === 5 || wd === 6) return off; // Fri / Sat
  }

  // Room eligibility.
  if (config.eligibleRoomIds && roomId && !config.eligibleRoomIds.includes(roomId)) return off;

  return { active: true, discountPercent: config.discountPercent };
}

/** Discounted per-night price for a given base (rack) price. Whole rupees. */
export function lastMinutePrice(basePrice: number, discountPercent: number): number {
  return Math.round(basePrice * (1 - discountPercent / 100));
}
