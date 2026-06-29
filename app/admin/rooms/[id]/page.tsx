import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RoomEditForm from './RoomEditForm';

export const metadata: Metadata = { title: 'Edit Room' };
export const revalidate = 0;

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: room } = await supabase
    .from('rooms')
    .select('*, room_images(*)')
    .eq('id', id)
    .single();

  if (!room) notFound();

  return (
    <div className="p-6 lg:p-10 mt-12 lg:mt-0">
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-8">Edit Room: {room.name}</h1>
      <RoomEditForm room={room} />
    </div>
  );
}
