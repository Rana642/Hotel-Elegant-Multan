import type { Metadata } from 'next';
import Image from 'next/image';
import AdminLoginForm from './AdminLoginForm';

export const metadata: Metadata = {
  title: 'Admin Login — Hotel Elegant',
  robots: { index: false },
};

// Never cache the login route. Without this, Next.js treated it as fully
// static and the CDN cached it for s-maxage=31536000 (1 year). If the origin
// ever returned a not-found fallback (e.g. during the July 503 outage), that
// bad payload got pinned to the URL and every subsequent request served a
// broken mix of RSC data + login HTML that rendered as raw text.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#1A0B2E] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Hotel Elegant Executive Suites Multan" width={140} height={70} className="object-contain h-16 w-auto mx-auto mb-2" />
          <p className="text-[#E30613] text-xs font-montserrat font-semibold tracking-widest uppercase">
            Admin Dashboard
          </p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
