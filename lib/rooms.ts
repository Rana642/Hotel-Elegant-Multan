import { createClient } from './supabase/server';
import { createServiceClient } from './supabase/server';
import { Room } from '@/types';

/** Use in server components within a request context */
export async function getRooms(): Promise<Room[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('*, room_images(*)')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return (data as Room[]) || [];
}

/** Use in generateStaticParams / sitemap (no request context) */
export async function getRoomsStatic(): Promise<Room[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('*, room_images(*)')
    .eq('is_active', true)
    .order('sort_order');
  if (error) {
    console.error('getRoomsStatic error:', error);
    return [];
  }
  return (data as Room[]) || [];
}

export async function getRoomBySlug(slug: string): Promise<Room | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('*, room_images(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  if (error) return null;
  return data as Room;
}

export async function getAvailableRooms(
  checkIn: string,
  checkOut: string,
  adults: number,
  children: number
): Promise<Room[]> {
  const supabase = await createClient();

  const { data: blockedRoomIds } = await supabase
    .from('availability_blocks')
    .select('room_id')
    .gte('date', checkIn)
    .lt('date', checkOut);

  const blockedIds = Array.from(new Set((blockedRoomIds || []).map((b: { room_id: string }) => b.room_id)));

  let query = supabase
    .from('rooms')
    .select('*, room_images(*)')
    .eq('is_active', true)
    .gte('max_adults', adults)
    .order('sort_order');

  if (blockedIds.length > 0) {
    query = query.not('id', 'in', `(${blockedIds.join(',')})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Room[]) || [];
}
