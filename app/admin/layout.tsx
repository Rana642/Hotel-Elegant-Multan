import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import AdminSidebar from './AdminSidebar';
import { getCurrentUser, canReceptionAccess } from '@/lib/auth';

export const metadata = {
  title: { default: 'Admin — Hotel Elegant', template: '%s | Admin · Hotel Elegant' },
  robots: { index: false },
};

// Force this layout to run on every request — role-based path enforcement
// happens here so a receptionist typing /admin/settings in the URL gets
// bounced, not just hidden from the sidebar.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const pathname = hdrs.get('x-pathname') || '';

  // /admin/login must never require a session — that's the page you visit
  // BEFORE having one. Skip the guard AND the chrome (sidebar) so the login
  // form gets a clean full-width canvas.
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const user = await getCurrentUser();
  // Middleware normally intercepts the no-user case and redirects to login,
  // but if the auth row is missing from admin_users (e.g. deleted while a
  // session was live) we bounce to login here as a fallback.
  if (!user) redirect('/admin/login');

  // Path-level enforcement for receptionists.
  if (
    user.role === 'receptionist' &&
    pathname.startsWith('/admin') &&
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
