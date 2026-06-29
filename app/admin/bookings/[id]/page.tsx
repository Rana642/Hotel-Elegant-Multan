import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate, buildBookingWhatsApp } from '@/lib/utils';
import BookingStatusForm from './BookingStatusForm';

export const metadata: Metadata = { title: 'Booking Detail' };
export const revalidate = 0;

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, rooms(name, slug)')
    .eq('id', id)
    .single();

  if (!booking) notFound();

  const waUrl = buildBookingWhatsApp({
    bookingRef: booking.booking_ref,
    guestName: booking.guest_name,
    roomName: booking.rooms?.name || 'room',
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    nights: booking.nights,
    adults: booking.adults,
    children: booking.children,
    grandTotal: booking.grand_total,
  });

  return (
    <div className="p-6 lg:p-10 mt-12 lg:mt-0">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/bookings" className="text-gray-400 hover:text-[#E30613] text-sm font-montserrat">
          ← Bookings
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-montserrat font-semibold text-sm text-[#E30613]">{booking.booking_ref}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 p-7">
            <h1 className="font-playfair font-semibold text-xl text-[#1A0B2E] mb-6">Booking Details</h1>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm font-montserrat">
              {[
                { label: 'Booking Ref', value: booking.booking_ref },
                { label: 'Status', value: booking.status },
                { label: 'Room', value: booking.rooms?.name || '—' },
                { label: 'Source', value: booking.source },
                { label: 'Check-in', value: formatDate(booking.check_in) },
                { label: 'Check-out', value: formatDate(booking.check_out) },
                { label: 'Nights', value: String(booking.nights) },
                { label: 'Adults', value: String(booking.adults) },
                { label: 'Children', value: String(booking.children) },
                { label: 'Extra Beds', value: String(booking.extra_beds) },
                { label: 'Room Total', value: formatCurrency(booking.room_total) },
                { label: 'Extra Bed Total', value: formatCurrency(booking.extra_bed_total) },
                { label: 'Grand Total', value: formatCurrency(booking.grand_total) },
                { label: 'Booked On', value: formatDate(booking.created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3">
                  <span className="text-gray-400 w-36 shrink-0">{label}:</span>
                  <span className="text-[#1A0B2E] font-medium capitalize">{value}</span>
                </div>
              ))}
            </div>

            {booking.special_request && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-gray-400 text-xs font-montserrat font-semibold uppercase tracking-wide mb-2">
                  Special Request
                </p>
                <p className="font-montserrat text-sm text-gray-600">{booking.special_request}</p>
              </div>
            )}
          </div>

          {/* Guest info */}
          <div className="bg-white border border-gray-100 p-7">
            <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide mb-5">
              Guest Information
            </h2>
            <div className="grid sm:grid-cols-2 gap-y-4 text-sm font-montserrat">
              <div>
                <p className="text-gray-400 text-xs mb-1">Name</p>
                <p className="text-[#1A0B2E] font-medium">{booking.guest_name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Phone / WhatsApp</p>
                <a href={`tel:${booking.guest_phone}`} className="text-[#E30613] font-medium hover:underline">
                  {booking.guest_phone}
                </a>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Email</p>
                <p className="text-[#1A0B2E]">{booking.guest_email || '—'}</p>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <a href={`tel:${booking.guest_phone}`} className="btn-red py-2 px-5 text-xs">
                Call Guest
              </a>
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp py-2 px-5 text-xs">
                WhatsApp Guest
              </a>
            </div>
          </div>
        </div>

        {/* Sidebar: Status management */}
        <div>
          <BookingStatusForm booking={booking} />
        </div>
      </div>
    </div>
  );
}
