import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/mcpOauth';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

// Runs on the persistent Node.js server (Hostinger), NOT edge — it needs the
// service-role key and does DB writes.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Config ──────────────────────────────────────────────────────────────────
const SERVER_INFO = { name: 'hotel-elegant-mcp-server', version: '1.0.0' };
const DEFAULT_PROTOCOL = '2025-06-18';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-protocol-version',
};

// ── Types ───────────────────────────────────────────────────────────────────
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

// ── Tool definitions (advertised via tools/list) ────────────────────────────
const TOOLS = [
  {
    name: 'list_rooms',
    title: 'List Rooms',
    description:
      'List every room at Hotel Elegant Executive Suites with its slug, display name, regular price, current discounted (offer) price in PKR, and total_units (how many physical rooms of that type exist). Use this first to see exact slugs and current values before updating anything.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'update_room_rate',
    title: 'Update Room Rate',
    description:
      "Update a room's pricing. Set the regular (original) price and the discounted (offer) price in whole PKR rupees. Typically used to mirror Booking.com: original_price = Booking.com's standard rate, discount_price = the rate after the Genius/member discount. discount_price must be less than or equal to original_price. Identify the room by its slug (get it from list_rooms).",
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'Room slug, e.g. "executive-king", "family-suite" (from list_rooms).',
        },
        original_price: {
          type: 'integer',
          description: 'Regular price per night in whole PKR (e.g. 7600).',
          minimum: 0,
          maximum: 1000000,
        },
        discount_price: {
          type: 'integer',
          description: 'Discounted/offer price per night in whole PKR (e.g. 6840). Must be <= original_price.',
          minimum: 0,
          maximum: 1000000,
        },
      },
      required: ['slug', 'original_price', 'discount_price'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'update_room_name',
    title: 'Update Room Display Name',
    description:
      "Change a room's display name (the name shown on the website and dashboard). This does NOT change the room's URL/slug, so existing links and SEO are unaffected. Identify the room by its slug (get it from list_rooms).",
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Room slug (from list_rooms).' },
        name: {
          type: 'string',
          description: 'New display name, e.g. "King Room".',
          minLength: 1,
          maxLength: 80,
        },
      },
      required: ['slug', 'name'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },

  // ── Availability tools ────────────────────────────────────────────────
  {
    name: 'list_availability',
    title: 'List Blocked Dates',
    description:
      "Show which dates are blocked for a room in a date range. Each block includes its reason (booking = tied to a confirmed booking; walkin = walk-in hold; maintenance = repair/cleaning) and, for booking-linked blocks, the booking_ref. Default range: today through 30 days out. Use before block_dates to check availability, or before unblock_dates to see what's currently held.",
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'Optional. Restrict to one room (from list_rooms). Omit to see all rooms.',
        },
        start_date: {
          type: 'string',
          description: 'Range start, YYYY-MM-DD. Defaults to today.',
        },
        end_date: {
          type: 'string',
          description: 'Range end (inclusive), YYYY-MM-DD. Defaults to 30 days from today.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'block_dates',
    title: 'Block Dates for a Room',
    description:
      "Block one or more UNITS of a room across a date range (e.g. walk-in hold, OTA booking mirror, maintenance). Range is inclusive on both ends. Each unit-day is one row — a 3-unit Family Suite can be blocked up to 3 times per date. Automatically caps at the room's total_units so it never exceeds inventory. Use units_per_day > 1 to reflect multiple OTA bookings landing on the same date.",
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Room slug (from list_rooms).' },
        start_date: { type: 'string', description: 'First blocked date, YYYY-MM-DD.' },
        end_date: { type: 'string', description: 'Last blocked date (inclusive), YYYY-MM-DD.' },
        reason: {
          type: 'string',
          enum: ['walkin', 'maintenance'],
          description: "Why the dates are blocked. 'walkin' covers walk-in / phone / OTA holds; 'maintenance' = repairs, deep clean.",
        },
        units_per_day: {
          type: 'integer',
          description: 'How many units to block per day. Default 1. Capped at room.total_units minus existing blocks on each date.',
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['slug', 'start_date', 'end_date', 'reason'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'unblock_dates',
    title: 'Unblock Dates for a Room',
    description:
      "Remove walk-in / maintenance blocks from a date range. Never touches blocks tied to a real booking — those can only be released by cancelling or deleting the booking itself (safety guard). Range inclusive both ends.",
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Room slug (from list_rooms).' },
        start_date: { type: 'string', description: 'First date to free, YYYY-MM-DD.' },
        end_date: { type: 'string', description: 'Last date to free (inclusive), YYYY-MM-DD.' },
      },
      required: ['slug', 'start_date', 'end_date'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },

  // ── Analytics tools ───────────────────────────────────────────────────
  {
    name: 'dashboard_stats',
    title: 'Dashboard Snapshot',
    description:
      "Overall business snapshot mirroring the admin dashboard. Returns today's check-ins/check-outs, pending/confirmed booking counts, total revenue in PKR (confirmed + completed only — cancelled excluded), and a 30-day inquiry funnel (new, converted, closed, conversion rate). Read-only; safe to call any time.",
    inputSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'integer',
          description: 'Window size for the inquiry funnel and revenue totals, in days. Default 30.',
          minimum: 1,
          maximum: 365,
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'recent_bookings',
    title: 'Recent Bookings',
    description:
      "List the most recent bookings with guest name, room, check-in/check-out, status, grand total (PKR) and booking_ref. Ordered newest first.",
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'How many bookings to return. Default 10, max 50.',
          minimum: 1,
          maximum: 50,
        },
        status: {
          type: 'string',
          enum: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
          description: 'Optional. Only return bookings with this status.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'recent_inquiries',
    title: 'Recent Inquiries',
    description:
      "List the most recent WhatsApp/Call inquiries submitted through the site's contact modal. Each row includes name, phone (if given), channel, intent (booking vs info), status, source (Facebook Ads / Google Ads / Direct / etc.), and timestamp. Ordered newest first.",
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'How many inquiries to return. Default 10, max 50.',
          minimum: 1,
          maximum: 50,
        },
        status: {
          type: 'string',
          enum: ['new', 'converted', 'closed', 'spam'],
          description: 'Optional. Only return inquiries with this status.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Accepts either the static MCP_AUTH_TOKEN (for CLI/manual use) or a valid,
 * unexpired, unrevoked access token issued by our own /api/oauth flow (for
 * OAuth-based clients like Claude Desktop/mobile).
 */
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const provided = match?.[1]?.trim();
  if (!provided) return false;

  const staticToken = process.env.MCP_AUTH_TOKEN;
  if (staticToken && provided === staticToken) return true;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('mcp_oauth_tokens')
    .select('expires_at, revoked')
    .eq('access_token', provided)
    .maybeSingle();

  if (!data || data.revoked) return false;
  return new Date(data.expires_at).getTime() > Date.now();
}

function wwwAuthenticateHeader(): string {
  return `Bearer resource_metadata="${getSiteUrl()}/.well-known/oauth-protected-resource"`;
}

function rpcResult(id: JsonRpcRequest['id'], result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, result }, { headers: CORS_HEADERS });
}

