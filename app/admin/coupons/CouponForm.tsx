'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import { upsertCoupon, type CouponFormInput } from './actions';

interface Room { id: string; name: string; }

interface Props {
  rooms: Room[];
  initial?: CouponFormInput;
  isEdit?: boolean;
}

export default function CouponForm({ rooms, initial, isEdit = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [code, setCode] = useState(initial?.code || '');
  const [name, setName] = useState(initial?.name || '');
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>(initial?.discount_type || 'percent');
  const [discountValue, setDiscountValue] = useState(initial?.discount_value?.toString() || '');
  const [validFrom, setValidFrom] = useState(initial?.valid_from || '');
  const [validTo, setValidTo] = useState(initial?.valid_to || '');
  const [stayFrom, setStayFrom] = useState(initial?.stay_from || '');
  const [stayTo, setStayTo] = useState(initial?.stay_to || '');
  const [minNights, setMinNights] = useState(initial?.min_nights?.toString() || '');
  const [minAmount, setMinAmount] = useState(initial?.min_amount?.toString() || '');
  const [maxDiscount, setMaxDiscount] = useState(initial?.max_discount?.toString() || '');
  const [usageLimit, setUsageLimit] = useState(initial?.usage_limit?.toString() || '');
  const [isActive, setIsActive] = useState(initial?.is_active !== false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>(initial?.applies_to_room_ids || []);

  const toggleRoom = (id: string) =>
    setSelectedRooms((cur) => cur.includes(id) ? cur.filter((r) => r !== id) : [...cur, id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const input: CouponFormInput = {
        code,
        name,
        discount_type: discountType,
        discount_value: Number(discountValue),
        valid_from: validFrom || null,
        valid_to: validTo || null,
        stay_from: stayFrom || null,
        stay_to: stayTo || null,
        min_nights: minNights ? Number(minNights) : null,
        min_amount: minAmount ? Number(minAmount) : null,
        max_discount: maxDiscount ? Number(maxDiscount) : null,
        applies_to_room_ids: selectedRooms.length > 0 ? selectedRooms : null,
        usage_limit: usageLimit ? Number(usageLimit) : null,
        is_active: isActive,
      };
      const result = await upsertCoupon(input, isEdit);
      if (!result.success) {
        setError(result.error || 'Save failed.');
        return;
      }
      router.push('/admin/coupons');
      router.refresh();
    });
  };

  const inputClass = 'w-full min-w-0 border border-gray-200 px-3.5 py-2.5 text-sm font-montserrat outline-none focus:border-[#1A0B2E] rounded';
  const labelClass = 'block text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-1.5 font-montserrat';

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 p-6 space-y-5 max-w-3xl">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Code <span className="text-[#E30613]">*</span></label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
            className={inputClass + ' font-mono'}
            placeholder="RAMZAN10"
            required
            disabled={isEdit}
            maxLength={32}
          />
          <p className="text-[10px] text-gray-400 mt-1 font-montserrat">
            Letters, digits, _ and - only. {isEdit && 'Code cannot be changed after creation.'}
          </p>
        </div>
        <div>
          <label className={labelClass}>Display name <span className="text-[#E30613]">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Ramzan 10% off"
            required
            maxLength={120}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Discount type</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'percent', label: 'Percentage %' },
              { value: 'flat', label: 'Flat PKR' },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 border rounded cursor-pointer transition-all text-sm ${
                  discountType === opt.value ? 'border-[#1A0B2E] bg-[#1A0B2E] text-white font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                <input type="radio" name="type" value={opt.value} checked={discountType === opt.value} onChange={() => setDiscountType(opt.value as 'percent' | 'flat')} className="sr-only" />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>
            Discount value {discountType === 'percent' ? '(%)' : '(PKR)'} <span className="text-[#E30613]">*</span>
          </label>
          <input
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className={inputClass}
            placeholder={discountType === 'percent' ? '10' : '500'}
            required
            min={0.01}
            step={0.01}
          />
        </div>
      </div>

      <div className="border border-gray-100 rounded p-4 space-y-4">
        <p className="font-montserrat font-semibold text-xs uppercase tracking-wide text-[#1A0B2E]">Constraints (all optional)</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Booking valid from</label>
            <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Booking valid to</label>
            <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Stay from</label>
            <input type="date" value={stayFrom} onChange={(e) => setStayFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Stay to</label>
            <input type="date" value={stayTo} onChange={(e) => setStayTo(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Min nights</label>
            <input type="number" value={minNights} onChange={(e) => setMinNights(e.target.value)} className={inputClass} min={1} placeholder="2" />
          </div>
          <div>
            <label className={labelClass}>Min amount (PKR)</label>
            <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className={inputClass} min={0} placeholder="5000" />
          </div>
          <div>
            <label className={labelClass}>Max discount (PKR)</label>
            <input type="number" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} className={inputClass} min={0} placeholder="1500" />
          </div>
        </div>

        <div>
          <label className={labelClass}>Usage limit (total)</label>
          <input type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} className={inputClass + ' max-w-[200px]'} min={1} placeholder="100 (leave blank = unlimited)" />
        </div>

        <div>
          <label className={labelClass}>Applies to rooms</label>
          <p className="text-[11px] text-gray-500 mb-2 font-montserrat">
            Leave all unchecked to apply to every room.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {rooms.map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-2 px-3 py-2 border rounded cursor-pointer text-xs ${
                  selectedRooms.includes(r.id) ? 'border-[#1A0B2E] bg-[#1A0B2E]/[0.05] text-[#1A0B2E] font-semibold' : 'border-gray-200 text-gray-600'
                }`}
              >
                <input type="checkbox" checked={selectedRooms.includes(r.id)} onChange={() => toggleRoom(r.id)} className="accent-[#E30613] w-4 h-4" />
                <span className="truncate">{r.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-[#E30613] w-4 h-4" />
        <span className="font-montserrat text-sm text-gray-700 font-medium">Active</span>
        <span className="text-[11px] text-gray-500">Uncheck to keep the code but stop it from working.</span>
      </label>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded font-montserrat">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending} className="btn-red py-3 px-8 text-xs disabled:opacity-50 flex items-center gap-2">
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isPending ? 'Saving…' : (isEdit ? 'Save changes' : 'Create coupon')}
        </button>
        <button type="button" onClick={() => router.back()} className="py-3 px-6 border border-gray-300 text-gray-700 text-xs font-montserrat font-semibold uppercase tracking-wider rounded">
          Cancel
        </button>
      </div>
    </form>
  );
}
