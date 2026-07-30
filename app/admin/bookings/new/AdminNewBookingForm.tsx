'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBooking } from '@/app/actions/booking';
import { markInquiryConverted } from '@/app/admin/inquiries/actions';
import { formatCurrency, calcNights, calcPricing, EXTRA_BED_PRICE } from '@/lib/utils';
import { calculatePricing } from '@/lib/pricing';

interface Room { id: string; name: string; price_per_night: number | null; max_adults: number; max_children: number; }

/** Optional prefill delivered via query string when admin lands here from
 *  the "Convert Inquiry" flow. Every field is optional — a raw sidebar visit
 *  leaves them all undefined and the form falls back to its own defaults. */
interface Prefill {
  fromInquiryId: string | null;
  name: string;
  phone: string;
  checkIn?: string;
  checkOut?: string;
  channel?: 'whatsapp' | 'phone' | 'walkin' | 'ota' | 'website';
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  fbclid?: string;
  gclid?: string;
}

interface Props { rooms: Room[]; prefill?: Prefill; taxPercent: number; }

// ── Traffic-source pickers ────────────────────────────────────────────────
// Two-dropdown model: staff tells us HOW the guest reached us (channel) and
// WHERE the guest originally came from (ad / organic / referral). The channel
// dictates the bookings.source enum; the ad source is stored in the UTM
// columns so Meta CAPI can attribute paid-ad conversions correctly even when
// they close on WhatsApp / phone / walk-in.

type Channel = 'website' | 'whatsapp' | 'phone' | 'walkin' | 'ota';
type AdSource = 'none' | 'facebook_ad' | 'google_ad' | 'google_organic' | 'other';

const CHANNEL_OPTIONS: { value: Channel; label: string; source: 'website' | 'phone' | 'walkin' | 'ota' }[] = [
  { value: 'whatsapp', label: 'WhatsApp message',              source: 'phone'   },
  { value: 'phone',    label: 'Phone call',                    source: 'phone'   },
  { value: 'walkin',   label: 'Walk-in (in person)',           source: 'walkin'  },
  { value: 'ota',      label: 'Booking.com or other OTA',      source: 'ota'     },
  { value: 'website',  label: 'Booked online via website form', source: 'website' },
];

const AD_SOURCE_OPTIONS: { value: AdSource; label: string; utm_source?: string; utm_medium?: string }[] = [
  { value: 'none',           label: 'None / not sure' },
  { value: 'facebook_ad',    label: 'Facebook / Instagram Ad', utm_source: 'facebook', utm_medium: 'cpc'     },
  { value: 'google_ad',      label: 'Google Ad',               utm_source: 'google',   utm_medium: 'cpc'     },
  { value: 'google_organic', label: 'Google Organic search',   utm_source: 'google',   utm_medium: 'organic' },
  { value: 'other',          label: 'Other',                   utm_source: 'other'                            },
];

// Reverse-map an inquiry's UTM source to the AdSource dropdown value so the
// dropdown shows the right pre-selection when converting an inquiry.
function utmToAdSource(utmSource: string | undefined, utmMedium: string | undefined): AdSource {
  if (!utmSource) return 'none';
  if (utmSource === 'facebook') return 'facebook_ad';
  if (utmSource === 'google') return utmMedium === 'organic' ? 'google_organic' : 'google_ad';
  return 'other';
}

