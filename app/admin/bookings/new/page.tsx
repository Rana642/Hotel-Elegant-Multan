import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getHotelTaxPercent } from '@/lib/tax';
import AdminNewBookingForm from './AdminNewBookingForm';

export const metadata: Metadata = { title: 'New Booking (Walk-in)' };

interface SearchParams {
  from_inquiry?: string;
  name?: string;
  phone?: string;
  check_in?: string;
  check_out?: string;
  channel?: string;          // whatsapp | call — comes from inquiry.preferred_channel
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  fbclid?: string;
  gclid?: string;
}

export default async function AdminNewBookingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const [{ data: rooms }, taxPercent] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, name, price_per_night, max_adults, max_children')
      .eq('is_active', true)
      .order('sort_order'),
    getHotelTaxPercent(),
  ]);

  // Deep-link prefills. Everything is optional — if the admin lands here
  // from the sidebar (not from an inquiry) all fields fall back to defaults.
  // channel comes in as inquiry.preferred_channel ('whatsapp'|'call'), which
  // maps 1:1 to the Contact Channel dropdown values already in the form.
  const prefill = {
    fromInquiryId: sp.from_inquiry || null,
    name: sp.name || '',
    phone: sp.phone || '',
    checkIn:  sp.check_in  || undefined,
    checkOut: sp.check_out || undefined,
    channel: (sp.channel === 'call' ? 'phone' : sp.channel) as
      'whatsapp' | 'phone' | 'walkin' | 'ota' | 'website' | undefined,
    utmSource:   sp.utm_source   || undefined,
    utmMedium:   sp.utm_medium   || undefined,
    utmCampaign: sp.utm_campaign || undefined,
    fbclid:      sp.fbclid       || undefined,
    gclid:       sp.gclid        || undefined,
  };

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-8">
        {prefill.fromInquiryId ? 'Convert Inquiry to Booking' : 'New Walk-in Booking'}
      </h1>
      <AdminNewBookingForm rooms={rooms || []} prefill={prefill} taxPercent={taxPercent} />
    </div>
  );
}
