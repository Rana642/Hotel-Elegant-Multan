import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import AvailabilityCalendar from './AvailabilityCalendar';

export const metadata: Metadata = { title: 'Availability Calendar' };
export const revalidate = 0;

export default async function CalendarPage() {
  const supabase = await createClient();
  // Reception sees the inventory badge as read-only text; admin sees an
  // editable pill they can click to change total_units per room. Server
  // action also enforces admin-only — this is just the UI hint.
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';

  // Try with total_units first. If the multi-unit migration hasn't been
  // applied yet, Postgres errors with 42703 (undefined_column) — fall back
  // to the pre-inventory shape and default total_units to 1 so the page
  // still renders normally instead of showing an empty rooms strip.
  const withUnits = await supabase
    .from('rooms')
    .select('id, name, slug, total_units')
    .eq('is_active', true)
    .order('sort_order');

  let rooms: Array<{ id: string; name: string; slug: string; total_units: number }> = [];
  let migrationApplied = true;
  if (withUnits.data) {
    rooms = withUnits.data.map((r: any) => ({ ...r, total_units: r.total_units ?? 1 }));
  } else {
    migrationApplied = false;
    const fallback = await supabase
      .from('rooms')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('sort_order');
    rooms = (fallback.data || []).map((r: any) => ({ ...r, total_units: 1 }));
  }

  const { data: blocks } = await supabase
    .from('availability_blocks')
    .select('*')
    .gte('date', new Date().toISOString().split('T')[0]);

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-2">
        Availability Calendar
      </h1>
      <p className="font-montserrat text-sm text-gray-500 mb-6">
        Block dates, track OTA holds, and see how many units of each room type are left per day.
      </p>

      {/* Loud banner when the multi-unit migration hasn't been applied yet.
          Without it the rooms query fails silently and the page renders empty. */}
      {!migrationApplied && (
        <div className="mb-6 border border-amber-300 bg-amber-50 rounded p-4">
          <p className="font-montserrat font-semibold text-sm text-amber-800">
            Database migration pending
          </p>
          <p className="font-montserrat text-xs text-amber-700 mt-1">
            The multi-unit inventory column (rooms.total_units) is missing. Run{' '}
            <code className="bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">
              supabase/migrations/2026-07-28_multi_unit_inventory.sql
            </code>{' '}
            in the Supabase SQL Editor once. Until then the calendar runs in single-unit mode.
          </p>
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="bg-white border border-gray-100 p-10 text-center">
          <p className="font-montserrat text-gray-500 text-sm">
            No active rooms found. Add rooms from{' '}
            <a href="/admin/rooms" className="text-[#E30613] underline">Rooms</a>{' '}
            to get started.
          </p>
        </div>
      ) : (
        <AvailabilityCalendar rooms={rooms} blocks={blocks || []} isAdmin={isAdmin} />
      )}
    </div>
  );
}
