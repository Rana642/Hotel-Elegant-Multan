import type { Metadata } from 'next';
import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, Linkedin, Youtube, MessageCircle } from 'lucide-react';
import ContactForm from './ContactForm';
import TrackedLink from '@/components/TrackedLink';

export const metadata: Metadata = {
  title: { absolute: 'Contact — Hotel in Gulgasht Colony, Multan' },
  alternates: { canonical: '/contact' },
  description:
    'Contact Hotel Elegant Executive Suites Multan. Phone: 0317-333-0998. Address: 77-A Gulgasht Colony, Multan. 24/7 reception. Book a room or ask a question.',
  openGraph: {
    title: 'Contact Hotel Elegant — Multan Hotel near Airport',
    images: [{ url: '/hero-poster.jpg', width: 1280, height: 720, alt: 'Hotel Elegant Executive Suites Multan' }],
  },
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#1A0B2E] pt-32 pb-16">
        <div className="container-xl text-center">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
            We're Here 24/7
          </p>
          <h1 className="font-playfair font-semibold text-4xl md:text-5xl text-white mb-4">
            Contact Hotel Elegant — Gulgasht Colony, Multan
          </h1>
          <p className="font-montserrat text-white/80 text-base max-w-xl mx-auto">
            Book a room, ask a question or just say hello — we reply fast.
          </p>
        </div>
      </section>

      {/* Form + Info */}
      <section className="section-pad bg-white">
        <div className="container-xl">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <h2 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-6">
                Send Us a Message
              </h2>
              <ContactForm />
            </div>

            {/* Info block */}
            <div className="bg-[#1A0B2E] text-white p-8">
              <h2 className="font-playfair font-semibold text-xl mb-8">Hotel Information</h2>
              <ul className="space-y-5">
                <li className="flex gap-4 items-start">
                  <MapPin size={18} className="text-[#E30613] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-montserrat font-semibold text-sm mb-0.5">Address</p>
                    <p className="font-montserrat text-white/80 text-sm leading-relaxed">
                      77-A Gulgasht Colony, Multan, Punjab 60750, Pakistan
                    </p>
                  </div>
                </li>
                <li className="flex gap-4 items-start">
                  <Phone size={18} className="text-[#E30613] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-montserrat font-semibold text-sm mb-0.5">Phone</p>
                    <TrackedLink href="tel:+923173330998" event="call_click" eventParams={{ location: 'contact_info' }} className="font-montserrat text-white/80 text-sm hover:text-white transition-colors">
                      0317-333-0998
                    </TrackedLink>
                  </div>
                </li>
                <li className="flex gap-4 items-start">
                  <Mail size={18} className="text-[#E30613] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-montserrat font-semibold text-sm mb-0.5">Email</p>
                    <a href="mailto:info@elegant-suite.com" className="font-montserrat text-white/80 text-sm hover:text-white transition-colors">
                      info@elegant-suite.com
                    </a>
                  </div>
                </li>
                <li className="flex gap-4 items-start">
                  <Clock size={18} className="text-[#E30613] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-montserrat font-semibold text-sm mb-0.5">Reception</p>
                    <p className="font-montserrat text-white/80 text-sm">24 hours, 7 days a week</p>
                  </div>
                </li>
              </ul>

              {/* Social links */}
              <div className="mt-8 pt-6 border-t border-white/15">
                <p className="font-montserrat font-semibold text-xs tracking-widest uppercase text-white/80 mb-4">
                  Follow Us
                </p>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { Icon: Facebook, href: 'https://www.facebook.com/ElegantSuitesMultan', label: 'Facebook' },
                    { Icon: Instagram, href: 'https://www.instagram.com/elegantsuitesmultan', label: 'Instagram' },
                    { Icon: Linkedin, href: 'https://www.linkedin.com/company/101358499/', label: 'LinkedIn' },
                    { Icon: Youtube, href: 'https://www.youtube.com/@ElegantSuitesMultan/', label: 'YouTube' },
                  ].map(({ Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="w-9 h-9 border border-white/15 flex items-center justify-center text-white/80 hover:border-[#E30613] hover:text-[#E30613] transition-colors"
                    >
                      <Icon size={15} />
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-6 space-y-3">
                <TrackedLink href="tel:+923173330998" event="call_click" eventParams={{ location: 'contact_quick_actions' }} className="flex items-center justify-center gap-2 w-full py-3 bg-[#E30613] text-white font-montserrat font-semibold text-sm tracking-wider uppercase hover:bg-red-700 transition-colors">
                  <Phone size={15} /> Call Now
                </TrackedLink>
                <TrackedLink href="https://wa.me/923173330998" target="_blank" rel="noopener noreferrer" event="whatsapp_click" eventParams={{ location: 'contact_quick_actions' }} className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-white font-montserrat font-semibold text-sm tracking-wider uppercase hover:bg-green-600 transition-colors">
                  <MessageCircle size={15} /> WhatsApp Us
                </TrackedLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="bg-white pb-12">
        <div className="container-xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-playfair font-semibold text-xl text-[#1A0B2E]">Find Us</h2>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Hotel+Elegant+Executive+Suites+Multan"
              target="_blank"
              rel="noopener noreferrer"
              className="font-montserrat text-sm text-[#E30613] hover:underline font-semibold flex items-center gap-1"
            >
              Get Directions →
            </a>
          </div>
          <div className="overflow-hidden border border-gray-100">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3447.68288744653!2d71.4682164119909!3d30.217597010239494!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x393b331f4190289f%3A0xcf0b199665e27a0e!2sHotel%20Elegant%20Executive%20Suites%20Multan!5e0!3m2!1sen!2s!4v1780433086298!5m2!1sen!2s"
              width="100%"
              height="380"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Hotel Elegant Executive Suites Multan location map"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1A0B2E] py-16">
        <div className="container-xl text-center">
          <h2 className="font-playfair font-semibold text-3xl text-white mb-6">
            Ready to Book?
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/booking" className="btn-red py-3 px-10">Book a Room</Link>
            <TrackedLink href="tel:+923173330998" event="call_click" eventParams={{ location: 'contact_final_cta' }} className="btn-outline-white py-3 px-10">Call Us</TrackedLink>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: process.env.NEXT_PUBLIC_SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'Contact', item: `${process.env.NEXT_PUBLIC_SITE_URL}/contact` },
            ],
          }),
        }}
      />
    </>
  );
}
