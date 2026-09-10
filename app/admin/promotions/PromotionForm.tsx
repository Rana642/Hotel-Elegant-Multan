'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, Trash2, RotateCcw, ImageIcon } from 'lucide-react';
import { upsertPromotion, deletePromotion, type PromotionFormInput } from './actions';

interface RoomLite { id: string; name: string; }

interface Props {
  initial: PromotionFormInput & { id: string };   // always an existing row (created via + Add promotion)
  rooms?: RoomLite[];
}

const DAY_LABELS: [number, string][] = [
  [0, 'Sun'], [1, 'Mon'], [2, 'Tue'], [3, 'Wed'],
  [4, 'Thu'], [5, 'Fri'], [6, 'Sat'],
];

// The "When does it apply?" dropdown is a friendly wrapper over the raw
// rule columns. Each mode maps to a specific rule and hides the others in
// the UI; on save we only persist the chosen mode's rule and clear the rest
// so the rules engine doesn't accidentally AND stale rows together.
type ApplyMode = 'date_range' | 'last_minute' | 'early_bird' | 'long_stay' | 'always';

function deriveMode(p: PromotionFormInput): ApplyMode {
  if (p.lead_time_type === 'last_minute') return 'last_minute';
  if (p.lead_time_type === 'early_bird')  return 'early_bird';
  if ((p.min_nights ?? 0) > 1)            return 'long_stay';
  if (p.start_date || p.end_date)         return 'date_range';
  return 'always';
}

