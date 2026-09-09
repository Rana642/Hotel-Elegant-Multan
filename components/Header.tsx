'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone, MessageCircle } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import ContactIntentButton from '@/app/_components/ContactIntentButton';
import ReservationModal from './ReservationModal';

const nav = [
  { label: 'Rooms', href: '/rooms' },
  { label: 'Promotions', href: '/promotions' },
  { label: 'About', href: '/about' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
  { label: 'Policy', href: '/policy' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const pathname = usePathname();

  const openReservation = () => {
    trackEvent('book_now_click', { location: 'header_reservation' });
    setResOpen(true);
  };

  const isHome = pathname === '/';
  const solid = !isHome || scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        solid ? 'bg-white shadow-md' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <span className="bg-white rounded-md px-2.5 py-1.5 inline-flex items-center">
              <Image
                src="/logo-full.png"
                alt="Hotel Elegant Executive Suites Multan"
                width={220}
                height={147}
                className="object-contain h-11 w-auto"
                priority
              />
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6 flex-1 justify-center">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`font-montserrat font-medium text-sm tracking-wide hover:text-[#E30613] transition-colors ${
                  solid ? 'text-gray-800' : 'text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop right column: phone row on top, Reservation button below */}
          <div className="hidden lg:flex flex-col items-stretch gap-1.5 shrink-0">
            <div className="flex items-center justify-end gap-2.5">
              <ContactIntentButton
                channel="call"
                ariaLabel="Call the hotel"
                className={`flex items-center gap-1.5 font-montserrat font-semibold text-sm transition-colors ${
                  solid ? 'text-gray-800' : 'text-white'
                } hover:text-[#E30613]`}
              >
                <Phone size={14} className="text-[#E30613]" />
                0317-333-0998
              </ContactIntentButton>
              <span className={`h-4 w-px ${solid ? 'bg-gray-300' : 'bg-white/30'}`} aria-hidden />
              <ContactIntentButton
                channel="whatsapp"
                ariaLabel="WhatsApp us"
                className="w-6 h-6 flex items-center justify-center rounded-full bg-[#25D366] text-white hover:brightness-95 transition"
              >
                <MessageCircle size={13} />
              </ContactIntentButton>
            </div>
            <button
              type="button"
              onClick={openReservation}
              className="btn-red w-full justify-center py-2 text-xs"
            >
              Reservation
            </button>
          </div>

          {/* Mobile */}
          <button
            className={`lg:hidden p-2 ${solid ? 'text-[#1A0B2E]' : 'text-white'}`}
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="lg:hidden bg-white shadow-xl border-t border-gray-100">
          <div className="px-4 py-4 flex flex-col gap-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-montserrat font-medium text-gray-800 hover:text-[#E30613] py-1"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-3 pt-2">
              <ContactIntentButton
                channel="call"
                ariaLabel="Call the hotel"
                className="flex-1 text-center py-2 border border-[#1A0B2E] text-[#1A0B2E] font-montserrat font-semibold text-sm tracking-wider uppercase"
              >
                Call Us
              </ContactIntentButton>
              <ContactIntentButton
                channel="whatsapp"
                ariaLabel="WhatsApp the hotel"
                className="flex-1 text-center py-2 bg-[#25D366] text-white font-montserrat font-semibold text-sm tracking-wider uppercase"
              >
                WhatsApp
              </ContactIntentButton>
            </div>
            <button
              type="button"
              onClick={() => { setOpen(false); openReservation(); }}
              className="btn-red text-center py-3"
            >
              Reservation
            </button>
          </div>
        </div>
      )}
      {resOpen && <ReservationModal onClose={() => setResOpen(false)} />}
    </header>
  );
}
