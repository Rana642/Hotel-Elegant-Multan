'use client';

import { useEffect } from 'react';

// WebMCP: tools for in-browser AI agents, registered on page load. Only runs
// where the browser exposes navigator.modelContext; otherwise it does nothing.
type ToolResult = { content: { type: 'text'; text: string }[] };
type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
};
type ModelContext = { registerTool: (tool: Tool) => unknown };

const ROOMS = [
  { name: 'Executive King', slug: 'executive-king', guests: '2 adults' },
  { name: 'Family Suite', slug: 'family-suite', guests: '4 adults + 1 child' },
  { name: 'Presidential Suite', slug: 'presidential-suite', guests: '3 adults' },
  { name: 'Junior Suite', slug: 'junior-suite', guests: '3 adults + 2 children' },
  { name: 'Triple Sharing', slug: 'triple-sharing', guests: '3 adults' },
];

const text = (t: string): ToolResult => ({ content: [{ type: 'text', text: t }] });

export default function WebMcpTools() {
  useEffect(() => {
    const mc = (navigator as unknown as { modelContext?: ModelContext }).modelContext;
    if (!mc || typeof mc.registerTool !== 'function') return;

    try {
      mc.registerTool({
        name: 'get_hotel_info',
        description:
          'Hotel Elegant Executive Suites Multan: 3-star hotel in Gulgasht Colony, Multan. Address, phone/WhatsApp, email, check-in and check-out times.',
        inputSchema: { type: 'object', properties: {} },
        execute: async () =>
          text(
            'Hotel Elegant Executive Suites, 77A, A Block Gulgasht Colony, Multan 60750, Pakistan. Phone/WhatsApp +92 317 3330998. Email info@elegant-suite.com. Check-in 24 hours, check-out 12:00 noon. Direct bookings with no advance payment; confirmation via WhatsApp or call.',
          ),
      });

      mc.registerTool({
        name: 'list_rooms',
        description: 'List the hotel room types with occupancy and page links.',
        inputSchema: { type: 'object', properties: {} },
        execute: async () =>
          text(
            ROOMS.map((r) => `${r.name} (${r.guests}) - https://elegant-suite.com/rooms/${r.slug}`).join('\n'),
          ),
      });

      mc.registerTool({
        name: 'open_booking',
        description:
          'Open the booking page with the given dates and guests. Dates in YYYY-MM-DD format.',
        inputSchema: {
          type: 'object',
          properties: {
            check_in: { type: 'string', description: 'Check-in date, YYYY-MM-DD' },
            check_out: { type: 'string', description: 'Check-out date, YYYY-MM-DD' },
            adults: { type: 'integer', minimum: 1 },
          },
        },
        execute: async (args) => {
          const q = new URLSearchParams();
          if (typeof args.check_in === 'string') q.set('checkIn', args.check_in);
          if (typeof args.check_out === 'string') q.set('checkOut', args.check_out);
          if (typeof args.adults === 'number') q.set('adults', String(args.adults));
          const url = `/booking${q.toString() ? `?${q.toString()}` : ''}`;
          window.location.href = url;
          return text(`Opening booking page: ${url}`);
        },
      });
    } catch {
      // Tool registration is optional; never break the page for it.
    }
  }, []);

  return null;
}
