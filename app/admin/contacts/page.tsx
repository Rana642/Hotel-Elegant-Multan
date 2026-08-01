import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ContactsList from './ContactsList';

export const metadata: Metadata = { title: 'Contacts' };
export const revalidate = 0;

export interface Contact {
  phone: string;
  name: string;
  email: string | null;
  bookingCount: number;
  inquiryCount: number;
  lastContact: string;
}

/** Keep only digits so "0317-333-0998" and "+92 317 3330998" merge as the
 *  same guest instead of showing up as two separate contacts. */
function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  // Normalize the country code so a local "0317..." and "923173330998"
  // (same number) collapse to one contact too.
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return '92' + digits.slice(1);
  return digits;
}

export default async function ContactsPage() {
  const supabase = await createClient();

  const [{ data: bookings }, { data: inquiries }] = await Promise.all([
    supabase.from('bookings').select('guest_name, guest_phone, guest_email, created_at'),
    supabase.from('inquiries').select('guest_name, guest_phone, guest_email, created_at'),
  ]);

  // Merge bookings + inquiries into one contact per phone number. Name/email
  // shown are whichever came from the MOST RECENT record for that phone, so
  // a guest's latest details win over a stale earlier entry.
  const byPhone = new Map<string, Contact>();

  const rows = [
    ...(bookings || []).map((b) => ({ ...b, kind: 'booking' as const })),
    ...(inquiries || []).map((i) => ({ ...i, kind: 'inquiry' as const })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  for (const row of rows) {
    const phone = normalizePhone(row.guest_phone);
    if (!phone) continue; // no phone, nothing to merge/contact by

    const existing = byPhone.get(phone);
    const contact: Contact = existing || {
      phone,
      name: row.guest_name,
      email: row.guest_email || null,
      bookingCount: 0,
      inquiryCount: 0,
      lastContact: row.created_at,
    };

    // Iterating oldest-first, so each new row's details overwrite — the
    // last write per phone is naturally the most recent record.
    contact.name = row.guest_name || contact.name;
    contact.email = row.guest_email || contact.email;
    contact.lastContact = row.created_at;
    if (row.kind === 'booking') contact.bookingCount += 1;
    else contact.inquiryCount += 1;

    byPhone.set(phone, contact);
  }

  const contacts = Array.from(byPhone.values()).sort(
    (a, b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime()
  );

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <div className="mb-8">
        <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E]">Contacts</h1>
        <p className="font-montserrat text-gray-500 text-sm mt-1">
          Every guest who has booked or inquired, merged by phone number — {contacts.length} total.
        </p>
      </div>

      <ContactsList contacts={contacts} />
    </div>
  );
}
