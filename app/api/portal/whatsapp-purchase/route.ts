import { NextResponse } from "next/server";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * WhatsApp booking → Meta Purchase, sent from the Ads by Shoaib client portal
 * when staff mark a WhatsApp chat "Booked" that was NOT also entered in this
 * site's admin (an admin-entered booking already sends its own Purchase).
 * Uses this site's pixel + token, so no Meta secret leaves the hotel site.
 *
 * Signed like /api/portal/booking-completed: HMAC-SHA256 of `${ts}.${body}`
 * keyed by this site's SUPABASE_SERVICE_ROLE_KEY (the portal holds the same
 * key, encrypted). 5-minute window. event_id `wa-booking-<chat id>` lets Meta
 * de-duplicate retries.
 */
export const dynamic = "force-dynamic";

const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
const phoneDigits = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.startsWith("0") ? `92${d.slice(1)}` : d;
};

function validSignature(raw: string, ts: string, sig: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !/^\d{10,13}$/.test(ts) || !/^[a-f0-9]{64}$/.test(sig)) return false;
  if (Math.abs(Date.now() - Number(ts)) > 5 * 60 * 1000) return false;
  const expected = createHmac("sha256", key).update(`${ts}.${raw}`).digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-portal-ts") ?? "", request.headers.get("x-portal-signature") ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = JSON.parse(raw) as { eventId?: string; phone?: string; name?: string; value?: number; contentName?: string; eventTime?: number };
  if (!/^wa-booking-[0-9a-f-]{36}$/.test(b.eventId ?? "") || !b.phone || !(Number(b.value) > 0)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const pixel = process.env.META_PIXEL_ID;
  const token = process.env.META_ACCESS_TOKEN;
  if (!pixel || !token) return NextResponse.json({ error: "Pixel not configured" }, { status: 500 });

  const [fn, ...rest] = (b.name ?? "").trim().split(/\s+/).filter(Boolean);
  const user_data: Record<string, string[]> = { ph: [sha(phoneDigits(b.phone))] };
  if (fn) user_data.fn = [sha(fn)];
  if (rest.length) user_data.ln = [sha(rest.join(" "))];

  const res = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: token,
      data: [
        {
          event_name: "Purchase",
          event_id: b.eventId,
          event_time: Math.floor((b.eventTime ?? Date.now()) / 1000),
          action_source: "chat",
          user_data,
          custom_data: { currency: "PKR", value: Number(b.value), content_name: b.contentName || "Hotel Room" },
        },
      ],
    }),
  });
  const json = await res.json().catch(() => ({}));
  return NextResponse.json({ ok: res.ok, meta: json }, { status: res.ok ? 200 : 502 });
}
