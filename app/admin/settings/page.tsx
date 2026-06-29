import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import SettingsForm from './SettingsForm';

export const metadata: Metadata = { title: 'Settings' };
export const revalidate = 0;

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('settings').select('key, value');
  const settingsMap: Record<string, string> = {};
  (data || []).forEach((row: any) => { if (row.value) settingsMap[row.key] = row.value; });

  return (
    <div className="p-6 lg:p-10 mt-12 lg:mt-0">
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-2">Settings</h1>
      <p className="font-montserrat text-sm text-gray-500 mb-8">Hotel information and operational settings.</p>
      <SettingsForm settings={settingsMap} />
    </div>
  );
}
