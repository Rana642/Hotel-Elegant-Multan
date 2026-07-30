'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

// Small copy-to-clipboard input pair. Kept isolated in its own client
// component so the parent admin page can remain a server component
// (no reason to ship the entire form's react tree to the browser just
// for a button).

export function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — user can still select the text manually */
    }
  };

  return (
    <div className="flex items-stretch gap-0 border border-gray-200 rounded overflow-hidden">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 min-w-0 px-3 py-2 text-xs font-mono text-[#1A0B2E] bg-gray-50 outline-none"
      />
      <button
        type="button"
        onClick={copy}
        className={`shrink-0 px-3 flex items-center gap-1.5 text-xs font-montserrat font-semibold transition-colors ${
          copied
            ? 'bg-green-50 text-green-700'
            : 'bg-white text-[#1A0B2E] hover:bg-gray-50 border-l border-gray-200'
        }`}
        aria-label="Copy to clipboard"
      >
        {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
      </button>
    </div>
  );
}
