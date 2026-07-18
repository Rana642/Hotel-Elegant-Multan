import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: { absolute: 'Terms & Conditions — Hotel Elegant Multan' },
  description:
    'Booking terms for Hotel Elegant Executive Suites Multan — reservations, check-in/check-out, payment at hotel, cancellations and guest responsibilities.',
  alternates: { canonical: '/terms' },
};

const sections = [
  {
    h: 'Bookings & Confirmation',
    body: [
      'Submitting a booking request on this website does not require any advance payment. A reservation becomes confirmed only after our team verifies availability and confirms with you via WhatsApp or phone call.',
      'Please provide an accurate phone / WhatsApp number — we use it to confirm your reservation, usually within minutes.',
    ],
  },
  {
    h: 'Check-in & Check-out',
    body: [
      'Check-in is available 24 hours a day. Check-out is by 12:00 noon. Early check-in and late check-out are subject to availability — call or WhatsApp us to arrange.',
      'A valid CNIC (for Pakistani nationals) or passport (for foreign guests) is required at check-in, as per hotel regulations in Pakistan.',
    ],
  },
  {
    h: 'Payment',
    body: [
      'Payment is made at the hotel — we accept Visa, Mastercard and cash. No online payment is taken through this website.',
      'Room rates shown on the website are per night. Any active offer price shown is the rate charged for new bookings while the offer is running.',
    ],
  },
  {
    h: 'Cancellations & Changes',
    body: [
      'We keep cancellations flexible: contact us by phone or WhatsApp to change or cancel your booking. Since no advance payment is taken, there are no online cancellation fees.',
      'If your plans change, please inform us as early as possible so the room can be released for other guests.',
    ],
  },
  {
    h: 'Children & Extra Beds',
    body: [
      'Children aged 10 years and above are welcome. Extra beds are available at PKR 2,500 per bed per night (maximum 2 per room). Cots/cribs are not available.',
    ],
  },
  {
    h: 'Guest Conduct & Liability',
    body: [
      'Guests are responsible for any damage caused to hotel property during their stay. Smoking is only permitted in designated areas.',
      'The hotel is not liable for loss of valuables left in rooms; please use reception for safekeeping of important items.',
    ],
  },
  {
    h: 'Website Content',
    body: [
      'We work to keep room details, prices and photos accurate and current, but details may change; the confirmation you receive from our team is authoritative for your booking.',
    ],
  },
  {
    h: 'Governing Law',
    body: [
      'These terms are governed by the laws of Pakistan. Any disputes fall under the jurisdiction of the courts of Multan.',
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <section className="bg-[#1A0B2E] pt-32 pb-16">
        <div className="container-xl text-center">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
            The Fine Print, Kept Simple
          </p>
          <h1 className="font-playfair font-semibold text-4xl md:text-5xl text-white mb-4">
            Terms &amp; Conditions
          </h1>
          <p className="font-montserrat text-white/80 text-base max-w-xl mx-auto">
            Booking terms for Hotel Elegant Executive Suites, Gulgasht Colony, Multan.
          </p>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-xl max-w-3xl">
          <p className="font-montserrat text-sm text-gray-500 mb-10">
            Last updated: July 2026 · By using elegant-suite.com or submitting a booking request,
            you agree to the terms below.
          </p>
          <div className="space-y-10">
            {sections.map((s) => (
              <div key={s.h}>
                <h2 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-3">{s.h}</h2>
                {s.body.map((p, i) => (
                  <p key={i} className="font-montserrat text-sm text-gray-600 leading-relaxed mb-3">
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-[#1A0B2E]/5 border border-gray-100">
            <p className="font-montserrat text-sm text-gray-600 leading-relaxed">
              Questions? Call{' '}
              <a href="tel:+923173330998" className="text-[#E30613] underline">
                0317-333-0998
              </a>{' '}
              or WhatsApp us anytime. See also our{' '}
              <Link href="/privacy-policy" className="text-[#E30613] underline">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link href="/policy" className="text-[#E30613] underline">
                Hotel Policies
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
