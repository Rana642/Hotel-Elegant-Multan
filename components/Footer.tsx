import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';

const quickLinks = [
  { label: 'Home', href: '/' },
  { label: 'Rooms & Suites', href: '/rooms' },
  { label: 'Book Now', href: '/booking' },
  { label: 'About Us', href: '/about' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Contact', href: '/contact' },
  { label: 'Hotel Policy', href: '/policy' },
];

const socials = [
  { Icon: Facebook, href: 'https://www.facebook.com/ElegantSuitesMultan', label: 'Facebook' },
  { Icon: Instagram, href: 'https://www.instagram.com/elegantsuitesmultan', label: 'Instagram' },
  { Icon: Linkedin, href: 'https://www.linkedin.com/company/101358499/', label: 'LinkedIn' },
  { Icon: Youtube, href: 'https://www.youtube.com/@ElegantSuitesMultan/', label: 'YouTube' },
];

export default function Footer() {
  return (
    <footer className="bg-[#1A0B2E] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Image
              src="/logo.png"
              alt="Hotel Elegant Executive Suites Multan"
              width={160}
              height={80}
              className="object-contain h-20 w-auto mb-3"
            />

            <p className="text-[#C9BFE0] font-montserrat text-sm leading-relaxed mb-6 max-w-sm">
              Stay in Comfort. Live in Elegance. — Multan's top-rated boutique executive hotel in
              the heart of Gulgasht Colony.
            </p>
            <div className="flex gap-3">
              {socials.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 border border-[#2D1B5C] flex items-center justify-center
                             hover:border-[#E30613] hover:text-[#E30613] transition-colors text-[#C9BFE0]"
                >
                  <Icon size={16} />
                </a>
              ))}
              <a
                href="https://www.tiktok.com/@ElegantSuitesMultan"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-9 h-9 border border-[#2D1B5C] flex items-center justify-center
                           hover:border-[#E30613] hover:text-[#E30613] transition-colors text-[#C9BFE0]
                           font-bold text-xs"
              >
                TT
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-montserrat font-semibold text-sm tracking-widest uppercase text-[#C9BFE0] mb-5">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-montserrat text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-montserrat font-semibold text-sm tracking-widest uppercase text-[#C9BFE0] mb-5">
              Contact
            </h3>
            <ul className="space-y-3">
              <li className="flex gap-3 items-start">
                <MapPin size={15} className="text-[#E30613] mt-0.5 shrink-0" />
                <span className="font-montserrat text-sm text-white/70 leading-relaxed">
                  77-A Gulgasht Colony, Multan, Punjab 60750, Pakistan
                </span>
              </li>
              <li className="flex gap-3 items-center">
                <Phone size={15} className="text-[#E30613] shrink-0" />
                <a
                  href="tel:+923173330998"
                  className="font-montserrat text-sm text-white/70 hover:text-white transition-colors"
                >
                  0317-333-0998
                </a>
              </li>
              <li className="flex gap-3 items-center">
                <Mail size={15} className="text-[#E30613] shrink-0" />
                <a
                  href="mailto:info@elegant-suite.com"
                  className="font-montserrat text-sm text-white/70 hover:text-white transition-colors"
                >
                  info@elegant-suite.com
                </a>
              </li>
            </ul>
            <div className="mt-5 flex gap-2">
              <a href="tel:+923173330998" className="flex-1 text-center py-2 bg-[#E30613] text-white font-montserrat font-semibold text-xs tracking-wider uppercase hover:bg-red-700 transition-colors">
                Call
              </a>
              <a href="https://wa.me/923173330998" target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 bg-[#25D366] text-white font-montserrat font-semibold text-xs tracking-wider uppercase hover:bg-green-600 transition-colors">
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#2D1B5C] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-montserrat text-xs text-white/40 text-center sm:text-left">
            © 2026 Hotel Elegant Executive Suites, Multan. All rights reserved.
          </p>
          <p className="font-montserrat text-xs text-white/40">
            Rated 4.4★ on Google · 8.0 on Booking.com
          </p>
        </div>
      </div>
    </footer>
  );
}
