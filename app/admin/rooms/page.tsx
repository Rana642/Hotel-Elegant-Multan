import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { Edit, Plus } from 'lucide-react';

export const metadata: Metadata = { title: 'Rooms Management' };
export const revalidate = 0;

export default async function AdminRoomsPage() {
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*, room_images(id, url, is_featured)')
    .order('sort_order');

  return (
    <div className="p-6 lg:p-10 mt-12 lg:mt-0">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E]">Rooms</h1>
        <Link href="/admin/rooms/new" className="btn-red py-2 px-5 text-xs flex items-center gap-2">
          <Plus size={14} /> Add Room
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {(rooms || []).map((room: any) => {
          const featured = room.room_images?.find((i: any) => i.is_featured) || room.room_images?.[0];
          return (
            <div key={room.id} className="bg-white border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              {featured ? (
                <img src={featured.url} alt={room.name} className="w-full aspect-[4/3] object-cover" />
              ) : (
                <div className="w-full aspect-[4/3] bg-[#EEEDFE]" />
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="font-playfair font-semibold text-lg text-[#1A0B2E]">{room.name}</h2>
                  <span className={`text-xs font-montserrat font-semibold px-2 py-0.5 shrink-0 ${room.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {room.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="font-montserrat text-sm text-gray-500 mb-3">
                  {room.size_sqft} sq ft · {room.max_adults} adults
                  {room.max_children > 0 ? ` +${room.max_children} child` : ''}
                </p>
                {room.price_per_night ? (
                  <p className="font-montserrat font-semibold text-[#E30613] text-sm mb-4">
                    {formatCurrency(room.price_per_night)}/night
                  </p>
                ) : (
                  <p className="font-montserrat text-gray-400 text-sm mb-4">Price not set</p>
                )}
                <Link
                  href={`/admin/rooms/${room.id}`}
                  className="flex items-center justify-center gap-2 w-full border border-[#1A0B2E] text-[#1A0B2E] py-2 text-xs font-montserrat font-semibold hover:bg-[#1A0B2E] hover:text-white transition-colors tracking-wider uppercase"
                >
                  <Edit size={12} /> Edit Room
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
