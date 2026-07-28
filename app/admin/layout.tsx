import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import AdminSidebar from './AdminSidebar';
import { getCurrentUser, canReceptionAccess } from '@/lib/auth';

export const metadata = {
  title: { default: 'Admin — Hotel Elegant', template: '%s | Admin · Hotel Elegant' },
  robots: { index: false },
};

// Force this layout to run on every request — the middleware only checks
// authentication; role-based path enforcement happens here so a
// receptionist typing /admin/settings in the URL gets bounced, not just
// hidden from the sidebar.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Auth middleware normally catches the no-user case, but if the auth row
  // is missing from admin_users (e.g. deleted while a session was live)
  // we should not render the shell at all.
  if (!user) redirect('/admin/login');

  // Path-level enforcement for receptionists. We read the pathname off the
  // request headers Next.js injects (x-invoke-path / next-url) — this is
  // the only reliable way to know the current path inside a layout server
  // component.
  const hdrs = await headers();
  const pathname = hdrs.get('x-pathname') || '';
  if (
    user.role === 'receptionist' &&
    pathname.startsWith('/admin') &&
    !pathname.startsWith('/admin/login') &&
    !canReceptionAccess(pathname)
  ) {
    redirect('/admin/bookings');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar userRole={user.role} />
      {/* pb on mobile clears the fixed bottom tab bar; lg resets it */}
      <main className="flex-1 overflow-auto pb-24 lg:pb-0">{children}</main>
    </div>
  );
}
