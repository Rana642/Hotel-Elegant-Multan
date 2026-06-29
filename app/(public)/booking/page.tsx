import type { Metadata } from 'next';
import { getRoomBySlug, getRooms } from '@/lib/rooms';
import BookingForm from './BookingForm';
import { createClient } from '@/lib/supabase/server';
import { Room } from '@/types';

export const metadata: Metadata = {
  title: 'Book Your Stay — Hotel Elegant Executive Suites Multan',
  description:
    'Reserve your room at Hotel Elegant Multan. No payment required — confirm via WhatsApp. Executive, Family & Presidential suites available.',
};

interface SearchParams {
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: string;
  children?: string;
  extraBeds?: string;
}

export default async function BookingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  let preselectedRoom: Room | null = null;
  if (sp.roomId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('rooms')
      .select('*, room_images(*)')
      .eq('id', sp.roomId)
      .single();
    preselectedRoom = data as Room | null;
  }

  const allRooms = await getRooms();

  return (
    <div className="pt-24 pb-20 bg-[#EEEDFE]/30 min-h-screen">
      <div className="container-xl max-w-4xl">
        <div className="text-center mb-12">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
            No Payment Required
          </p>
          <h1 className="font-playfair font-semibold text-4xl text-[#1A0B2E]">Book Your Stay</h1>
          <p className="font-montserrat text-gray-500 text-sm mt-3 max-w-md mx-auto">
            Fill in your details below. We'll confirm your room via WhatsApp — no advance payment
            needed.
          </p>
        </div>

        <BookingForm
          rooms={allRooms}
          preselectedRoom={preselectedRoom}
          initialCheckIn={sp.checkIn}
          initialCheckOut={sp.checkOut}
          initialAdults={Number(sp.adults) || 1}
          initialChildren={Number(sp.children) || 0}
          initialExtraBeds={Number(sp.extraBeds) || 0}
        />
      </div>
    </div>
  );
}
