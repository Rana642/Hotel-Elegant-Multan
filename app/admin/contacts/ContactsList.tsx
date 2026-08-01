'use client';

import { useState, useMemo } from 'react';
import { Search, Phone, MessageCircle, CalendarDays, MessageSquare } from 'lucide-react';
import { formatKarachiTime, timeAgoKarachi, buildWhatsAppLink } from '@/lib/utils';
import type { Contact } from './page';

interface Props {
  contacts: Contact[];
}

export default function ContactsList({ contacts }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q.replace(/\D/g, '')) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [search, contacts]);

  return (
    <>
      <div className="flex items-center gap-2 border border-gray-200 px-3 bg-white max-w-md mb-6">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone or email…"
          className="py-2.5 text-sm font-montserrat outline-none w-full"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 p-10 text-center">
          <p className="font-montserrat text-gray-400 text-sm">
            {contacts.length === 0
              ? 'No contacts yet — they appear here once guests book or inquire.'
              : 'No contacts match your search.'}
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
                  <th className="text-left px-4 py-3">Contact</th>
                  <th className="text-left px-4 py-3">Activity</th>
                  <th className="text-left px-4 py-3">Last Contact</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.phone} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <p className="text-[#1A0B2E] font-medium">{c.name}</p>
                      {c.email && <p className="text-xs text-gray-400 truncate max-w-[200px]">{c.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">+{c.phone}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {c.bookingCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 border rounded bg-[#E30613]/10 text-[#E30613] border-[#E30613]/30">
                            <CalendarDays size={10} /> {c.bookingCount} booking{c.bookingCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {c.inquiryCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 border rounded bg-blue-50 text-blue-700 border-blue-200">
                            <MessageSquare size={10} /> {c.inquiryCount} inquir{c.inquiryCount > 1 ? 'ies' : 'y'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      <p className="text-[#1A0B2E]">{formatKarachiTime(c.lastContact)}</p>
                      <p className="text-gray-400 text-[10px]">{timeAgoKarachi(c.lastContact)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <a
                          href={`tel:+${c.phone}`}
                          title="Call"
                          className="p-1.5 text-gray-400 hover:text-[#1A0B2E]"
                        >
                          <Phone size={16} />
                        </a>
                        <a
                          href={buildWhatsAppLink(`Hi ${c.name}, this is Hotel Elegant Executive Suites.`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp"
                          className="p-1.5 text-gray-400 hover:text-[#25D366]"
                        >
                          <MessageCircle size={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-3">
            {filtered.map((c) => (
              <div key={c.phone} className="bg-white border border-gray-100 p-4">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-montserrat font-medium text-[#1A0B2E]">{c.name}</p>
                    <p className="text-xs text-gray-500 font-montserrat">+{c.phone}</p>
                    {c.email && <p className="text-xs text-gray-400 font-montserrat truncate">{c.email}</p>}
                  </div>
                  <span className="text-[10px] text-gray-400 font-montserrat whitespace-nowrap">
                    {timeAgoKarachi(c.lastContact)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {c.bookingCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 border rounded bg-[#E30613]/10 text-[#E30613] border-[#E30613]/30">
                      <CalendarDays size={10} /> {c.bookingCount} booking{c.bookingCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {c.inquiryCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 border rounded bg-blue-50 text-blue-700 border-blue-200">
                      <MessageSquare size={10} /> {c.inquiryCount} inquir{c.inquiryCount > 1 ? 'ies' : 'y'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a href={`tel:+${c.phone}`} className="flex items-center justify-center gap-2 py-2.5 border border-[#1A0B2E] text-[#1A0B2E] font-montserrat font-semibold text-xs tracking-wider uppercase">
                    <Phone size={13} /> Call
                  </a>
                  <a
                    href={buildWhatsAppLink(`Hi ${c.name}, this is Hotel Elegant Executive Suites.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 bg-[#25D366] text-white font-montserrat font-semibold text-xs tracking-wider uppercase"
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
