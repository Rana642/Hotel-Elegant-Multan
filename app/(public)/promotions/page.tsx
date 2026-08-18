import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { getActivePromotions } from '@/lib/promotions';
import PromotionTabs from './PromotionTabs';
import ContactIntentButton from '@/app/_components/ContactIntentButton';

export const metadata: Metadata = {
  title: { absolute: 'Special Offers & Deals — Hotel Elegant Executive Suites Multan' },
  description:
    'Current promotions and special offers at Hotel Elegant Executive Suites, Multan — early booking, last-minute and long-stay deals. Best direct rate, no advance payment, confirm on WhatsApp.',
  alternates: { canonical: '/promotions' },
};

// Public data, cookie-free fetch — safe to serve from ISR cache.
export const revalidate = 60;

export default async function PromotionsPage() {
  const promotions = await getActivePromotions();

  return (
    <div className="pt-24 pb-20 min-h-[70vh]">
      <div className="container-xl">
        <div className="text-center mb-12">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
            Deals &amp; Offers
          </p>
          <h1 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E] mb-3">
            Exclusive Deals &amp; Special Offers
          </h1>
          <p className="font-montserrat text-sm text-gray-500 max-w-2xl mx-auto">
            Book direct with Hotel Elegant Executive Suites, Multan for our best rates. No advance payment — we confirm every booking on WhatsApp or by call.
          </p>
        </div>

        {promotions.length > 0 ? (
          <PromotionTabs promotions={promotions} />
        ) : (
          <div className="max-w-xl mx-auto text-center bg-[#1A0B2E]/[0.03] border border-gray-100 p-10">
            <p className="font-montserrat text-gray-500 text-sm mb-6">
              No special offers are running right now — but booking direct always gets you our best rate with no advance payment. Message us for the current best price.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/booking" className="btn-red py-3 px-8 text-xs">Check Availability</Link>
              <ContactIntentButton
                channel="whatsapp"
                ariaLabel="WhatsApp the hotel"
                className="btn-whatsapp inline-flex items-center gap-2 py-3 px-8"
              >
                <MessageCircle size={16} /> WhatsApp Us
              </ContactIntentButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
