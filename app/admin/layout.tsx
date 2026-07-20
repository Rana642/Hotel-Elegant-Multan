import AdminSidebar from './AdminSidebar';

export const metadata = {
  title: { default: 'Admin — Hotel Elegant', template: '%s | Admin · Hotel Elegant' },
  robots: { index: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      {/* pb on mobile clears the fixed bottom tab bar; lg resets it */}
      <main className="flex-1 overflow-auto pb-24 lg:pb-0">{children}</main>
    </div>
  );
}
