import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FloatingButtons from '@/components/FloatingButtons';
import MobileStickyBar from '@/components/MobileStickyBar';
import UtmCapture from '@/app/lp/_components/UtmCapture';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Capture UTM / gclid / fbclid on ANY public landing (organic search,
          direct, ads, blog links) — not just the /lp/* pages. The booking
          form reads this from sessionStorage and stores it with the booking. */}
      <UtmCapture />
      <Header />
      {/* Bottom padding matches the mobile sticky bar height so page content
          never hides behind it on phones; desktop stays untouched. */}
      <main className="pb-16 md:pb-0">{children}</main>
      <Footer />
      {/* Desktop: floating round buttons (unchanged). Mobile: full-width
          3-button sticky bar (WhatsApp · Call · Book) — same pattern as the
          /lp/* pages so the whole site has consistent mobile CTA reach. */}
      <FloatingButtons />
      <MobileStickyBar />
    </>
  );
}
