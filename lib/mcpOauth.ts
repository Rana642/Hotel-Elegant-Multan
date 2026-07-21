import { randomBytes, createHash } from 'crypto';

// ── Timeouts ─────────────────────────────────────────────────────────────
export const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes to complete the code exchange
export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
export const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com').replace(/\/$/, '');
}

export function getMcpResourceUrl(): string {
  return `${getSiteUrl()}/api/mcp`;
}

export function generateId(prefix: string, bytes = 24): string {
  return `${prefix}_${randomBytes(bytes).toString('hex')}`;
}

/** PKCE S256: challenge = base64url(sha256(verifier)). */
export function pkceMatches(verifier: string, challenge: string): boolean {
  if (!verifier || !challenge) return false;
  const computed = createHash('sha256').update(verifier).digest('base64url');
  return computed === challenge;
}

// ── In-memory rate limiter for the /authorize password form ────────────────
// Deliberately in-process (not Supabase-backed): the app runs as a single
// persistent Node process on Hostinger (not serverless), so this survives
// for the life of the process, which is enough to blunt naive brute-forcing
// of MCP_OWNER_PASSWORD. It resets on deploy/restart — acceptable, since the
// long random MCP_AUTH_TOKEN remains the strong credential for API/CLI use.
const FAILED_ATTEMPTS = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function isLockedOut(key: string): boolean {
  const entry = FAILED_ATTEMPTS.get(key);
  return !!entry && entry.lockedUntil > Date.now();
}

export function recordFailedAttempt(key: string): void {
  const entry = FAILED_ATTEMPTS.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0;
  }
  FAILED_ATTEMPTS.set(key, entry);
}

export function clearFailedAttempts(key: string): void {
  FAILED_ATTEMPTS.delete(key);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
