import type { Metadata } from 'next';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import TeamForm from './TeamForm';
import { ArrowLeft, ShieldCheck, User as UserIcon } from 'lucide-react';

export const metadata: Metadata = { title: 'Team' };
export const revalidate = 0;

export default async function TeamPage() {
  // Full admins only. Receptionists trying to open this get bounced by the
  // layout guard already, but a page-level check is cheap defence-in-depth.
  const currentUser = await requireAdmin();

  // Service client so we bypass RLS while listing everyone — admin_users
  // SELECT policy only lets a user see their own row unless they're admin,
  // and the service client short-circuits that check anyway.
  const service = createServiceClient();
  const { data: users } = await service
    .from('admin_users')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: true });

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/settings" className="text-gray-400 hover:text-[#E30613] text-sm font-montserrat">
          <ArrowLeft className="inline" size={14} /> Settings
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-montserrat font-semibold text-sm text-[#1A0B2E]">Team</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 max-w-5xl">
        {/* Existing users */}
        <div className="lg:col-span-2 bg-white border border-gray-100 p-6">
          <h2 className="font-playfair font-semibold text-lg text-[#1A0B2E] mb-4">Members</h2>
          <ul className="divide-y divide-gray-100">
            {(users ?? []).map((u) => {
              const isSelf = u.id === currentUser.id;
              const isAdmin = u.role === 'admin';
              return (
                <li key={u.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isAdmin ? 'bg-[#E30613]/10 text-[#E30613]' : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {isAdmin ? <ShieldCheck size={16} /> : <UserIcon size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-montserrat text-[#1A0B2E] truncate">
                        {u.email} {isSelf && <span className="text-[10px] text-gray-400 font-normal">(you)</span>}
                      </p>
                      <p className="text-[10px] text-gray-400 font-montserrat">
                        Added {new Date(u.created_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 border rounded uppercase tracking-wider ${
                      isAdmin
                        ? 'bg-[#E30613]/10 text-[#E30613] border-[#E30613]/30'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {u.role}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Add-user form */}
        <div>
          <TeamForm />
        </div>
      </div>

      <p className="mt-8 max-w-2xl text-xs text-gray-500 font-montserrat leading-relaxed">
        <strong className="text-[#1A0B2E]">Roles:</strong>{' '}
        <span className="text-[#E30613] font-semibold">Admin</span> can access everything —
        settings, rooms, gallery, content, reports.{' '}
        <span className="text-blue-700 font-semibold">Receptionist</span> can only see Bookings +
        Inquiries and can convert inquiries into confirmed bookings. Reception cannot change room
        prices, edit content, or view reports.
      </p>
    </div>
  );
}
