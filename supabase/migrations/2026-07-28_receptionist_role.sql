-- ============================================================
-- MIGRATION: Add receptionist role
-- Run once in Supabase SQL Editor after the inquiries migration.
-- Idempotent — safe to re-run.
-- ============================================================

-- 1. Add role column (default 'admin' so existing rows keep full access)
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';

-- Add the CHECK constraint separately (ADD COLUMN + CHECK inline can't be
-- guarded by IF NOT EXISTS on the constraint). Wrap in DO block for idempotency.
DO $$ BEGIN
  ALTER TABLE admin_users
    ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin','receptionist'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Redefine is_admin() to be strict (admin-only). Existing rows are all
-- 'admin' so no one loses access.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. New is_staff() = admin OR receptionist. Used for shared surfaces.
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Swap bookings + inquiries + availability_blocks policies to is_staff()
DROP POLICY IF EXISTS "bookings_admin_all"    ON bookings;
DROP POLICY IF EXISTS "bookings_staff_all"    ON bookings;
CREATE POLICY "bookings_staff_all" ON bookings
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "inquiries_admin_all"   ON inquiries;
DROP POLICY IF EXISTS "inquiries_staff_all"   ON inquiries;
CREATE POLICY "inquiries_staff_all" ON inquiries
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "avail_admin_write"     ON availability_blocks;
DROP POLICY IF EXISTS "avail_staff_write"     ON availability_blocks;
CREATE POLICY "avail_staff_write" ON availability_blocks
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- 5. admin_users: allow user to read own row (needed for server-side role
-- lookup), full admins can read/write everyone.
DROP POLICY IF EXISTS "admin_users_self"        ON admin_users;
DROP POLICY IF EXISTS "admin_users_self_read"   ON admin_users;
DROP POLICY IF EXISTS "admin_users_admin_write" ON admin_users;
CREATE POLICY "admin_users_self_read"  ON admin_users FOR SELECT
  USING (id = auth.uid() OR is_admin());
CREATE POLICY "admin_users_admin_write" ON admin_users FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
