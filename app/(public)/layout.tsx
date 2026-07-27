import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FloatingButtons from '@/components/FloatingButtons';
import UtmCapture from '@/app/lp/_components/UtmCapture';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Capture UTM / gclid / fbclid on ANY public landing (organic search,
          direct, ads, blog links) — not just the /lp/* pages. The booking
          form reads this from sessionStorage and stores it with the booking. */}
      <UtmCapture />
      <Header />
      <main>{children}</main>
      <Footer />
      <FloatingButtons />
    </>
  );
}