// Postgres TIME columns round-trip as "HH:MM:SS" — the <input type="time">
// element wants exactly "HH:MM", so strip any trailing seconds on load.
function toHM(s?: string | null): string {
  if (!s) return '';
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

export default function PromotionForm({ initial, rooms = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDelete]    = useTransition();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // ── Marketing ─────────────────────────────────────────────────────────
  const [title, setTitle]             = useState(initial.title || '');
  const [slug]                        = useState(initial.slug || '');
  const [tagline, setTagline]         = useState(initial.tagline || '');
  const [description, setDescription] = useState(initial.description || '');
  const [imageUrl, setImageUrl]       = useState(initial.image_url || '');
  const [badge, setBadge]             = useState(initial.badge || '');
  const [couponCode, setCouponCode]   = useState(initial.coupon_code || '');
  const [benefits, setBenefits]       = useState((initial.benefits || []).join('\n'));
  const [sortOrder, setSortOrder]     = useState(String(initial.sort_order ?? 0));
  const [isActive, setIsActive]       = useState(initial.is_active !== false);

  // ── Deal rules ────────────────────────────────────────────────────────
  const [discountPct, setDiscountPct] = useState(String(initial.discount_percent ?? 0));
  const [applyMode, setApplyMode]     = useState<ApplyMode>(deriveMode(initial));
  const [startDate, setStartDate]     = useState(initial.start_date ?? '');
  const [endDate, setEndDate]         = useState(initial.end_date ?? '');
  const [leadDays, setLeadDays]       = useState(String(initial.lead_time_days ?? 0));
  const [minNights, setMinNights]     = useState(String(initial.min_nights ?? 0));
  const [startTime, setStartTime]     = useState(toHM(initial.start_time));
  const [endTime, setEndTime]         = useState(toHM(initial.end_time));
  const [weekdays, setWeekdays]       = useState<number[]>(initial.weekdays ?? []);
  const [roomIds, setRoomIds]         = useState<string[]>(initial.room_ids ?? []);
  const [refundable, setRefundable]   = useState(initial.refundable !== false);
  const [freeCancelDays, setFreeCancelDays] = useState(String(initial.free_cancel_days ?? 2));
  const [priority, setPriority]       = useState(String(initial.priority ?? 0));

  const toggleDay = (d: number) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  const toggleRoom = (id: string) =>
    setRoomIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const resetDates = () => { setStartDate(''); setEndDate(''); };
  const setAllDay  = () => { setStartTime(''); setEndTime(''); };

  const save = () => {
    setMsg(null);
    startTransition(async () => {
      // Persist only the chosen apply-mode's rule so the engine doesn't
      // AND stale columns from a previous mode.
      const input: PromotionFormInput = {
        id: initial.id,
        slug,
        title,
        tagline: tagline || null,
        description: description || null,
        image_url: imageUrl || null,
        badge: badge || null,
        coupon_code: couponCode || null,
        benefits: benefits.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
        discount_percent: Number(discountPct) || 0,
        start_date: applyMode === 'date_range' ? (startDate || null) : null,
        end_date:   applyMode === 'date_range' ? (endDate   || null) : null,
        lead_time_type:
          applyMode === 'last_minute' ? 'last_minute'
          : applyMode === 'early_bird' ? 'early_bird'
          : 'none',
        lead_time_days: (applyMode === 'last_minute' || applyMode === 'early_bird') ? (Number(leadDays) || 0) : 0,
        min_nights: applyMode === 'long_stay' ? (Number(minNights) || 0) : 0,
        start_time: startTime || null,
        end_time:   endTime   || null,
        weekdays,
        room_ids: roomIds,
        refundable,
        free_cancel_days: Number(freeCancelDays) || 0,
        priority: Number(priority) || 0,
      };
      const r = await upsertPromotion(input, true);
      if (!r.success) return setMsg({ kind: 'err', text: r.error || 'Save failed.' });
      setMsg({ kind: 'ok', text: 'Saved.' });
      router.refresh();
    });
  };

  const remove = () => {
    if (!confirm(`Delete "${title || 'this promotion'}"? This cannot be undone.`)) return;
    startDelete(async () => {
      const r = await deletePromotion(initial.id);
      if (!r.success) return setMsg({ kind: 'err', text: r.error || 'Delete failed.' });
      router.refresh();
    });
  };

  // Shared field chrome — tight rows, no rounded corners (matches Silver Sand).
  const field = 'w-full min-w-0 border border-gray-300 px-3 py-2 text-sm font-montserrat outline-none focus:border-[#1A0B2E]';
  const label = 'block text-[11px] font-semibold text-gray-600 mb-1 font-montserrat';

  const dealActive = Number(discountPct) > 0;

  return (
    <div className="bg-white border border-gray-200 mb-4">
      <div className="grid gap-4 p-4 lg:grid-cols-[180px_1fr]">
        {/* Image column */}
        <div>
          <div className="relative aspect-[4/3] w-full bg-gray-100 border border-gray-200 overflow-hidden">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <ImageIcon size={32} />
              </div>
            )}
          </div>
          <label className="mt-2 flex items-center justify-center gap-1.5 border border-gray-300 py-1.5 text-[11px] font-montserrat font-semibold text-gray-700 hover:bg-gray-50 cursor-text">
            <ImageIcon size={12} /> Image URL
          </label>
          <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={field + ' mt-1 text-[11px]'} placeholder="/Executive King 1.jpg" />
        </div>

        {/* Fields column */}
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={label}>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="Last Minute Deal" maxLength={120} />
            </div>
            <div>
              <label className={label}>Slug (url)</label>
              <input type="text" value={slug} readOnly className={field + ' bg-gray-50 font-mono text-gray-500'} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={label}>Badge (e.g. 20% Off)</label>
              <input type="text" value={badge} onChange={(e) => setBadge(e.target.value)} className={field} placeholder="Instant Savings" maxLength={40} />
            </div>
            <div>
              <label className={label}>Coupon code (optional)</label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                className={field}
                placeholder="E.G. EARLY10"
                maxLength={32}
              />
            </div>
          </div>

          <div>
            <label className={label}>Short description (card)</label>
            <textarea value={tagline} onChange={(e) => setTagline(e.target.value)} className={field + ' resize-none'} rows={2} placeholder="Sudden trip to Multan? Grab instant savings on last-minute bookings." maxLength={200} />
          </div>

          <div>
            <label className={label}>Full description (blank line = new paragraph)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={field + ' resize-none'} rows={4} placeholder="Book at least 7 days before check-in…" />
          </div>

          <div>
            <label className={label}>Benefits (one per line)</label>
            <textarea value={benefits} onChange={(e) => setBenefits(e.target.value)} className={field + ' resize-none font-mono'} rows={4} placeholder={'Great rates on last-minute stays\nMinutes from the airport & railway station\nConfirm instantly on WhatsApp\nNo advance payment'} />
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-[#E30613] w-4 h-4" />
              <span className="font-montserrat text-sm text-gray-700 font-medium">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <span className="font-montserrat text-sm text-gray-700">Sort</span>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-20 border border-gray-300 px-2 py-1 text-sm font-montserrat outline-none focus:border-[#1A0B2E]" />
            </label>
          </div>

          {/* ── Automatic Discount ─────────────────────────────────────── */}
          <div className="border-t border-gray-200 pt-4">
            <p className="font-playfair font-semibold text-[15px] text-[#1A0B2E]">Automatic Discount <span className="text-gray-500 font-normal font-montserrat text-xs">(optional)</span></p>
            <p className="text-[11px] text-gray-500 font-montserrat mt-0.5">
              Set a discount % and rules to make this promotion apply automatically on the booking page. Leave discount at 0 (or all rules blank) to keep it as a display-only promotion.
            </p>

            <div className="grid gap-3 md:grid-cols-2 mt-3">
              <div>
                <label className={label}>Discount %</label>
                <input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} className={field} min={0} max={100} step={1} placeholder="20" />
              </div>
              <div>
                <label className={label}>When does it apply?</label>
                <select value={applyMode} onChange={(e) => setApplyMode(e.target.value as ApplyMode)} className={field + ' bg-white'}>
                  <option value="always">Anytime (no restriction)</option>
                  <option value="date_range">Specific check-in date range</option>
                  <option value="last_minute">Last Minute — book at most N days before check-in</option>
                  <option value="early_bird">Early Bird — book at least N days before check-in</option>
                  <option value="long_stay">Long Stay — stay N or more nights</option>
                </select>
              </div>
            </div>

            {/* Conditional sub-fields per mode */}
            {applyMode === 'date_range' && (
              <div className="mt-3">
                <label className={label}>Check-in date range</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={'w-auto ' + field} />
                  <span className="text-gray-500 text-sm">to</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={'w-auto ' + field} />
                  <button type="button" onClick={resetDates} className="inline-flex items-center gap-1 border border-gray-300 px-3 py-2 text-xs font-montserrat font-semibold text-gray-700 hover:bg-gray-50">
                    <RotateCcw size={12} /> Reset
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 font-montserrat">Leave blank = any check-in date.</p>
              </div>
            )}
            {(applyMode === 'last_minute' || applyMode === 'early_bird') && (
              <div className="mt-3">
                <label className={label}>
                  {applyMode === 'last_minute' ? 'Book at most N days before check-in' : 'Book at least N days before check-in'}
                </label>
                <input type="number" value={leadDays} onChange={(e) => setLeadDays(e.target.value)} className={field + ' max-w-[140px]'} min={0} placeholder="2" />
                <p className="text-[11px] text-gray-500 mt-1 font-montserrat">
                  Applies when the guest books {applyMode === 'last_minute' ? 'within' : 'at least'} {leadDays || 'N'} day{Number(leadDays) === 1 ? '' : 's'} of check-in.
                </p>
              </div>
            )}
            {applyMode === 'long_stay' && (
              <div className="mt-3">
                <label className={label}>Minimum nights</label>
                <input type="number" value={minNights} onChange={(e) => setMinNights(e.target.value)} className={field + ' max-w-[140px]'} min={0} placeholder="3" />
                <p className="text-[11px] text-gray-500 mt-1 font-montserrat">Applies when the stay is {minNights || 'N'}+ nights.</p>
              </div>
            )}

            {/* Active hours */}
            <div className="mt-3">
              <label className={label}>Active hours</label>
              <div className="flex flex-wrap items-center gap-2">
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={'w-auto ' + field} />
                <span className="text-gray-500 text-sm">to</span>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={'w-auto ' + field} />
                <button type="button" onClick={setAllDay} className="inline-flex items-center gap-1 px-3 py-2 text-xs font-montserrat font-semibold text-green-700 hover:text-green-800">
                  All day
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-montserrat">
                Pakistan time. Blank = all day. Overnight windows like <b>22:00 → 02:00</b> supported.
              </p>
            </div>

            {/* Rooms */}
            {rooms.length > 0 && (
              <div className="mt-3">
                <label className={label}>Applies to <span className="font-normal text-gray-500">(tick rooms — leave all unticked = all rooms)</span></label>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {rooms.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm text-gray-700 font-montserrat cursor-pointer">
                      <input type="checkbox" checked={roomIds.includes(r.id)} onChange={() => toggleRoom(r.id)} className="accent-[#E30613] w-4 h-4" />
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Weekdays */}
            <div className="mt-3">
              <label className={label}>Days of week <span className="font-normal text-gray-500">(tick days — leave all unticked = every day)</span></label>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {DAY_LABELS.map(([d, lbl]) => (
                  <label key={d} className="flex items-center gap-2 text-sm text-gray-700 font-montserrat cursor-pointer">
                    <input type="checkbox" checked={weekdays.includes(d)} onChange={() => toggleDay(d)} className="accent-[#E30613] w-4 h-4" />
                    {lbl}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-montserrat">Deal applies only when the guest's check-in falls on a ticked day (recurring every week).</p>
            </div>

            {/* Refundable + free-cancel + priority */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={refundable} onChange={(e) => setRefundable(e.target.checked)} className="accent-[#E30613] w-4 h-4" />
                <span className="font-montserrat text-sm text-gray-700">Free cancellation <span className="text-gray-400">(uncheck = Non-Refundable)</span></span>
              </label>
              <label className="flex items-center gap-2">
                <span className="font-montserrat text-sm text-gray-700">Free until <span className="text-gray-400">(days before)</span></span>
                <input type="number" value={freeCancelDays} onChange={(e) => setFreeCancelDays(e.target.value)} className="w-20 border border-gray-300 px-2 py-1 text-sm font-montserrat outline-none focus:border-[#1A0B2E] disabled:bg-gray-50" min={0} disabled={!refundable} />
              </label>
              <label className="flex items-center gap-2">
                <span className="font-montserrat text-sm text-gray-700">Priority</span>
                <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className="w-20 border border-gray-300 px-2 py-1 text-sm font-montserrat outline-none focus:border-[#1A0B2E]" />
              </label>
            </div>

            {!dealActive && (
              <p className="mt-3 text-[11px] font-montserrat text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5">
                Discount is 0 — this promotion currently shows as a marketing card only. Set a discount % above to activate the rules.
              </p>
            )}
          </div>

          {msg && (
            <p className={`text-sm font-montserrat px-3 py-2 border ${msg.kind === 'ok' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
              {msg.text}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={save} disabled={isPending} className="inline-flex items-center gap-2 bg-[#F0B429] hover:bg-[#d99e18] disabled:opacity-50 text-[#1A0B2E] px-5 py-2 text-xs font-montserrat font-bold uppercase tracking-wider">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={remove} disabled={isDeleting} className="inline-flex items-center gap-2 border border-[#E30613] text-[#E30613] hover:bg-[#E30613] hover:text-white disabled:opacity-50 px-5 py-2 text-xs font-montserrat font-bold uppercase tracking-wider">
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
