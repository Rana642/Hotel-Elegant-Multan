-- Azadi 2026 campaign coupon. Independence Day promotion — 100 vouchers,
-- 14% off (max Rs 2,500), booking + stay both restricted to 1-14 August.
-- Room scope = null (applies to all rooms), min_amount = null (no minimum).
--
-- The coupon table's UNIQUE constraint on `code` means running this
-- migration twice is a no-op after the first insert — ON CONFLICT DO
-- NOTHING keeps re-runs safe. If the terms need to change post-launch,
-- the admin edits the row through /admin/coupons rather than a new
-- migration.
--
-- Safety: `is_active = true` here means the coupon is LIVE the moment
-- this migration runs. Run it on/around 1 August, not weeks in advance,
-- unless valid_from is doing the gating for you (it is — 2026-08-01).

INSERT INTO coupons (
  code,
  name,
  discount_type,
  discount_value,
  valid_from,
  valid_to,
  stay_from,
  stay_to,
  min_nights,
  min_amount,
  max_discount,
  applies_to_room_ids,
  usage_limit,
  times_used,
  is_active
) VALUES (
  'AZADI14',
  'Azadi 2026 Special — 14% off',
  'percent',
  14,
  '2026-08-01',
  '2026-08-14',
  '2026-08-01',
  '2026-08-14',
  1,
  NULL,
  2500,
  NULL,
  100,
  0,
  true
) ON CONFLICT (code) DO NOTHING;
