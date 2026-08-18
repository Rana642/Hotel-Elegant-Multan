import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Users, ArrowRight, Mail, Zap } from 'lucide-react';
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
      <div className="grid gap-3 max-w-2xl mb-6">
        <Link
          href="/admin/settings/team"
          className="flex items-center justify-between gap-3 bg-white border border-gray-100 px-5 py-4 hover:border-[#E30613] transition-colors group"
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

        <Link
          href="/admin/settings/notifications"
          className="flex items-center justify-between gap-3 bg-white border border-gray-100 px-5 py-4 hover:border-[#E30613] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Mail size={18} />
            </div>
            <div>
              <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">Email notifications</p>
              <p className="text-[11px] text-gray-500 font-montserrat">
                See booking-notification config + send a test email
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-gray-300 group-hover:text-[#E30613] transition-colors" />
        </Link>

        <Link
          href="/admin/settings/last-minute"
          className="flex items-center justify-between gap-3 bg-white border border-gray-100 px-5 py-4 hover:border-[#E30613] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap size={18} />
            </div>
            <div>
              <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">Last-Minute Campaign</p>
              <p className="text-[11px] text-gray-500 font-montserrat">
                Auto last-minute discount, time window, eligible rooms, advance-payment terms
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-gray-300 group-hover:text-[#E30613] transition-colors" />
        </Link>
      </div>

      <SettingsForm settings={settingsMap} />
    </div>
  );
}
