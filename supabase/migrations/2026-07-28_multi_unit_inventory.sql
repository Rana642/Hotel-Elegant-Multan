-- ============================================================
-- MIGRATION: Multi-unit room inventory
-- Run once in Supabase SQL Editor.
-- Idempotent — safe to re-run.
-- ============================================================
--
-- Each room now represents a room TYPE with multiple physical units. Booking
-- and manual blocking work in units — a Family Suite with 3 units can be
-- booked up to 3 times per date before it shows sold out. This lets admin
-- reflect OTA bookings (Booking.com, etc.) by manually blocking one unit at
-- a time, keeping our website-side inventory in sync.
--
-- Two schema changes:
--   1. rooms.total_units: how many physical units of this type exist
--   2. availability_blocks: drop the UNIQUE(room_id, date) constraint so
--      multiple blocks per date can coexist (one row per blocked unit).
-- ============================================================

-- 1. Room inventory count. Default 1 keeps existing (single-unit) behaviour.
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS total_units INTEGER NOT NULL DEFAULT 1;

-- 2. Drop UNIQUE(room_id, date) so multiple units can be blocked per date.
--    Postgres names the auto-generated unique constraint after the columns;
--    wrap in DO-block for idempotency.
DO $$ BEGIN
  ALTER TABLE availability_blocks
    DROP CONSTRAINT availability_blocks_room_id_date_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Add a non-unique index (idx already exists from schema.sql but ensure it's here)
CREATE INDEX IF NOT EXISTS idx_availability_blocks_room_date ON availability_blocks(room_id, date);
