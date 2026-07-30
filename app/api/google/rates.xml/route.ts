import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getRoomPricing } from '@/lib/utils';
import { getHotelTaxPercent } from '@/lib/tax';
import { addDays, format } from 'date-fns';

// Google Hotels Free Booking Links — Transaction Message (batch pricing).
// Spec: https://developers.google.com/hotels/hotel-prices/dev-guide/transaction-messages
//
// Publishes rates + availability for the next 90 days per active room.
// Google crawls this on its own cadence; we don't push. Every fetch is
// live from Supabase — rate changes in admin reflect on Google within
// the next crawl (typically <24h for active properties).
//
// Per-date logic:
//   - Skip a date if the room has ZERO available units on that date
//     (blocks + manual holds already exhaust total_units, honouring the
//     per-date override table)
//   - baserate = effective per-night price (offer_price if lower than
//     regular, else regular)
//   - tax = current hotel tax_percent applied to baserate. Google shows
//     both baserate + tax to the guest so they see the exact same
//     breakdown they'll see on our booking page — no surprise at
//     checkout, no penalty from Google for price mismatch
//
// Currency is PKR everywhere. Google requires ISO 4217 codes.

export const runtime = 'nodejs';
// Revalidate every 15 minutes — daily rate changes should propagate within
// the hour, but we don't want to rebuild the whole 90-day feed on every
// crawler hit. If admin needs an instant push, they can redeploy.
export const revalidate = 900;

const HOTEL_ID = 'elegant-suite-multan';
const DAYS_AHEAD = 90; // Google's minimum useful window; longer wastes cost + I/O

function xmlDate(d: Date) {
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface RoomRow {
  id: string;
  name: string;
  slug: string;
  price_per_night: number | null;
  offer_price: number | null;
  total_units: number | null;
  is_active: boolean;
}

export async function GET() {
  const supabase = createServiceClient();

  // 1. Fetch active rooms + the whole 90-day availability window in one
  //    trip. Overrides + blocks are separately fetched and joined in-memory
  //    — smaller than pulling per-date sub-queries per room.
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = addDays(start, DAYS_AHEAD);
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  const [roomsRes, blocksRes, overridesRes, taxPercent] = await Promise.all([
    supabase.from('rooms').select('id, name, slug, price_per_night, offer_price, total_units, is_active').eq('is_active', true),
    supabase.from('availability_blocks').select('room_id, date').gte('date', startStr).lt('date', endStr),
    supabase.from('availability_overrides').select('room_id, date, effective_total').gte('date', startStr).lt('date', endStr),
    getHotelTaxPercent(),
  ]);

  const rooms = (roomsRes.data || []) as RoomRow[];
  const blocks = blocksRes.data || [];
  const overrides = overridesRes.data || [];

  // room_id → (date → block count). Used to compute available units per
  // date: total_units (or per-date override) minus block count.
  const blocksByRoom = new Map<string, Map<string, number>>();
  for (const b of blocks) {
    const inner = blocksByRoom.get(b.room_id) ?? new Map<string, number>();
    inner.set(b.date, (inner.get(b.date) ?? 0) + 1);
    blocksByRoom.set(b.room_id, inner);
  }

  const overrideByRoom = new Map<string, Map<string, number>>();
  for (const o of overrides) {
    const inner = overrideByRoom.get(o.room_id) ?? new Map<string, number>();
    inner.set(o.date, o.effective_total);
    overrideByRoom.set(o.room_id, inner);
  }

  const now = new Date().toISOString();
  const results: string[] = [];

  for (const room of rooms) {
    const { effective } = getRoomPricing(room);
    if (!effective || effective <= 0) continue; // no rate = don't offer

    const defaultTotal = room.total_units ?? 1;
    const blocksMap = blocksByRoom.get(room.id) ?? new Map<string, number>();
    const overrideMap = overrideByRoom.get(room.id) ?? new Map<string, number>();

    // Emit one <result> per available date. Google prefers a single 1-night
    // window per row; longer stays are inferred from consecutive rows.
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const day = addDays(start, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const cap = overrideMap.get(dayStr) ?? defaultTotal;
      const booked = blocksMap.get(dayStr) ?? 0;
      if (booked >= cap) continue; // sold out — omit rather than show a bad rate

      const baserate = Math.round(effective);
      const taxAmount = Math.round(baserate * (taxPercent / 100));

      const d = xmlDate(day);
      results.push(`
  <result>
    <property>${HOTEL_ID}</property>
    <checkin_date>
      <year>${d.year}</year>
      <month>${d.month}</month>
      <day>${d.day}</day>
    </checkin_date>
    <nights>1</nights>
    <baserate currency="PKR">${baserate}</baserate>
    <tax currency="PKR">${taxAmount}</tax>
    <other_fees currency="PKR">0</other_fees>
    <room_type_info>
      <room_id>${escape(room.slug)}</room_id>
      <name>${escape(room.name)}</name>
    </room_type_info>
  </result>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<transaction timestamp="${now}" id="rates-${Date.now()}">${results.join('')}
</transaction>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900, s-maxage=900',
    },
  });
}