function rpcError(id: JsonRpcRequest['id'], code: number, message: string) {
  return NextResponse.json(
    { jsonrpc: '2.0', id: id ?? null, error: { code, message } },
    { headers: CORS_HEADERS }
  );
}

/** MCP tool result carrying human text + structured data. */
function toolResult(id: JsonRpcRequest['id'], structured: unknown, text: string, isError = false) {
  return rpcResult(id, {
    content: [{ type: 'text', text }],
    structuredContent: structured,
    isError,
  });
}

function toolError(id: JsonRpcRequest['id'], message: string) {
  return toolResult(id, { error: message }, `Error: ${message}`, true);
}

// ── Tool implementations ────────────────────────────────────────────────────
async function runListRooms(id: JsonRpcRequest['id']) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('slug, name, price_per_night, offer_price, is_active, total_units')
    .order('sort_order');
  if (error) return toolError(id, `Could not read rooms: ${error.message}`);

  const rooms = (data || []).map((r) => ({
    slug: r.slug,
    name: r.name,
    original_price: r.price_per_night,
    discount_price: r.offer_price,
    total_units: r.total_units ?? 1,
    is_active: r.is_active,
  }));

  const lines = rooms.map(
    (r) =>
      `- ${r.name} (${r.slug}): original PKR ${r.original_price ?? '—'}, discount PKR ${
        r.discount_price ?? '—'
      }, ${r.total_units} unit(s)${r.is_active ? '' : ' [inactive]'}`
  );
  const text = `Rooms (${rooms.length}):\n${lines.join('\n')}`;
  return toolResult(id, { rooms }, text);
}

