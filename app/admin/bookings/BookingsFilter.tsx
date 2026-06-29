'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

const statuses = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Checked In', value: 'checked_in' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

interface Props {
  currentStatus?: string;
  currentSearch?: string;
}

export default function BookingsFilter({ currentStatus, currentSearch }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(currentSearch || '');

  const navigate = (status?: string, searchVal?: string) => {
    const params = new URLSearchParams();
    const s = status ?? currentStatus ?? 'all';
    const q = searchVal ?? search;
    if (s && s !== 'all') params.set('status', s);
    if (q) params.set('search', q);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => navigate(s.value, undefined)}
            className={`px-3 py-1.5 text-xs font-montserrat font-semibold transition-colors border ${
              (currentStatus || 'all') === s.value
                ? 'bg-[#1A0B2E] text-white border-[#1A0B2E]'
                : 'border-gray-200 text-gray-600 hover:border-[#1A0B2E]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 border border-gray-200 px-3 sm:ml-auto bg-white">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && navigate(undefined, search)}
          placeholder="Search name, ref, phone…"
          className="py-2 text-sm font-montserrat outline-none w-48"
        />
      </div>
    </div>
  );
}
