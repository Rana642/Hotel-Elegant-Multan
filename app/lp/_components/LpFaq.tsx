'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQ {
  q: string;
  a: string;
}

/** Accordion FAQ (mirrors the homepage pattern, self-contained for /lp). */
export default function LpFaq({ faqs }: { faqs: FAQ[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {faqs.map((faq, i) => (
        <div key={i} className="border border-gray-200 bg-white">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
            aria-expanded={open === i}
          >
            <span className="font-montserrat font-semibold text-sm text-[#1A0B2E] pr-4">
              {faq.q}
            </span>
            <ChevronDown
              size={18}
              className={`text-[#E30613] shrink-0 transition-transform duration-200 ${
                open === i ? 'rotate-180' : ''
              }`}
            />
          </button>
          {open === i && (
            <div className="px-5 pb-4">
              <p className="font-montserrat text-sm text-gray-600 leading-relaxed">{faq.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
