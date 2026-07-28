import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { MessageCircle, Phone, ArrowRight, Circle } from 'lucide-react';
import InquiryStatusActions from './InquiryStatusActions';

export const metadata: Metadata = { title: 'Inquiries' };
export const revalidate = 0;

type InquiryRow = {
  id: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  preferred_channel: 'whatsapp' | 'call';
  intent: 'booking' | 'info';
  check_in: string | null;
  check_out: string | null;
  status: 'new' | 'converted' | 'closed' | 'spam';
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;
  gclid: string | null;
  referrer: string | null;
  booking_id: string | null;
  notes: string | null;
  created_at: string;
};

// Compact label describing where the inquiry came from — same logic style
// used on the bookings list, so both surfaces read consistently.
function sourceLabel(i: InquiryRow): { label: string; color: string } {
  if (i.fbclid || i.utm_source === 'facebook') return { label: 'Facebook Ads',  color: 'bg-blue-50 text-blue-700 border-blue-200'   };
  if (i.gclid  || i.utm_source === 'google')   return { label: 'Google Ads',    color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
  if (i.utm_source)                            return { label: i.utm_source,    color: 'bg-purple-50 text-purple-700 border-purple-200' };
  if (i.referrer)                              return { label: i.referrer,      color: 'bg-gray-50 text-gray-600 border-gray-200'     };
  return { label: 'Direct', color: 'bg-gray-50 text-gray-500 border-gray-200' };
}

const statusStyles: Record<InquiryRow['status'], string> = {
  new:       'bg-blue-50 text-blue-700 border-blue-200',
  converted: 'bg-green-50 text-green-700 border-green-200',
  closed:    'bg-gray-100 text-gray-500 border-gray-200',
  spam:      'bg-red-50 text-red-700 border-red-200',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default async function InquiriesPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const inquiries = (rows ?? []) as InquiryRow[];

  const counts = {
    new:       inquiries.filter((i) => i.status === 'new').length,
    converted: inquiries.filter((i) => i.status === 'converted').length,
    closed:    inquiries.filter((i) => i.status === 'closed').length,
    total:     inquiries.length,
  };

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <div className="mb-8">
        <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E]">Inquiries</h1>
        <p className="font-montserrat text-gray-500 text-sm mt-1">
          Guests who clicked WhatsApp / Call on the website. Convert to bookings when they confirm.
        </p>
      </div>

      {/* Counts strip */}
      <div className="grid grid-cols-4 gap-3 mb-8 max-w-2xl">
        {(['new', 'converted', 'closed', 'total'] as const).map((k) => (
          <div key={k} className="bg-white border border-gray-100 p-4">
            <p className="font-montserrat text-[10px] uppercase tracking-widest text-gray-400">{k}</p>
            <p className="font-playfair font-semibold text-2xl text-[#1A0B2E] mt-1">{counts[k]}</p>
          </div>
        ))}
      </div>

      {inquiries.length === 0 ? (
        <div className="bg-white border border-gray-100 p-10 text-center">
          <p className="font-montserrat text-gray-400 text-sm">
            Abhi tak koi inquiry nahi aayi. Jab guest WhatsApp / Call button dabayenge, yahan aayengi.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-gray-100">
            <table className="w-full font-montserrat text-sm">
              <thead className="bg-[#1A0B2E]/[0.02] text-[10px] uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">Guest</th>
                  <th className="text-left px-4 py-3">Intent</th>
                  <th className="text-left px-4 py-3">Channel</th>
                  <th className="text-left px-4 py-3">Dates</th>
                  <th className="text-left px-4 py-3">Source</th>
                  <th className="text-left px-4 py-3">When</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((i) => {
                  const src = sourceLabel(i);
                  return (
                    <tr key={i.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <p className="text-[#1A0B2E] font-medium">{i.guest_name}</p>
                        {i.guest_phone && <p className="text-xs text-gray-500">{i.guest_phone}</p>}
                        {i.guest_email && <p className="text-xs text-gray-400 truncate max-w-[180px]">{i.guest_email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 border rounded ${
                          i.intent === 'booking' ? 'bg-[#E30613]/10 text-[#E30613] border-[#E30613]/30' : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          {i.intent === 'booking' ? 'Book' : 'Info'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                          {i.preferred_channel === 'whatsapp'
                            ? <><MessageCircle size={12} className="text-[#25D366]" /> WhatsApp</>
                            : <><Phone size={12} className="text-[#E30613]" /> Call</>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {i.check_in && i.check_out
                          ? `${formatDate(i.check_in)} → ${formatDate(i.check_out)}`
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 border rounded uppercase tracking-wider ${src.color}`}>
                          {src.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{timeAgo(i.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 border rounded uppercase tracking-wider ${statusStyles[i.status]}`}>
                          {i.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <InquiryStatusActions inquiry={i} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-3">
            {inquiries.map((i) => {
              const src = sourceLabel(i);
              return (
                <div key={i.id} className="bg-white border border-gray-100 p-4">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-montserrat font-medium text-[#1A0B2E]">{i.guest_name}</p>
                      {i.guest_phone && <p className="text-xs text-gray-500 font-montserrat">{i.guest_phone}</p>}
                      {i.guest_email && <p className="text-xs text-gray-400 font-montserrat truncate">{i.guest_email}</p>}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 border rounded uppercase tracking-wider ${statusStyles[i.status]}`}>
                      {i.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`text-[10px] px-2 py-0.5 border rounded ${
                      i.intent === 'booking' ? 'bg-[#E30613]/10 text-[#E30613] border-[#E30613]/30' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {i.intent === 'booking' ? 'Book' : 'Info'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 border rounded bg-gray-50 text-gray-600 border-gray-200 inline-flex items-center gap-1">
                      {i.preferred_channel === 'whatsapp'
                        ? <><MessageCircle size={10} className="text-[#25D366]" /> WhatsApp</>
                        : <><Phone size={10} className="text-[#E30613]" /> Call</>}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 border rounded uppercase tracking-wider ${src.color}`}>
                      {src.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 border rounded bg-gray-50 text-gray-500 border-gray-200">
                      {timeAgo(i.created_at)}
                    </span>
                  </div>
                  <InquiryStatusActions inquiry={i} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
