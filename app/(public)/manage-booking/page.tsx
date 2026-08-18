import type { Metadata } from 'next';
import ManageBookingForm from './ManageBookingForm';

export const metadata: Metadata = {
  title: 'Manage Booking — Hotel Elegant Executive Suites Multan',
  description: 'Look up your reservation at Hotel Elegant Executive Suites, Multan. Enter your Booking ID and the email or phone you booked with to view your booking status and details.',
  alternates: { canonical: '/manage-booking' },
  // Utility page — no SEO value, keep it out of the index.
  robots: { index: false, follow: true },
};

export default function ManageBookingPage() {
  return (
    <div className="pt-24 pb-20 min-h-[70vh] bg-[#1A0B2E]/[0.03]">
      <div className="container-xl">
        <div className="text-center mb-10">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
            Manage Booking
          </p>
          <h1 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E] mb-3">
            View Your Reservation
          </h1>
          <p className="font-montserrat text-sm text-gray-500 max-w-md mx-auto">
            Enter your Booking ID (sent on your confirmation) and the email or phone number you booked with to see your booking status and details.
          </p>
        </div>

        <ManageBookingForm />
      </div>
    </div>
  );
}