export default function AdminNewBookingForm({ rooms, prefill, taxPercent }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [roomId, setRoomId] = useState(rooms[0]?.id || '');
  const [checkIn, setCheckIn] = useState(prefill?.checkIn || today);
  const [checkOut, setCheckOut] = useState(prefill?.checkOut || tomorrow);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [extraBeds, setExtraBeds] = useState(0);
  const [guestName, setGuestName] = useState(prefill?.name || '');
  const [guestPhone, setGuestPhone] = useState(prefill?.phone || '');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  const [channel, setChannel] = useState<Channel>(prefill?.channel ?? 'whatsapp');
  const [adSource, setAdSource] = useState<AdSource>(
    utmToAdSource(prefill?.utmSource, prefill?.utmMedium)
  );
  const [utmCampaign, setUtmCampaign] = useState(prefill?.utmCampaign || '');

  const selectedRoom = rooms.find((r) => r.id === roomId);
  const nights = checkOut > checkIn ? calcNights(checkIn, checkOut) : 0;
  const price = selectedRoom?.price_per_night || 0;
  const { roomTotal, extraBedTotal } = calcPricing(price, nights, extraBeds);
  const pricing = calculatePricing({ roomTotal, extraBedTotal, couponDiscount: 0, taxPercent });
  const grandTotal = pricing.total;

  const inputClass = 'w-full border border-gray-200 px-4 py-2.5 font-montserrat text-sm outline-none focus:border-[#1A0B2E] transition-colors';
  const labelClass = 'block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-1.5';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const channelOpt = CHANNEL_OPTIONS.find((c) => c.value === channel)!;
    const adOpt = AD_SOURCE_OPTIONS.find((a) => a.value === adSource)!;

    // Only send attribution fields that actually have values. utm_campaign is
    // free-text and only relevant when there IS an ad source.
    const attribution: Record<string, string> = {};
    if (adOpt.utm_source) attribution.utm_source = adOpt.utm_source;
    if (adOpt.utm_medium) attribution.utm_medium = adOpt.utm_medium;
    if (adSource !== 'none' && utmCampaign.trim()) attribution.utm_campaign = utmCampaign.trim();

    // Attribution merge: if we came from an inquiry, prefer the inquiry's
    // fbclid/gclid (raw ad-click ids that the browser captured at first
    // touch) over anything the current session might have — those raw ids
    // are what Meta actually matches on.
    if (prefill?.fbclid && !attribution.fbclid) attribution.fbclid = prefill.fbclid;
    if (prefill?.gclid  && !attribution.gclid)  attribution.gclid  = prefill.gclid;

    startTransition(async () => {
      const result = await createBooking({
        roomId, checkIn, checkOut, adults, children, extraBeds,
        guestName, guestPhone, guestEmail, specialRequest,
        source: channelOpt.source,
        attribution: Object.keys(attribution).length > 0 ? attribution : undefined,
      });
      if (result.success && result.bookingId) {
        // If this booking came from an inquiry, close the loop by flipping
        // the inquiry to 'converted' with a back-reference. Failure here is
        // non-fatal — the booking is already in.
        if (prefill?.fromInquiryId) {
          markInquiryConverted(prefill.fromInquiryId, result.bookingId).catch(() => {});
        }
        router.push(`/admin/bookings/${result.bookingId}`);
      } else {
        setError(result.error || 'Failed to create booking.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8 max-w-4xl">
      <div className="lg:col-span-2 bg-white border border-gray-100 p-7 space-y-5">
        <div>
          <label className={labelClass}>Room</label>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputClass}>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}{r.price_per_night ? ` — ${formatCurrency(r.price_per_night)}/night` : ''}</option>)}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={labelClass}>Check-in</label><input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputClass} required /></div>
          <div><label className={labelClass}>Check-out</label><input type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} className={inputClass} required /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Adults', value: adults, set: setAdults, max: selectedRoom?.max_adults || 4 },
            { label: 'Children', value: children, set: setChildren, max: selectedRoom?.max_children || 3 },
            { label: 'Extra Beds', value: extraBeds, set: setExtraBeds, max: 2 },
          ].map(({ label, value, set, max }) => (
            <div key={label}>
              <label className={labelClass}>{label}</label>
              <select value={value} onChange={(e) => set(Number(e.target.value))} className={inputClass}>
                {Array.from({ length: max + 1 }, (_, i) => i).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          ))}
        </div>
        <hr className="border-gray-100" />
        <div><label className={labelClass}>Guest Name *</label><input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} className={inputClass} required /></div>
        <div><label className={labelClass}>Phone *</label><input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className={inputClass} required /></div>
        <div><label className={labelClass}>Email</label><input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className={inputClass} /></div>
        <div><label className={labelClass}>Notes</label><textarea value={specialRequest} onChange={(e) => setSpecialRequest(e.target.value)} rows={3} className={`${inputClass} resize-none`} /></div>

        <hr className="border-gray-100" />

        {/* ─── Traffic source (drives Meta CAPI attribution) ─────────────── */}
        <div className="rounded-md bg-[#1A0B2E]/[0.03] p-4 space-y-4">
          <div>
            <p className="font-montserrat text-xs font-semibold uppercase tracking-wide text-[#1A0B2E]">Traffic Source</p>
            <p className="font-montserrat text-[11px] text-gray-500 mt-0.5">
              Ask the guest &ldquo;how did you find us?&rdquo; if unsure. Helps Meta attribute
              ad-driven WhatsApp / phone bookings correctly.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact channel</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className={inputClass}>
                {CHANNEL_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Ad / referrer</label>
              <select value={adSource} onChange={(e) => setAdSource(e.target.value as AdSource)} className={inputClass}>
                {AD_SOURCE_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>
          {adSource !== 'none' && (
            <div>
              <label className={labelClass}>Campaign name (optional)</label>
              <input
                type="text"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                placeholder="e.g. Summer-2026 or leave blank"
                className={inputClass}
                maxLength={100}
              />
            </div>
          )}
        </div>

        {error && <p className="text-red-600 text-sm font-montserrat bg-red-50 border border-red-200 px-4 py-3">{error}</p>}
        <button type="submit" disabled={isPending} className="btn-red w-full py-3 disabled:opacity-50">
          {isPending ? 'Creating Booking...' : 'Create Walk-in Booking'}
        </button>
      </div>
      <div className="bg-white border border-gray-100 p-5 h-fit">
        <h2 className="font-montserrat font-semibold text-sm uppercase tracking-wide text-[#1A0B2E] mb-4">Summary</h2>
        {nights > 0 && price > 0 ? (
          <div className="space-y-2 text-sm font-montserrat">
            <div className="flex justify-between"><span className="text-gray-500">{formatCurrency(price)} × {nights} nights</span><span className="text-[#1A0B2E]">{formatCurrency(roomTotal)}</span></div>
            {extraBeds > 0 && <div className="flex justify-between"><span className="text-gray-500">Extra beds</span><span className="text-[#1A0B2E]">{formatCurrency(extraBedTotal)}</span></div>}
            <div className="flex justify-between border-t pt-2 font-semibold"><span>Total (room)</span><span className="text-[#E30613]">{formatCurrency(grandTotal)}</span></div>
            {pricing.taxPercent > 0 && (
              <div className="border-t border-dashed pt-2 space-y-0.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>+ {pricing.taxPercent}% tax</span>
                  <span>+{formatCurrency(pricing.taxAmount)}</span>
                </div>
                <p className="text-[10px] text-gray-400">Collected at hotel on checkout</p>
              </div>
            )}
          </div>
        ) : <p className="text-gray-400 text-xs font-montserrat">Select dates to see estimate</p>}
      </div>
    </form>
  );
}
