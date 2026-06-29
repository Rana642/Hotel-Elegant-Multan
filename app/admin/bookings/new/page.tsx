import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import AdminNewBookingForm from './AdminNewBookingForm';

export const metadata: Metadata = { title: 'New Booking (Walk-in)' };

export default async function AdminNewBookingPage() {
  const supabase = await createClient();
  const { data: rooms } = await supabase.from('rooms').select('id, name, price_per_night, max_adults, max_children').eq('is_active', true).order('sort_order');

  return (
    <div className="p-6 lg:p-10 mt-12 lg:mt-0">
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-8">New Walk-in Booking</h1>
      <AdminNewBookingForm rooms={rooms || []} />
    </div>
  );
}
