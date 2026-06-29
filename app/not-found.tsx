import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center bg-white pt-20">
        <div className="text-center px-4">
          <p className="font-playfair font-semibold text-8xl text-[#EEEDFE] mb-4">404</p>
          <h1 className="font-playfair font-semibold text-3xl text-[#1A0B2E] mb-3">Page Not Found</h1>
          <p className="font-montserrat text-sm text-gray-500 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/" className="btn-red py-3 px-8">Go Home</Link>
            <Link href="/rooms" className="border-2 border-[#1A0B2E] text-[#1A0B2E] font-montserrat font-semibold text-sm px-8 py-3 hover:bg-[#1A0B2E] hover:text-white transition-colors tracking-wider uppercase">
              View Rooms
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
