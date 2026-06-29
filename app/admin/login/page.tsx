import type { Metadata } from 'next';
import Image from 'next/image';
import AdminLoginForm from './AdminLoginForm';

export const metadata: Metadata = {
  title: 'Admin Login — Hotel Elegant',
  robots: { index: false },
};

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
