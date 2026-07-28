import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export type UserRole = 'admin' | 'receptionist';

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
}

// ── Shared role reader ──────────────────────────────────────────────────
// Reads the currently-authenticated staff user + their role from the
// admin_users table. Uses the *service* client for the role lookup so
// receptionists (whose RLS only lets them read their own row) still work
// consistently, and so this helper is safe to call from any server surface
// without worrying about which client leaked cookies.

export async function getCurrentUser(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();

  // Try with the role column first. If the migration hasn't been applied
  // yet the query errors with 42703 (undefined_column); fall back to the
  // pre-role schema and assume 'admin' so existing accounts keep working.
  const withRole = await service
    .from('admin_users')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle();

  if (withRole.data) {
    return {
      id: withRole.data.id,
      email: withRole.data.email,
      role: (withRole.data.role || 'admin') as UserRole,
    };
  }

  // Column missing (migration pending) — fall back so the app doesn't crash.
  const fallback = await service
    .from('admin_users')
    .select('id, email')
    .eq('id', user.id)
    .maybeSingle();

  if (!fallback.data) return null;
  return { id: fallback.data.id, email: fallback.data.email, role: 'admin' };
}

// ── Path-level access ────────────────────────────────────────────────────
// Receptionists get access ONLY to bookings + inquiries surfaces. Any
// attempt to open a broader admin path is bounced to /admin/bookings, which
// is the receptionist's implicit home page.
const RECEPTION_ALLOWED_PREFIXES = [
  '/admin/bookings',    // list + detail + new + status form
  '/admin/inquiries',   // list + convert flow
];

export function canReceptionAccess(pathname: string): boolean {
  return RECEPTION_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// ── Page guards ──────────────────────────────────────────────────────────
// Call at the top of an admin page's server component to enforce access.

/** Any authenticated staff (admin or receptionist). Redirects to login otherwise. */
export async function requireStaff(): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');
  return user;
}

/** Full admin only. Receptionists get bounced to their allowed home page. */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');
  if (user.role !== 'admin') redirect('/admin/bookings');
  return user;
}