async function runUpdateRoomRate(id: JsonRpcRequest['id'], args: Record<string, unknown>) {
  const slug = typeof args.slug === 'string' ? args.slug.trim() : '';
  const original = args.original_price;
  const discount = args.discount_price;

  if (!slug) return toolError(id, 'slug is required.');
  if (!Number.isInteger(original) || (original as number) < 0)
    return toolError(id, 'original_price must be a non-negative whole number.');
  if (!Number.isInteger(discount) || (discount as number) < 0)
    return toolError(id, 'discount_price must be a non-negative whole number.');
  if ((discount as number) > (original as number))
    return toolError(id, 'discount_price must be less than or equal to original_price.');

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('rooms')
    .update({ price_per_night: original, offer_price: discount })
    .eq('slug', slug)
    .select('slug, name, price_per_night, offer_price');

  if (error) return toolError(id, `Update failed: ${error.message}`);
  if (!data || data.length === 0)
    return toolError(id, `No room found with slug "${slug}". Call list_rooms to see valid slugs.`);

  const room = data[0];
  const structured = {
    slug: room.slug,
    name: room.name,
    original_price: room.price_per_night,
    discount_price: room.offer_price,
  };
  return toolResult(
    id,
    structured,
    `Updated ${room.name} (${room.slug}): original PKR ${room.price_per_night}, discount PKR ${room.offer_price}.`
  );
}

async function runUpdateRoomName(id: JsonRpcRequest['id'], args: Record<string, unknown>) {
  const slug = typeof args.slug === 'string' ? args.slug.trim() : '';
  const name = typeof args.name === 'string' ? args.name.trim() : '';

  if (!slug) return toolError(id, 'slug is required.');
  if (!name) return toolError(id, 'name is required.');
  if (name.length > 80) return toolError(id, 'name must be 80 characters or fewer.');

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('rooms')
    .update({ name })
    .eq('slug', slug)
    .select('slug, name');

  if (error) return toolError(id, `Update failed: ${error.message}`);
  if (!data || data.length === 0)
    return toolError(id, `No room found with slug "${slug}". Call list_rooms to see valid slugs.`);

  return toolResult(id, { slug: data[0].slug, name: data[0].name }, `Renamed ${data[0].slug} to "${data[0].name}".`);
}

