'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props { settings: Record<string, string>; }

const fields = [
  { key: 'hotel_name', label: 'Hotel Name', type: 'text' },
  { key: 'hotel_tagline', label: 'Tagline', type: 'text' },
  { key: 'hotel_address', label: 'Address', type: 'text' },
  { key: 'hotel_phone', label: 'Display Phone', type: 'text' },
  { key: 'hotel_phone_e164', label: 'Phone (E.164 format)', type: 'text', hint: 'e.g. +923173330998' },
  { key: 'hotel_whatsapp', label: 'WhatsApp Number (digits only)', type: 'text', hint: 'e.g. 923173330998' },
  { key: 'hotel_email', label: 'Hotel Email', type: 'email' },
  { key: 'notification_email', label: 'Booking Notification Email', type: 'email', hint: 'New booking alerts are sent here.' },
  { key: 'extra_bed_price', label: 'Extra Bed Price (PKR)', type: 'number' },
  { key: 'checkin_time', label: 'Check-in Policy', type: 'text' },
  { key: 'checkout_time', label: 'Check-out Policy', type: 'text' },
  { key: 'cancellation_policy', label: 'Cancellation Policy', type: 'textarea' },
  { key: 'children_policy', label: 'Children & Extra Beds Policy', type: 'textarea' },
  { key: 'payment_methods', label: 'Payment Methods', type: 'textarea' },
  { key: 'parking_wifi', label: 'Parking & WiFi', type: 'textarea' },
  { key: 'pets_policy', label: 'Pets Policy', type: 'text' },
  { key: 'long_stay', label: 'Long Stay Policy', type: 'textarea' },
  { key: 'checkin_requirements', label: 'Check-in Requirements', type: 'textarea' },
];

export default function SettingsForm({ settings }: Props) {
  const [values, setValues] = useState<Record<string, string>>(settings);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    startTransition(async () => {
      const supabase = createClient();
      for (const f of fields) {
        await supabase.from('settings').upsert({ key: f.key, value: values[f.key] || '' }, { onConflict: 'key' });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  return (
    <div className="max-w-2xl bg-white border border-gray-100 p-8 space-y-5">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-1.5">
            {f.label}
          </label>
          {f.type === 'textarea' ? (
            <textarea
              value={values[f.key] || ''}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 px-4 py-2.5 font-montserrat text-sm outline-none focus:border-[#1A0B2E] transition-colors resize-none"
            />
          ) : (
            <input
              type={f.type}
              value={values[f.key] || ''}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="w-full border border-gray-200 px-4 py-2.5 font-montserrat text-sm outline-none focus:border-[#1A0B2E] transition-colors"
            />
          )}
          {(f as any).hint && <p className="text-xs font-montserrat text-gray-400 mt-1">{(f as any).hint}</p>}
        </div>
      ))}

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm font-montserrat">
          Settings saved successfully.
        </div>
      )}

      <button onClick={handleSave} disabled={isPending} className="btn-red w-full py-3 disabled:opacity-50">
        {isPending ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
