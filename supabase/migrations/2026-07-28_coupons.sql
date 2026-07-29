-- ============================================================
-- MIGRATION: Coupon codes
-- Run once in Supabase SQL Editor. Idempotent.
-- ============================================================
--
-- Coupons discount the ROOM TOTAL (nights × price) only — extra beds stay
-- at their fixed rate. Each coupon has an optional set of constraints:
-- booking-window (valid_from / valid_to), stay-window (stay_from / stay_to),
-- minimum nights, minimum booking amount, max discount cap (for percentage
-- coupons), room whitelist (nullable = all rooms), and total-uses cap.
-- Bookings that consumed a coupon record the code + discount amount so
-- reporting and refunds always know the exact figures.
-- ============================================================

CREATE TABLE IF NOT EXISTS coupons (
  code            TEXT PRIMARY KEY,       -- uppercase, matches trimmed input case-insensitively
  name            TEXT NOT NULL,          -- human-readable label ("Ramzan 10%")
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percent','flat')),
  discount_value  NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  valid_from      DATE,
  valid_to        DATE,
  stay_from       DATE,
  stay_to         DATE,
  min_nights      INTEGER,
  min_amount      NUMERIC(10,2),
  max_discount    NUMERIC(10,2),
  applies_to_room_ids UUID[],             -- NULL = all rooms
  usage_limit     INTEGER,                -- NULL = unlimited
  times_used      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Admin-only writes; public bookings validate through the server action
-- with the service client so RLS doesn't need a public read policy.
DROP POLICY IF EXISTS "coupons_admin_all" ON coupons;
CREATE POLICY "coupons_admin_all" ON coupons
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Bookings: remember which coupon was used and how much it was worth.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Atomic increment for usage_limit enforcement — public server action calls
-- this to bump times_used, but only if the coupon is still active and not
-- already at capacity. Returns TRUE on success, FALSE if the coupon was
-- exhausted between validate-time and booking-commit-time (race guard).
CREATE OR REPLACE FUNCTION consume_coupon(p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  updated INT;
BEGIN
  UPDATE coupons
     SET times_used = times_used + 1
   WHERE code = p_code
     AND is_active = TRUE
     AND (usage_limit IS NULL OR times_used < usage_limit);
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
