-- ============================================================
-- MIGRATION: Per-date total_units override
-- Run once in Supabase SQL Editor. Idempotent.
-- ============================================================
--
-- Rooms have a default inventory count (rooms.total_units). This table lets
-- admin override the effective cap for a specific date — e.g. "Family
-- Suite normally has 3 units but on 5 Aug only 2 are available (one
-- reserved for owner, one under deep clean)". When a row exists here for
-- (room_id, date), the calendar + booking availability check use the
-- override; otherwise they fall through to rooms.total_units.
-- ============================================================

CREATE TABLE IF NOT EXISTS availability_overrides (
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  effective_total INTEGER NOT NULL CHECK (effective_total >= 0),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, date)
);

CREATE INDEX IF NOT EXISTS idx_availability_overrides_date
  ON availability_overrides(date);

ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

-- Same access as bookings/availability_blocks — any signed-in staff can
-- read + write. Public bookings read via service role, so no public policy.
DROP POLICY IF EXISTS "overrides_staff_all" ON availability_overrides;
CREATE POLICY "overrides_staff_all" ON availability_overrides
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());
