import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/mcpOauth';

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
      'List every room at Hotel Elegant Executive Suites with its slug, display name, regular price and current discounted (offer) price in PKR. Use this first to see exact slugs and current values before updating anything.',
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
    .select('slug, name, price_per_night, offer_price, is_active')
    .order('sort_order');
  if (error) return toolError(id, `Could not read rooms: ${error.message}`);

  const rooms = (data || []).map((r) => ({
    slug: r.slug,
    name: r.name,
    original_price: r.price_per_night,
    discount_price: r.offer_price,
    is_active: r.is_active,
  }));

  const lines = rooms.map(
    (r) =>
      `- ${r.name} (${r.slug}): original PKR ${r.original_price ?? '—'}, discount PKR ${
        r.discount_price ?? '—'
      }${r.is_active ? '' : ' [inactive]'}`
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

async function dispatchToolCall(id: JsonRpcRequest['id'], params: Record<string, unknown> | undefined) {
  const name = params?.name as string | undefined;
  const args = (params?.arguments as Record<string, unknown>) || {};
  switch (name) {
    case 'list_rooms':
      return runListRooms(id);
    case 'update_room_rate':
      return runUpdateRoomRate(id, args);
    case 'update_room_name':
      return runUpdateRoomName(id, args);
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
