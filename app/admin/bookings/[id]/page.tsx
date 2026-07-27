import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate, buildBookingWhatsApp } from '@/lib/utils';
import BookingStatusForm from './BookingStatusForm';
import DeleteBookingButton from '../DeleteBookingButton';
import PrintBookingButton from './PrintBookingButton';

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
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      {/* Print-only branded header — hidden on screen, shown at print time */}
      <div className="print-only" style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #1A0B2E' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: 'serif', fontSize: '22pt', fontWeight: 600, color: '#1A0B2E', margin: 0 }}>
              Hotel Elegant Executive Suites
            </h1>
            <p style={{ fontSize: '10pt', color: '#666', margin: '4px 0 0' }}>
              77-A Gulgasht Colony, Multan, Punjab 60750, Pakistan
            </p>
            <p style={{ fontSize: '10pt', color: '#666', margin: '2px 0 0' }}>
              Phone: 0317-333-0998 &nbsp;·&nbsp; info@elegant-suite.com &nbsp;·&nbsp; elegant-suite.com
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '9pt', color: '#666', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Booking Slip
            </p>
            <p style={{ fontSize: '16pt', fontWeight: 700, color: '#E30613', margin: '2px 0 0', fontFamily: 'monospace' }}>
              {booking.booking_ref}
            </p>
            <p style={{ fontSize: '9pt', color: '#666', margin: '2px 0 0' }}>
              Printed: {new Date().toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8 no-print">
        <div className="flex items-center gap-3">
          <Link href="/admin/bookings" className="text-gray-400 hover:text-[#E30613] text-sm font-montserrat">
            ← Bookings
          </Link>
          <span className="text-gray-300">/</span>
          <span className="font-montserrat font-semibold text-sm text-[#E30613]">{booking.booking_ref}</span>
        </div>
        <PrintBookingButton />
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

          {/* Attribution — where did this booking come from? Only shown if
              we captured any UTM / click-id / referrer for this booking. */}
          {(booking.utm_source || booking.gclid || booking.fbclid || booking.referrer || booking.landing_path) && (
            <div className="bg-white border border-gray-100 p-7">
              <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide mb-5">
                Traffic Source
              </h2>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm font-montserrat">
                {[
                  { label: 'utm_source', value: booking.utm_source },
                  { label: 'utm_medium', value: booking.utm_medium },
                  { label: 'utm_campaign', value: booking.utm_campaign },
                  { label: 'utm_term', value: booking.utm_term },
                  { label: 'utm_content', value: booking.utm_content },
                  { label: 'Google click id (gclid)', value: booking.gclid },
                  { label: 'Facebook click id (fbclid)', value: booking.fbclid },
                  { label: 'Referrer', value: booking.referrer || '(direct)' },
                  { label: 'First landing page', value: booking.landing_path },
                ]
                  .filter(({ value }) => value)
                  .map(({ label, value }) => (
                    <div key={label} className="flex gap-3">
                      <span className="text-gray-400 w-40 shrink-0">{label}:</span>
                      <span className="text-[#1A0B2E] font-medium break-all">{value}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

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
            <div className="mt-5 flex gap-3 no-print">
              <a href={`tel:${booking.guest_phone}`} className="btn-red py-2 px-5 text-xs">
                Call Guest
              </a>
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp py-2 px-5 text-xs">
                WhatsApp Guest
              </a>
            </div>
          </div>

          {/* Print-only footer: pay-at-hotel note + signature line */}
          <div className="print-only" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #ddd', fontSize: '10pt', color: '#333' }}>
            <p style={{ margin: '0 0 6px' }}>
              <strong>Payment:</strong> No advance payment taken. Guest pays at
              hotel by Visa, Mastercard or cash on check-out.
            </p>
            <p style={{ margin: '0 0 6px' }}>
              <strong>Check-in:</strong> Available 24 hours &nbsp;·&nbsp;
              <strong>Check-out:</strong> By 12:00 noon
            </p>
            <p style={{ margin: '0 0 24px', color: '#666', fontSize: '9pt' }}>
              A valid CNIC (Pakistani nationals) or passport (foreign guests) is
              required at check-in per Pakistan hotel regulations.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', marginTop: '32px' }}>
              <div style={{ flex: 1, borderTop: '1px solid #333', paddingTop: '4px', fontSize: '9pt', color: '#666' }}>
                Guest signature
              </div>
              <div style={{ flex: 1, borderTop: '1px solid #333', paddingTop: '4px', fontSize: '9pt', color: '#666' }}>
                Reception signature
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Status management (screen-only — not part of printed slip) */}
        <div className="space-y-6 no-print">
          <BookingStatusForm booking={booking} />
          <div className="bg-white border border-gray-100 p-6">
            <h2 className="font-montserrat font-semibold text-sm text-red-600 uppercase tracking-wide mb-4">
              Danger Zone
            </h2>
            <DeleteBookingButton bookingId={booking.id} bookingRef={booking.booking_ref} variant="button" />
          </div>
        </div>
      </div>
    </div>
  );
}
