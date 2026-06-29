import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import AvailabilityCalendar from './AvailabilityCalendar';

export const metadata: Metadata = { title: 'Availability Calendar' };
export const revalidate = 0;

export default async function CalendarPage() {
  const supabase = await createClient();
  const [{ data: rooms }, { data: blocks }] = await Promise.all([
    supabase.from('rooms').select('id, name, slug').eq('is_active', true).order('sort_order'),
    supabase.from('availability_blocks').select('*').gte('date', new Date().toISOString().split('T')[0]),
  ]);

  return (
    <div className="p-6 lg:p-10 mt-12 lg:mt-0">
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-8">Availability Calendar</h1>
      <AvailabilityCalendar rooms={rooms || []} blocks={blocks || []} />
    </div>
  );
}
