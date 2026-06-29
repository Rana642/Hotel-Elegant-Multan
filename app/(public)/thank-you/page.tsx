import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle, MessageCircle, Phone, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate, buildBookingWhatsApp } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Booking Request Submitted — Hotel Elegant Multan',
  description: 'Your room booking request at Hotel Elegant Executive Suites Multan has been received. We will confirm via WhatsApp.',
  robots: { index: false },
};

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  let booking: any = null;
  if (ref) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('bookings')
      .select('*, rooms(name)')
      .eq('booking_ref', ref)
      .single();
    booking = data;
  }

  const whatsappUrl = booking
    ? buildBookingWhatsApp({
        bookingRef: booking.booking_ref,
        guestName: booking.guest_name,
        roomName: booking.rooms?.name || 'room',
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        nights: booking.nights,
        adults: booking.adults,
        children: booking.children,
        grandTotal: booking.grand_total,
      })
    : 'https://wa.me/923173330998';

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#EEEDFE]/30">
      <div className="container-xl max-w-2xl">
        {/* Success Header */}
        <div className="text-center mb-10">
          <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
          <h1 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E] mb-2">
            Thank You! We've Got Your Request
          </h1>
          <p className="font-montserrat text-gray-500 text-base">
            No payment has been taken. We will confirm your room via WhatsApp or call shortly.
          </p>
        </div>

        {/* Booking Summary */}
        {booking ? (
          <div className="bg-white border border-gray-100 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-playfair font-semibold text-xl text-[#1A0B2E]">Booking Summary</h2>
              <span className="font-montserrat font-bold text-sm text-[#E30613] bg-red-50 px-3 py-1">
                {booking.booking_ref}
              </span>
            </div>

            <div className="space-y-3 text-sm font-montserrat">
              {[
                { label: 'Room', value: booking.rooms?.name || '—' },
                { label: 'Guest Name', value: booking.guest_name },
                { label: 'Phone', value: booking.guest_phone },
                { label: 'Check-in', value: formatDate(booking.check_in) },
                { label: 'Check-out', value: formatDate(booking.check_out) },
                { label: 'Nights', value: String(booking.nights) },
                {
                  label: 'Guests',
                  value: `${booking.adults} adults${booking.children > 0 ? `, ${booking.children} children` : ''}${booking.extra_beds > 0 ? `, ${booking.extra_beds} extra bed(s)` : ''}`,
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-3 last:border-none">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-[#1A0B2E]">{value}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 font-semibold">
                <span className="text-[#1A0B2E]">Estimated Total</span>
                <span className="text-[#E30613] text-base">{formatCurrency(booking.grand_total)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 text-xs font-montserrat text-amber-700">
              Status: <strong>Pending Confirmation</strong> — we will WhatsApp or call to confirm.
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 p-8 mb-8 text-center">
            <p className="font-montserrat text-gray-500 text-sm">
              Your booking request has been received. Check your email for confirmation details.
            </p>
          </div>
        )}

        {/* WhatsApp CTA */}
        <div className="bg-[#1A0B2E] p-8 mb-8 text-center">
          <h2 className="font-playfair font-semibold text-2xl text-white mb-2">
            Want Instant Confirmation?
          </h2>
          <p className="font-montserrat text-[#C9BFE0] text-sm mb-6">
            Tap the button below to message us on WhatsApp with your booking details pre-filled.
          </p>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp inline-flex items-center gap-2 py-4 px-10">
            <MessageCircle size={18} />
            Confirm on WhatsApp
          </a>
        </div>

        {/* What Happens Next */}
        <div className="bg-white border border-gray-100 p-8 mb-8">
          <h2 className="font-playfair font-semibold text-xl text-[#1A0B2E] mb-6">
            What Happens Next?
          </h2>
          <div className="space-y-6">
            {[
              {
                step: '1',
                title: 'We Check Availability',
                desc: 'Our team reviews your request and verifies the room is ready for your dates.',
              },
              {
                step: '2',
                title: 'We WhatsApp or Call You',
                desc: 'We confirm your room and share the best direct rate — usually within a few hours.',
              },
              {
                step: '3',
                title: 'Arrive & Enjoy',
                desc: 'Check in at any time (24 hours), pay at checkout. No surprises.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#E30613] text-white font-montserrat font-bold text-sm flex items-center justify-center shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-montserrat font-semibold text-sm text-[#1A0B2E] mb-0.5">
                    {item.title}
                  </p>
                  <p className="font-montserrat text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/rooms" className="btn-red inline-flex items-center gap-2 py-3 px-8">
            View All Rooms
            <ArrowRight size={14} />
          </Link>
          <a href="tel:+923173330998" className="inline-flex items-center gap-2 border-2 border-[#1A0B2E] text-[#1A0B2E] font-montserrat font-semibold text-sm px-8 py-3 hover:bg-[#1A0B2E] hover:text-white transition-colors tracking-wider uppercase">
            <Phone size={14} />
            Call 0317-333-0998
          </a>
        </div>
      </div>
    </div>
  );
}
