import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: { absolute: 'Privacy Policy — Hotel Elegant Multan' },
  description:
    'How Hotel Elegant Executive Suites Multan collects, uses and protects your information when you browse our website or make a booking request.',
  alternates: { canonical: '/privacy-policy' },
};

const sections = [
  {
    h: 'Information We Collect',
    body: [
      'When you submit a booking request or contact form, we collect the details you provide: your name, phone / WhatsApp number, email address (optional), stay dates, and any special requests.',
      'We do not collect or store any card or payment information on this website — payment is made at the hotel on checkout.',
    ],
  },
  {
    h: 'How We Use Your Information',
    body: [
      'Your details are used only to process and confirm your booking (via WhatsApp or phone call), to communicate about your stay, and to send a booking confirmation email if you provided an email address.',
      'We do not sell, rent, or share your personal information with third parties for marketing purposes.',
    ],
  },
  {
    h: 'Data Storage & Security',
    body: [
      'Booking details are stored securely in our reservation system with access restricted to hotel management. The website is served over HTTPS so information you submit is encrypted in transit.',
    ],
  },
  {
    h: 'Cookies & Analytics',
    body: [
      'This website may use basic analytics to understand how visitors use the site (pages visited, device type). This data is aggregated and does not personally identify you.',
    ],
  },
  {
    h: 'Third-Party Links',
    body: [
      'Our website links to external services such as WhatsApp, Google Maps, and Booking.com. Those services have their own privacy policies, and we are not responsible for their practices.',
    ],
  },
  {
    h: 'Your Rights',
    body: [
      'You may ask us at any time to view, correct, or delete the personal information we hold about you. Contact us at info@elegant-suite.com or call 0317-333-0998 and we will respond promptly.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <section className="bg-[#1A0B2E] pt-32 pb-16">
        <div className="container-xl text-center">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
            Your Privacy Matters
          </p>
          <h1 className="font-playfair font-semibold text-4xl md:text-5xl text-white mb-4">
            Privacy Policy
          </h1>
          <p className="font-montserrat text-white/80 text-base max-w-xl mx-auto">
            How Hotel Elegant Executive Suites Multan handles your information.
          </p>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-xl max-w-3xl">
          <p className="font-montserrat text-sm text-gray-500 mb-10">
            Last updated: July 2026 · This policy applies to elegant-suite.com, the website of
            Hotel Elegant Executive Suites, 77-A Gulgasht Colony, Multan, Pakistan.
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
              Questions about this policy? Email{' '}
              <a href="mailto:info@elegant-suite.com" className="text-[#E30613] underline">
                info@elegant-suite.com
              </a>{' '}
              or call{' '}
              <a href="tel:+923173330998" className="text-[#E30613] underline">
                0317-333-0998
              </a>
              . See also our{' '}
              <Link href="/terms" className="text-[#E30613] underline">
                Terms &amp; Conditions
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