// ── Availability helpers ────────────────────────────────────────────────────
/** Parse YYYY-MM-DD → Date (UTC noon so timezone doesn't slide the day). */
function parseYmd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Inclusive date range as YYYY-MM-DD strings. */
function daysBetween(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(ymd(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

async function roomBySlug(slug: string): Promise<{ id: string; name: string; total_units: number } | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('rooms')
    .select('id, name, total_units')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, name: data.name, total_units: data.total_units ?? 1 };
}

// ── Availability tool implementations ───────────────────────────────────────
async function runListAvailability(id: JsonRpcRequest['id'], args: Record<string, unknown>) {
  const slugArg  = typeof args.slug === 'string' ? args.slug.trim() : '';
  const startStr = typeof args.start_date === 'string' ? args.start_date : ymd(new Date());
  const endStr   = typeof args.end_date === 'string'
    ? args.end_date
    : ymd(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  const start = parseYmd(startStr);
  const end   = parseYmd(endStr);
  if (!start) return toolError(id, `Invalid start_date "${startStr}" (expected YYYY-MM-DD).`);
  if (!end)   return toolError(id, `Invalid end_date "${endStr}" (expected YYYY-MM-DD).`);
  if (end < start) return toolError(id, 'end_date must be on or after start_date.');

  const supabase = createServiceClient();
  let query = supabase
    .from('availability_blocks')
    .select('date, reason, booking_id, room_id, rooms(slug, name), bookings(booking_ref)')
    .gte('date', ymd(start))
    .lte('date', ymd(end))
    .order('date');

  if (slugArg) {
    const room = await roomBySlug(slugArg);
    if (!room) return toolError(id, `No room with slug "${slugArg}".`);
    query = query.eq('room_id', room.id);
  }

  const { data, error } = await query;
  if (error) return toolError(id, `Read failed: ${error.message}`);

  const blocks = (data || []).map((b: any) => ({
    date: b.date,
    room_slug: b.rooms?.slug ?? null,
    room_name: b.rooms?.name ?? null,
    reason: b.reason,
    booking_ref: b.bookings?.booking_ref ?? null,
  }));

  // Per-date summary: count blocks per (room, date) and show remaining
  // capacity vs total_units so admin can see "2/3 booked, 1 remaining"
  // at a glance instead of just a raw block list.
  const supabase2 = createServiceClient();
  const { data: allRooms } = await supabase2.from('rooms').select('slug, total_units');
  const capacity = new Map<string, number>();
  for (const r of allRooms || []) capacity.set(r.slug, (r as any).total_units ?? 1);

  const perDayPerRoom = new Map<string, number>();
  for (const b of blocks) {
    const key = `${b.room_slug}|${b.date}`;
    perDayPerRoom.set(key, (perDayPerRoom.get(key) ?? 0) + 1);
  }

  const summary = `${blocks.length} unit-day block(s) between ${ymd(start)} and ${ymd(end)}${
    slugArg ? ` for "${slugArg}"` : ' across all rooms'
  }.`;

  // Group into date-level rows for the text output.
  const dateRowKeys = Array.from(perDayPerRoom.keys()).sort();
  const dateLines = dateRowKeys.slice(0, 40).map((k) => {
    const [slug, date] = k.split('|');
    const blocked = perDayPerRoom.get(k)!;
    const cap = capacity.get(slug) ?? 1;
    const remaining = Math.max(0, cap - blocked);
    const bookingCount = blocks.filter((b) => b.room_slug === slug && b.date === date && b.booking_ref).length;
    const manualCount  = blocked - bookingCount;
    return `- ${date}  ${slug}  ${blocked}/${cap} blocked (${bookingCount} booking, ${manualCount} manual) — ${remaining} remaining`;
  });

  const text = [summary, ...(dateLines.length ? [''] : []), ...dateLines,
    dateRowKeys.length > 40 ? `… and ${dateRowKeys.length - 40} more date/room rows` : '',
  ].filter(Boolean).join('\n');

  return toolResult(id, { blocks, capacity_by_slug: Object.fromEntries(capacity) }, text);
}

async function runBlockDates(id: JsonRpcRequest['id'], args: Record<string, unknown>) {
  const slug     = typeof args.slug === 'string' ? args.slug.trim() : '';
  const startStr = typeof args.start_date === 'string' ? args.start_date : '';
  const endStr   = typeof args.end_date === 'string' ? args.end_date : '';
  const reason   = typeof args.reason === 'string' ? args.reason : '';
  const unitsReq = Number.isInteger(args.units_per_day) ? (args.units_per_day as number) : 1;

  if (!slug) return toolError(id, 'slug is required.');
  if (!['walkin', 'maintenance'].includes(reason))
    return toolError(id, "reason must be 'walkin' or 'maintenance'.");
  if (unitsReq < 1) return toolError(id, 'units_per_day must be at least 1.');

  const start = parseYmd(startStr);
  const end   = parseYmd(endStr);
  if (!start) return toolError(id, `Invalid start_date "${startStr}" (expected YYYY-MM-DD).`);
  if (!end)   return toolError(id, `Invalid end_date "${endStr}" (expected YYYY-MM-DD).`);
  if (end < start) return toolError(id, 'end_date must be on or after start_date.');

  const room = await roomBySlug(slug);
  if (!room) return toolError(id, `No room with slug "${slug}".`);

  const dates = daysBetween(start, end);
  const supabase = createServiceClient();

  // Multi-unit capacity check: count existing blocks per date and only add
  // up to (total_units - existing) new blocks. Prevents overbooking even
  // if caller passes units_per_day = 999 by mistake.
  const { data: existing } = await supabase
    .from('availability_blocks')
    .select('date')
    .eq('room_id', room.id)
    .in('date', dates);
  const existingCount = new Map<string, number>();
  for (const row of existing || []) existingCount.set(row.date, (existingCount.get(row.date) ?? 0) + 1);

  let created = 0;
  let capped  = 0;
  const rows: { room_id: string; date: string; reason: string; booking_id: null }[] = [];
  for (const date of dates) {
    const already = existingCount.get(date) ?? 0;
    const capacity = room.total_units - already;
    const toAdd = Math.min(unitsReq, capacity);
    if (toAdd <= 0) { capped++; continue; }
    for (let i = 0; i < toAdd; i++) rows.push({ room_id: room.id, date, reason, booking_id: null });
    created += toAdd;
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('availability_blocks').insert(rows);
    if (error) return toolError(id, `Block failed: ${error.message}`);
  }

  return toolResult(
    id,
    { room_slug: slug, reason, requested_units_per_day: unitsReq, dates: dates.length, blocks_created: created, days_at_capacity: capped },
    `Blocked ${created} unit-day(s) for "${room.name}" (${slug}) as "${reason}"${
      capped > 0 ? ` — ${capped} day(s) already at capacity (${room.total_units} units)` : ''
    }.`
  );
}

async function runUnblockDates(id: JsonRpcRequest['id'], args: Record<string, unknown>) {
  const slug     = typeof args.slug === 'string' ? args.slug.trim() : '';
  const startStr = typeof args.start_date === 'string' ? args.start_date : '';
  const endStr   = typeof args.end_date === 'string' ? args.end_date : '';

  if (!slug) return toolError(id, 'slug is required.');

  const start = parseYmd(startStr);
  const end   = parseYmd(endStr);
  if (!start) return toolError(id, `Invalid start_date "${startStr}" (expected YYYY-MM-DD).`);
  if (!end)   return toolError(id, `Invalid end_date "${endStr}" (expected YYYY-MM-DD).`);
  if (end < start) return toolError(id, 'end_date must be on or after start_date.');

  const room = await roomBySlug(slug);
  if (!room) return toolError(id, `No room with slug "${slug}".`);

  const supabase = createServiceClient();

  // Safety: only remove walkin/maintenance blocks with no booking_id. A block
  // tied to a real booking must be freed by cancelling / deleting the booking
  // itself so the guest doesn't lose their reservation via a stray MCP call.
  const { data, error } = await supabase
    .from('availability_blocks')
    .delete()
    .eq('room_id', room.id)
    .gte('date', ymd(start))
    .lte('date', ymd(end))
    .in('reason', ['walkin', 'maintenance'])
    .is('booking_id', null)
    .select('date');

  if (error) return toolError(id, `Unblock failed: ${error.message}`);

  const removed = (data || []).length;
  return toolResult(
    id,
    { room_slug: slug, removed, dates: (data || []).map((d: any) => d.date) },
    `Freed ${removed} date(s) for "${room.name}" (${slug}). Booking-linked dates were left intact — cancel the booking to release those.`
  );
}

// ── Analytics tool implementations ──────────────────────────────────────────
async function runDashboardStats(id: JsonRpcRequest['id'], args: Record<string, unknown>) {
  const days = Number.isInteger(args.days) ? (args.days as number) : 30;
  const supabase = createServiceClient();

  const today       = ymd(new Date());
  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: todayCheckIns },
    { count: todayCheckOuts },
    { count: pendingBookings },
    { count: confirmedBookings },
    { data: revenueRows },
    { data: inquiryRows },
  ] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('check_in', today).neq('status', 'cancelled'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('check_out', today).neq('status', 'cancelled'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('bookings').select('grand_total, status').in('status', ['confirmed', 'checked_in', 'completed']).gte('created_at', windowStart),
    supabase.from('inquiries').select('status').gte('created_at', windowStart),
  ]);

  const totalRevenue = (revenueRows || []).reduce((sum: number, b: any) => sum + (b.grand_total || 0), 0);

  const inqTotal     = (inquiryRows || []).length;
  const inqNew       = (inquiryRows || []).filter((i: any) => i.status === 'new').length;
  const inqConverted = (inquiryRows || []).filter((i: any) => i.status === 'converted').length;
  const inqClosed    = (inquiryRows || []).filter((i: any) => i.status === 'closed').length;
  const worked = inqConverted + inqClosed;
  const conversionRate = worked > 0 ? Math.round((inqConverted / worked) * 100) : 0;

  const structured = {
    today_check_ins:   todayCheckIns   || 0,
    today_check_outs:  todayCheckOuts  || 0,
    pending_bookings:  pendingBookings || 0,
    confirmed_bookings: confirmedBookings || 0,
    window_days: days,
    revenue_pkr: totalRevenue,
    inquiries: {
      total: inqTotal,
      new: inqNew,
      converted: inqConverted,
      closed: inqClosed,
      conversion_rate_pct: conversionRate,
    },
  };

  const text = [
    `Today: ${todayCheckIns || 0} check-in(s), ${todayCheckOuts || 0} check-out(s).`,
    `Bookings: ${pendingBookings || 0} pending, ${confirmedBookings || 0} confirmed.`,
    `Revenue (last ${days}d, confirmed+checked-in+completed): PKR ${totalRevenue.toLocaleString('en-PK')}.`,
    `Inquiries (last ${days}d): ${inqTotal} total — ${inqNew} new, ${inqConverted} converted, ${inqClosed} closed. Conversion rate: ${conversionRate}%.`,
  ].join('\n');

  return toolResult(id, structured, text);
}

