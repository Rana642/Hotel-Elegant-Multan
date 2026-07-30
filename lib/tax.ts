import { createServiceClient } from '@/lib/supabase/server';

// Default tax rate when the setting is missing or malformed. 16% is the
// Punjab Revenue Authority (PRA) sales tax on hotel services as of 2026 —
// this is the number the hotel will actually be liable for if the admin
// forgets to configure it, so failing open at 16 rather than 0 is safer
// than accidentally under-billing guests and eating the tax on our end.
export const DEFAULT_TAX_PERCENT = 16;

/**
 * Read the hotel-wide tax rate from the `settings` table. The setting is
 * stored as a plain string (that's what the settings table holds); we
 * parse to number here so no caller has to think about it. Falls back to
 * DEFAULT_TAX_PERCENT if the row is missing, empty, or unparseable — the
 * admin should never see zero tax silently applied because of a
 * mis-typed setting.
 */
export async function getHotelTaxPercent(): Promise<number> {
  const service = createServiceClient();
  const { data } = await service
    .from('settings')
    .select('value')
    .eq('key', 'hotel_tax_percent')
    .maybeSingle();

  const raw = data?.value;
  if (raw == null || raw === '') return DEFAULT_TAX_PERCENT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_TAX_PERCENT;
  return parsed;
}
