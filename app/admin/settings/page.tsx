import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Users, ArrowRight } from 'lucide-react';
import SettingsForm from './SettingsForm';

export const metadata: Metadata = { title: 'Settings' };
export const revalidate = 0;

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('settings').select('key, value');
  const settingsMap: Record<string, string> = {};
  (data || []).forEach((row: any) => { if (row.value) settingsMap[row.key] = row.value; });

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-2">Settings</h1>
      <p className="font-montserrat text-sm text-gray-500 mb-8">Hotel information and operational settings.</p>

      {/* Sub-pages that don't need their own sidebar entry */}
      <Link
        href="/admin/settings/team"
        className="flex items-center justify-between gap-3 bg-white border border-gray-100 px-5 py-4 mb-6 max-w-2xl hover:border-[#E30613] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E30613]/10 text-[#E30613] flex items-center justify-center">
            <Users size={18} />
          </div>
          <div>
            <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">Team & permissions</p>
            <p className="text-[11px] text-gray-500 font-montserrat">
              Add reception staff, change roles, remove users
            </p>
          </div>
        </div>
        <ArrowRight size={16} className="text-gray-300 group-hover:text-[#E30613] transition-colors" />
      </Link>

      <SettingsForm settings={settingsMap} />
    </div>
  );
}
