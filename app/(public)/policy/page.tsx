import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, CreditCard, Users, Car, BadgeCheck, Calendar } from 'lucide-react';
import TrackedLink from '@/components/TrackedLink';
import TrackedNavLink from '@/components/TrackedNavLink';

export const metadata: Metadata = {
  title: { absolute: 'Hotel Policies — Check-in, Payment & Stay Rules' },
  alternates: { canonical: '/policy' },
  description:
    'Hotel Elegant Multan policies: 24-hour check-in, 12-noon check-out, pay at hotel, extra beds PKR 2,500, free parking & WiFi. Flexible cancellation.',
};

const policies = [
  {
    Icon: Clock,
    title: 'Check-in & Check-out',
    items: [
      'Check-in: 24 hours — you may arrive at any time',
      'Check-out: by 12:00 noon',
      'Late check-out on request (subject to availability)',
      'Early check-in on request',
    ],
  },
  {
    Icon: CreditCard,
    title: 'Payment',
    items: [
      'No advance payment required to make a booking request',
      'Pay at the hotel at checkout',
      'Accepted: Visa, Mastercard, Cash',
      'Rates confirmed via WhatsApp or call before arrival',
    ],
  },
  {
    Icon: Users,
    title: 'Children & Extra Beds',
    items: [
      'Children aged 10 years and above are welcome',
      'Extra bed: PKR 2,500 per person per night',
      'No cots or cribs available',
      'Children must be included in the guest count at booking',
    ],
  },
  {
    Icon: Car,
    title: 'Parking, WiFi & Pets',
    items: [
      'Free private parking available for all guests',
      'Free high-speed WiFi throughout the hotel',
      'Pets are not allowed on the premises',
      'Smoking is not permitted in rooms',
    ],
  },
  {
    Icon: BadgeCheck,
    title: 'Guest Requirements',
    items: [
      'Guests must provide a valid address and phone number at check-in',
      'No minimum age requirement',
      'No curfew — the hotel is accessible 24/7',
      'Valid ID may be requested at check-in',
    ],
  },
  {
    Icon: Calendar,
    title: 'Long Stays & Cancellation',
    items: [
      'Long stays: 1 to 90 nights welcome',
      'Corporate and monthly packages available — contact us',
      'Cancellation policy: flexible — confirm via WhatsApp or call',
      'No strict penalty — we work with you',
    ],
  },
];

export default function PolicyPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#1A0B2E] pt-32 pb-16">
        <div className="container-xl text-center">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
            Transparency First
          </p>
          <h1 className="font-playfair font-semibold text-4xl md:text-5xl text-white mb-4">
            Hotel Policies
          </h1>
          <p className="font-montserrat text-white/80 text-base max-w-xl mx-auto">
            Clear, fair policies — no hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Policies Grid */}
      <section className="section-pad bg-white">
        <div className="container-xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {policies.map(({ Icon, title, items }) => (
              <div key={title} className="border border-gray-100 p-7 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-[#1A0B2E]/5 flex items-center justify-center">
                    <Icon size={20} className="text-[#E30613]" />
                  </div>
                  <h2 className="font-playfair font-semibold text-lg text-[#1A0B2E]">{title}</h2>
                </div>
                <ul className="space-y-2.5">
                  {items.map((item, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E30613] mt-1.5 shrink-0" />
                      <span className="font-montserrat text-sm text-gray-600 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Cancellation note */}
          <div className="mt-10 bg-[#1A0B2E]/5 border border-[#1A0B2E]/20 p-6 text-center">
            <p className="font-montserrat font-semibold text-sm text-[#1A0B2E] mb-1">
              Flexible Cancellation Policy
            </p>
            <p className="font-montserrat text-sm text-gray-600">
              We understand plans change. Contact us on WhatsApp or call{' '}
              <TrackedLink href="tel:+923173330998" event="call_click" eventParams={{ location: 'policy_page' }} className="text-[#E30613] font-semibold">
                0317-333-0998
              </TrackedLink>{' '}
              to modify or cancel your booking at any time.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1A0B2E] py-16">
        <div className="container-xl text-center">
          <h2 className="font-playfair font-semibold text-3xl text-white mb-6">
            Questions About Our Policies?
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <TrackedNavLink href="/booking" event="book_now_click" eventParams={{ location: 'policy_final_cta' }} className="btn-red py-3 px-10">Book Now</TrackedNavLink>
            <TrackedLink href="https://wa.me/923173330998" target="_blank" rel="noopener noreferrer" event="whatsapp_click" eventParams={{ location: 'policy_final_cta' }} className="btn-whatsapp py-3 px-10">
              WhatsApp Us
            </TrackedLink>
          </div>
        </div>
      </section>
    </>
  );
}
