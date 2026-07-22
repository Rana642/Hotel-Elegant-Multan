// Simple in-memory rate limiter. Works because the app runs as a single
// persistent Node process on Hostinger (pm2 -i 1) — no need for Redis. Resets
// on deploy/restart, which is fine: the goal is to blunt bot floods that were
// exhausting the host's Max Processes limit and causing 503s.

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

// Sweep expired buckets so the Map doesn't grow forever under attack.
// .unref() so this timer doesn't keep the process alive on its own.
if (typeof setInterval !== 'undefined') {
  const t = setInterval(() => {
    const now = Date.now();
    // Array.from avoids the ES5 downlevel-iteration issue with `for..of Map`
    Array.from(store.entries()).forEach(([k, b]) => {
      if (b.resetAt < now) store.delete(k);
    });
  }, 60_000);
  if (typeof (t as { unref?: () => void }).unref === 'function') {
    (t as { unref: () => void }).unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the current window resets (only meaningful when allowed=false). */
  retryAfter: number;
}

/**
 * Fixed-window rate limit: allow up to `limit` requests per `windowMs` for the
 * given `key`. Once exceeded, all further calls in the window are rejected.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const b = store.get(key);
  if (!b || b.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfter: 0 };
}

/**
 * Best-effort client IP from a Headers object. Hostinger sits behind its own
 * CDN, so x-forwarded-for is normally set; falls back to a synthetic key so
 * missing headers don't disable rate-limiting entirely.
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    // First entry is the original client
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'unknown';
}
