'use client';

import { Printer } from 'lucide-react';

/**
 * Trigger the browser's native print dialog for the current booking detail
 * page. The `@media print` rules in globals.css hide admin chrome (sidebar,
 * nav, buttons, status form, danger zone) and reveal the print-only hotel
 * header at the top — so what actually prints is a clean single-page booking
 * receipt, not a screenshot of the dashboard.
 */
export default function PrintBookingButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 px-4 py-2 border border-[#1A0B2E] text-[#1A0B2E] hover:bg-[#1A0B2E] hover:text-white transition-colors font-montserrat font-semibold text-xs uppercase tracking-wide"
      title="Print booking receipt"
    >
      <Printer size={14} />
      Print
    </button>
  );
}
