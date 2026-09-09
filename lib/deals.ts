// Pure logic — safe on client + server. The I/O (getActiveDeals /
// dealForRoomOnDate) is guarded by dynamic import + createServiceClient which
// is only available server-side. Client code should import the pure helpers
// (pickDeal, applyDeal, dealApplies) and call them with deals fetched via a
// server component or server action.
import { pktNow } from '@/lib/lastMinute';

// Deals engine — ported from Silver Sand. A promotion becomes a "deal" the
// moment it has a discount_percent > 0; all its rule columns (dates, weekdays,
// room whitelist, lead-time, min-nights, hourly window, refundability) are
// evaluated here to decide if it applies to a specific room + check-in + stay
// at the current Pakistan time. One source of truth, admin-editable.

export type LeadTimeType = 'none' | 'early_bird' | 'last_minute';

export interface RateDeal {
  id: string;
  name: string;
  discount_percent: number;
  start_date: string | null;
  end_date: string | null;
  room_ids: string[];
  weekdays: number[];          // 0=Sun..6=Sat; empty = every day
  lead_time_type: LeadTimeType;
  lead_time_days: number;
  min_nights: number;
  start_time: string | null;   // "HH:MM" — active hours window (PKT)
  end_time: string | null;
  refundable: boolean;
  free_cancel_days: number;
  priority: number;
}

export interface AppliedDeal {
  id: string;
  name: string;
  discountPct: number;
  refundable: boolean;
  freeCancelDays: number;
}

/** Load every active promotion that acts as a deal (has a discount %). */
export async function getActiveDeals(): Promise<RateDeal[]> {
  // Dynamic import so pure helpers can still be tree-shaken to the client.
  const { createServiceClient } = await import('@/lib/supabase/server');
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('promotions')
    .select('id, title, discount_percent, start_date, end_date, room_ids, weekdays, lead_time_type, lead_time_days, min_nights, start_time, end_time, refundable, free_cancel_days, priority')
    .eq('is_active', true)
    .gt('discount_percent', 0);
  if (error) { console.error('[deals] load error:', error.message); return []; }
  return (data ?? []).map((d: any) => ({
    id: d.id,
    name: d.title,
    discount_percent: Number(d.discount_percent) || 0,
    start_date: d.start_date ?? null,
    end_date: d.end_date ?? null,
    room_ids: (d.room_ids as string[] | null) ?? [],
    weekdays: ((d.weekdays as number[] | null) ?? []).map(Number),
    lead_time_type: (d.lead_time_type as LeadTimeType) ?? 'none',
    lead_time_days: Number(d.lead_time_days) || 0,
    min_nights: Number(d.min_nights) || 0,
    start_time: d.start_time ?? null,
    end_time: d.end_time ?? null,
    refundable: d.refundable !== false,
    free_cancel_days: Number(d.free_cancel_days) ?? 2,
    priority: Number(d.priority) || 0,
  }));
}

// ── Pure helpers (also used from the client via the pricing preview) ────
function daysBefore(checkIn: string, today: string): number {
  return Math.round(
    (Date.parse(checkIn + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86_400_000
  );
}
function timeInWindow(now: string, start: string, end: string): boolean {
  // supports windows crossing midnight (e.g. 22:00 → 02:00)
  if (start <= end) return now >= start && now <= end;
  return now >= start || now <= end;
}
function weekdayUTC(iso: string): number {
  return new Date(iso + 'T00:00:00Z').getUTCDay(); // 0=Sun..6=Sat
}
function pktNowClock(): { today: string; time: string } {
  const n = pktNow();
  const time = `${String(n.hour).padStart(2, '0')}:${String(new Date(new Date().getTime() + 5 * 3600 * 1000).getUTCMinutes()).padStart(2, '0')}`;
  return { today: n.today, time };
}

/** Does this deal apply for a specific room + check-in + stay + now-time? */
function dealApplies(
  d: RateDeal,
  roomId: string,
  checkIn: string,
  today: string,
  nights: number,
  nowTime: string,
): boolean {
  if (d.room_ids.length > 0 && !d.room_ids.includes(roomId)) return false;
  if (d.min_nights > 0 && nights < d.min_nights) return false;
  if (d.start_time && d.end_time && !timeInWindow(nowTime, d.start_time, d.end_time)) return false;
  if (d.start_date && checkIn < d.start_date) return false;
  if (d.end_date && checkIn > d.end_date) return false;
  if (d.weekdays.length > 0 && !d.weekdays.includes(weekdayUTC(checkIn))) return false;
  if (d.lead_time_type !== 'none') {
    const lead = daysBefore(checkIn, today);
    if (d.lead_time_type === 'early_bird' && lead < d.lead_time_days) return false;
    if (d.lead_time_type === 'last_minute' && lead > d.lead_time_days) return false;
    if (lead < 0) return false; // never for past check-ins
  }
  return true;
}

/** Best deal wins by priority, then by discount %. */
export function pickDeal(
  deals: RateDeal[],
  roomId: string,
  checkIn: string,
  today: string,
  nights: number,
  nowTime: string,
): AppliedDeal | null {
  const ok = deals.filter((d) => dealApplies(d, roomId, checkIn, today, nights, nowTime));
  if (!ok.length) return null;
  ok.sort((a, b) => b.priority - a.priority || b.discount_percent - a.discount_percent);
  const d = ok[0];
  return {
    id: d.id,
    name: d.name,
    discountPct: d.discount_percent,
    refundable: d.refundable,
    freeCancelDays: d.free_cancel_days,
  };
}

/** Server one-shot — used by createBooking. Reads current PKT internally. */
export async function dealForRoomOnDate(
  roomId: string,
  checkIn: string,
  nights: number,
): Promise<AppliedDeal | null> {
  const deals = await getActiveDeals();
  const clock = pktNowClock();
  return pickDeal(deals, roomId, checkIn, clock.today, nights, clock.time);
}

/** Apply a deal's discount to a base per-night price (rounded to whole PKR). */
export function applyDeal(basePrice: number, deal: AppliedDeal | null): number {
  if (!deal || deal.discountPct <= 0) return basePrice;
  return Math.round(basePrice * (1 - deal.discountPct / 100));
}