async function runRecentBookings(id: JsonRpcRequest['id'], args: Record<string, unknown>) {
  const limit  = Number.isInteger(args.limit)  ? Math.min(Math.max(args.limit as number, 1), 50) : 10;
  const status = typeof args.status === 'string' ? args.status : '';

  const supabase = createServiceClient();
  let query = supabase
    .from('bookings')
    .select('booking_ref, guest_name, guest_phone, check_in, check_out, nights, grand_total, status, source, utm_source, fbclid, rooms(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return toolError(id, `Read failed: ${error.message}`);

  const bookings = (data || []).map((b: any) => ({
    booking_ref: b.booking_ref,
    guest_name:  b.guest_name,
    guest_phone: b.guest_phone,
    room_name:   b.rooms?.name ?? null,
    check_in:    b.check_in,
    check_out:   b.check_out,
    nights:      b.nights,
    grand_total: b.grand_total,
    status:      b.status,
    source:      b.source,
    ad_source:   b.fbclid ? 'facebook' : (b.utm_source || null),
  }));

  const lines = bookings.map(
    (b) => `- ${b.booking_ref}  ${b.guest_name}  ${b.room_name}  ${b.check_in}→${b.check_out}  PKR ${b.grand_total}  [${b.status}]`
  );
  const text = `${bookings.length} booking(s):\n${lines.join('\n')}`;

  return toolResult(id, { bookings }, text);
}

async function runRecentInquiries(id: JsonRpcRequest['id'], args: Record<string, unknown>) {
  const limit  = Number.isInteger(args.limit)  ? Math.min(Math.max(args.limit as number, 1), 50) : 10;
  const status = typeof args.status === 'string' ? args.status : '';

  const supabase = createServiceClient();
  let query = supabase
    .from('inquiries')
    .select('id, guest_name, guest_phone, guest_email, preferred_channel, intent, status, utm_source, fbclid, gclid, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return toolError(id, `Read failed: ${error.message}`);

  const inquiries = (data || []).map((i: any) => ({
    id: i.id,
    guest_name:  i.guest_name,
    guest_phone: i.guest_phone,
    guest_email: i.guest_email,
    channel:     i.preferred_channel,
    intent:      i.intent,
    status:      i.status,
    source: i.fbclid ? 'Facebook Ads' :
            i.gclid  ? 'Google Ads' :
            i.utm_source || 'Direct',
    created_at: i.created_at,
  }));

  const lines = inquiries.map(
    (i) => `- ${i.created_at.slice(0, 16).replace('T', ' ')}  ${i.guest_name}  [${i.intent}/${i.channel}]  ${i.source}  [${i.status}]`
  );
  const text = `${inquiries.length} inquir${inquiries.length === 1 ? 'y' : 'ies'}:\n${lines.join('\n')}`;

  return toolResult(id, { inquiries }, text);
}

async function dispatchToolCall(id: JsonRpcRequest['id'], params: Record<string, unknown> | undefined) {
  const name = params?.name as string | undefined;
  const args = (params?.arguments as Record<string, unknown>) || {};
  switch (name) {
    case 'list_rooms':         return runListRooms(id);
    case 'update_room_rate':   return runUpdateRoomRate(id, args);
    case 'update_room_name':   return runUpdateRoomName(id, args);
    case 'list_availability':  return runListAvailability(id, args);
    case 'block_dates':        return runBlockDates(id, args);
    case 'unblock_dates':      return runUnblockDates(id, args);
    case 'dashboard_stats':    return runDashboardStats(id, args);
    case 'recent_bookings':    return runRecentBookings(id, args);
    case 'recent_inquiries':   return runRecentInquiries(id, args);
    default:
      return rpcError(id, -32602, `Unknown tool: ${name}`);
  }
}

// ── HTTP handlers ───────────────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  // Stateless JSON server — no SSE stream. Signal that only POST is supported.
  return NextResponse.json(
    { error: 'This MCP endpoint only supports POST (stateless JSON-RPC).' },
    { status: 405, headers: CORS_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  // Rate-limit BEFORE the auth check: isAuthorized() does a DB lookup for
  // OAuth tokens, so a scanner spraying random Bearer tokens would otherwise
  // pin the DB. 30 req/min is generous for real MCP clients, tight for bots.
  const ip = getClientIp(req.headers);
  const rl = rateLimit(`mcp:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Rate limit exceeded' } },
      {
        status: 429,
        headers: { ...CORS_HEADERS, 'Retry-After': String(rl.retryAfter) },
      }
    );
  }

  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } },
      {
        status: 401,
        headers: { ...CORS_HEADERS, 'WWW-Authenticate': wwwAuthenticateHeader() },
      }
    );
  }

  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, 'Parse error: invalid JSON.');
  }

  const { id, method, params } = body;

  // Notifications (no id) expect no response body.
  if (method?.startsWith('notifications/')) {
    return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
  }

  switch (method) {
    case 'initialize': {
      const requested = (params?.protocolVersion as string) || DEFAULT_PROTOCOL;
      return rpcResult(id, {
        protocolVersion: requested,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
    }
    case 'ping':
      return rpcResult(id, {});
    case 'tools/list':
      return rpcResult(id, { tools: TOOLS });
    case 'tools/call':
      return dispatchToolCall(id, params);
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}
