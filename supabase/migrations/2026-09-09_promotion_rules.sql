-- ============================================================
-- MIGRATION: Promotion Rules Engine (port from Hotel Silver Sand)
-- Run once in Supabase SQL Editor. Idempotent (uses IF NOT EXISTS).
-- ============================================================
--
-- Turns the existing marketing-only `promotions` table into a full rules
-- engine: each promotion carries its own discount %, date/time windows,
-- room whitelist, weekday filter, lead-time rules (early bird / last minute),
-- long-stay minimum nights, refundability policy, benefits list, and an
-- optional coupon code — all admin-editable, no per-feature code changes.
-- ============================================================

-- ── EXTEND promotions with rules columns ────────────────────────────────
ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS short_desc       TEXT,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (discount_percent >= 0 AND discount_percent <= 90),
  ADD COLUMN IF NOT EXISTS start_date       DATE,
  ADD COLUMN IF NOT EXISTS end_date         DATE,
  ADD COLUMN IF NOT EXISTS room_ids         UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS weekdays         INT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lead_time_type   TEXT   NOT NULL DEFAULT 'none'
    CHECK (lead_time_type IN ('none','early_bird','last_minute')),
  ADD COLUMN IF NOT EXISTS lead_time_days   INT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_nights       INT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_time       TIME,
  ADD COLUMN IF NOT EXISTS end_time         TIME,
  ADD COLUMN IF NOT EXISTS refundable       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS free_cancel_days INT    NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS priority         INT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS benefits         TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coupon_code      TEXT;

CREATE INDEX IF NOT EXISTS idx_promotions_discount_active
  ON promotions(is_active, discount_percent)
  WHERE discount_percent > 0;

-- ── UPGRADE the 3 seeded starter promotions with real rules ────────────
-- Early Booking: 20% off, booked ≥ 7 days ahead.
UPDATE promotions SET
  short_desc       = COALESCE(short_desc, tagline),
  discount_percent = 20,
  lead_time_type   = 'early_bird',
  lead_time_days   = 7,
  refundable       = TRUE,
  free_cancel_days = 2,
  priority         = 10,
  benefits         = ARRAY['Free breakfast','Free WiFi','Free parking'],
  updated_at       = NOW()
WHERE slug = 'early-booking' AND discount_percent = 0;

-- Last Minute: 30% off, booked ≤ 2 days out, 2 PM – 11:59 PM PKT.
UPDATE promotions SET
  short_desc       = COALESCE(short_desc, tagline),
  discount_percent = 30,
  lead_time_type   = 'last_minute',
  lead_time_days   = 2,
  start_time       = '14:00',
  end_time         = '23:59',
  refundable       = FALSE,          -- non-refundable last-minute rate
  free_cancel_days = 0,
  priority         = 30,
  benefits         = ARRAY['Free WiFi','Instant confirmation'],
  updated_at       = NOW()
WHERE slug = 'last-minute' AND discount_percent = 0;

-- Long Stay: 10% off, stay ≥ 3 nights.
UPDATE promotions SET
  short_desc       = COALESCE(short_desc, tagline),
  discount_percent = 10,
  min_nights       = 3,
  refundable       = TRUE,
  free_cancel_days = 2,
  priority         = 5,
  benefits         = ARRAY['Free breakfast','Free WiFi','Free parking','Late check-out'],
  updated_at       = NOW()
WHERE slug = 'long-stay' AND discount_percent = 0;

-- ── BOOKINGS: remember which promotion / discount actually applied ─────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS promotion_id     UUID REFERENCES promotions(id),
  ADD COLUMN IF NOT EXISTS promotion_name   TEXT,
  ADD COLUMN IF NOT EXISTS promotion_pct    NUMERIC(5,2);
