'use client';

import { useState, useTransition } from 'react';
import { Save, Loader2, Zap } from 'lucide-react';
import { saveLastMinuteConfig } from './actions';
import type { LastMinuteConfig } from '@/lib/lastMinute';

interface Room { id: string; name: string; }
interface Props { initial: LastMinuteConfig; rooms: Room[]; }

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const fmtHour = (h: number) => {
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:00 ${ampm}`;
};

export default function LastMinuteForm({ initial, rooms }: Props) {
  const [c, setC] = useState<LastMinuteConfig>(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof LastMinuteConfig>(key: K, value: LastMinuteConfig[K]) =>
    setC((prev) => ({ ...prev, [key]: value }));

  const toggleRoom = (id: string) => {
    const current = c.eligibleRoomIds || [];
    const next = current.includes(id) ? current.filter((r) => r !== id) : [...current, id];
    set('eligibleRoomIds', next.length > 0 ? next : null);
  };

  const handleSave = () => {
    setError('');
    startTransition(async () => {
      const res = await saveLastMinuteConfig(c);
      if (!res.success) { setError(res.error || 'Save failed.'); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const labelClass = 'block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-1.5';
  const inputClass = 'w-full border border-gray-200 px-3.5 py-2.5 font-montserrat text-sm outline-none focus:border-[#1A0B2E] transition-colors bg-white';

  return (
    <div className="max-w-2xl space-y-5">
      {/* Master switch */}
      <label className={`flex items-center gap-3 border p-4 cursor-pointer transition-colors ${c.enabled ? 'border-[#E30613] bg-red-50' : 'border-gray-200 bg-white'}`}>
        <input type="checkbox" checked={c.enabled} onChange={(e) => set('enabled', e.target.checked)} className="accent-[#E30613] w-5 h-5" />
        <Zap size={18} className={c.enabled ? 'text-[#E30613]' : 'text-gray-400'} />
        <div>
          <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">Last-Minute Deal is {c.enabled ? 'ON' : 'OFF'}</p>
          <p className="text-[11px] text-gray-500 font-montserrat">Master switch — the deal only shows when this is on AND the window conditions are met.</p>
        </div>
      </label>

      <div className="bg-white border border-gray-100 p-6 space-y-5">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Discount %</label>
            <input type="number" min={1} max={90} value={c.discountPercent} onChange={(e) => set('discountPercent', Number(e.target.value))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Starts at (PKT)</label>
            <select value={c.startHour} onChange={(e) => set('startHour', Number(e.target.value))} className={inputClass}>
              {HOURS.map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Ends at (PKT)</label>
            <select value={c.endHour} onChange={(e) => set('endHour', Number(e.target.value))} className={inputClass}>
              {HOURS.map((h) => <option key={h} value={h}>{fmtHour(h)}:59</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Date window (how many days ahead qualifies)</label>
          <select value={c.maxDaysWindow} onChange={(e) => set('maxDaysWindow', Number(e.target.value))} className={inputClass + ' max-w-xs'}>
            <option value={0}>Same-day check-in only (today)</option>
            <option value={1}>Today + tomorrow (48 hours)</option>
            <option value={2}>Today + next 2 days</option>
            <option value={3}>Today + next 3 days</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Eligible rooms</label>
          <p className="text-[11px] text-gray-500 mb-2 font-montserrat">Leave all unchecked to run on every room.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {rooms.map((r) => {
              const on = (c.eligibleRoomIds || []).includes(r.id);
              return (
                <label key={r.id} className={`flex items-center gap-2 px-3 py-2 border cursor-pointer text-xs ${on ? 'border-[#1A0B2E] bg-[#1A0B2E]/[0.05] text-[#1A0B2E] font-semibold' : 'border-gray-200 text-gray-600'}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleRoom(r.id)} className="accent-[#E30613] w-4 h-4" />
                  <span className="truncate">{r.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={c.blackoutWeekends} onChange={(e) => set('blackoutWeekends', e.target.checked)} className="accent-[#E30613] w-4 h-4" />
          <span className="font-montserrat text-sm text-gray-700">Turn the deal off on Friday & Saturday check-ins</span>
        </label>

        <div>
          <label className={labelClass}>Blackout dates (deal off — comma separated, yyyy-mm-dd)</label>
          <input
            type="text"
            value={c.blackoutDates.join(', ')}
            onChange={(e) => set('blackoutDates', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            placeholder="2026-08-14, 2026-12-25"
            className={inputClass}
          />
        </div>
      </div>

      {/* Advance payment (JazCash) */}
      <div className="bg-white border border-gray-100 p-6 space-y-4">
        <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">Advance payment (shown at checkout when the deal applies)</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>JazCash number</label>
            <input type="text" value={c.jazzcashNumber} onChange={(e) => set('jazzcashNumber', e.target.value)} placeholder="0300-0000000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Account name</label>
            <input type="text" value={c.jazzcashName} onChange={(e) => set('jazzcashName', e.target.value)} placeholder="Hotel Elegant Executive Suites" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Payment window (minutes to send the screenshot)</label>
          <input type="number" min={5} max={240} value={c.paymentWindowMins} onChange={(e) => set('paymentWindowMins', Number(e.target.value))} className={inputClass + ' max-w-[160px]'} />
        </div>
        <div>
          <label className={labelClass}>Terms &amp; Conditions text</label>
          <textarea rows={5} value={c.termsText} onChange={(e) => set('termsText', e.target.value)} className={inputClass + ' resize-none leading-relaxed'} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 font-montserrat">{error}</p>}
      {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2.5 font-montserrat">Last-Minute campaign saved.</p>}

      <button onClick={handleSave} disabled={isPending} className="btn-red py-3 px-8 text-xs disabled:opacity-50 flex items-center gap-2">
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {isPending ? 'Saving…' : 'Save Campaign'}
      </button>
    </div>
  );
}
