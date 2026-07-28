-- ============================================================
-- MIGRATION: Add inquiries table (pre-contact intent capture)
-- Run once in Supabase SQL Editor.
-- Idempotent: safe to re-run — uses IF NOT EXISTS everywhere.
-- ============================================================

-- Enum types (Postgres CREATE TYPE has no IF NOT EXISTS, so wrap in DO block)
DO $$ BEGIN
  CREATE TYPE inquiry_intent  AS ENUM ('booking','info');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inquiry_channel AS ENUM ('whatsapp','call');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inquiry_status  AS ENUM ('new','converted','closed','spam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS inquiries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_name       TEXT NOT NULL,
  guest_phone      TEXT,
  preferred_channel inquiry_channel NOT NULL,
  intent           inquiry_intent  NOT NULL DEFAULT 'booking',
  check_in         DATE,
  check_out        DATE,
  status           inquiry_status  NOT NULL DEFAULT 'new',
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,
  utm_term         TEXT,
  utm_content      TEXT,
  gclid            TEXT,
  fbclid           TEXT,
  referrer         TEXT,
  landing_path     TEXT,
  notes            TEXT,
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status_created ON inquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at    ON inquiries(created_at DESC);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inquiries_admin_all" ON inquiries;
CREATE POLICY "inquiries_admin_all" ON inquiries
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
