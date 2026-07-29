-- ============================================================
-- Hotel Elegant Executive Suites — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ROOMS
-- ============================================================
CREATE TABLE rooms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  size_sqft     INTEGER,
  max_adults    INTEGER NOT NULL DEFAULT 2,
  max_children  INTEGER NOT NULL DEFAULT 0,
  view          TEXT DEFAULT 'City View',
  price_per_night NUMERIC(10,2),
  offer_price   NUMERIC(10,2),
  amenities     TEXT[] DEFAULT '{}',
  is_active     BOOLEAN DEFAULT true,
  -- How many physical units of this room type exist. When bookings +
  -- manual blocks for a date reach this number, the room is sold out
  -- for that date. Default 1 = single-unit legacy behaviour.
  total_units   INTEGER NOT NULL DEFAULT 1,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROOM IMAGES
-- ============================================================
CREATE TABLE room_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt         TEXT,
  is_featured BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0
);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TYPE booking_status AS ENUM ('pending','confirmed','checked_in','completed','cancelled');
CREATE TYPE booking_source AS ENUM ('website','walkin','phone','ota');

CREATE TABLE bookings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_ref      TEXT UNIQUE NOT NULL,
  room_id          UUID NOT NULL REFERENCES rooms(id),
  guest_name       TEXT NOT NULL,
  guest_phone      TEXT NOT NULL,
  guest_email      TEXT,
  check_in         DATE NOT NULL,
  check_out        DATE NOT NULL,
  adults           INTEGER NOT NULL DEFAULT 1,
  children         INTEGER NOT NULL DEFAULT 0,
  extra_beds       INTEGER NOT NULL DEFAULT 0,
  nights           INTEGER NOT NULL,
  room_total       NUMERIC(12,2) NOT NULL,
  extra_bed_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total      NUMERIC(12,2) NOT NULL,
  special_request  TEXT,
  status           booking_status DEFAULT 'pending',
  source           booking_source DEFAULT 'website',
  -- First-touch attribution captured by <UtmCapture /> in sessionStorage
  -- and posted along with the booking. Lets admin see and reports filter by
  -- ad source (Facebook Ads / Google Ads / organic / direct).
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,
  utm_term         TEXT,
  utm_content      TEXT,
  gclid            TEXT,   -- Google Ads click id (most reliable ad signal)
  fbclid           TEXT,   -- Meta Ads click id
  referrer         TEXT,   -- referring host at first landing ('google.com' etc.)
  landing_path     TEXT,   -- first page they hit ('/lp/book', '/rooms/family-suite'…)
  -- Coupon fields: if a discount code was applied, we record the code and
  -- the PKR discount amount so reports show the exact impact per booking.
  coupon_code      TEXT,
  discount_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INQUIRIES  (pre-contact intent capture)
-- ============================================================
-- Every time a guest clicks a "WhatsApp us" / "Call us" button on the
-- public site, we intercept with a 2-field modal (name + intent) and
-- persist an inquiry row BEFORE we hand them off to wa.me / tel:. This
-- gives us:
--   • Named + hashed lead signal for Meta CAPI (huge EMQ boost vs the
--     old cookie-only click event)
--   • First-touch UTM/fbclid/gclid saved per inquiry, so when staff
--     later converts an inquiry to a booking in admin, the ad
--     attribution transfers instead of getting lost
-- The row is deliberately small: no dates/room/price. Those get filled
-- in when admin promotes the inquiry to a real booking.

CREATE TYPE inquiry_intent  AS ENUM ('booking','info');
CREATE TYPE inquiry_channel AS ENUM ('whatsapp','call');
CREATE TYPE inquiry_status  AS ENUM ('new','converted','closed','spam');

CREATE TABLE inquiries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_name       TEXT NOT NULL,
  guest_phone      TEXT,               -- optional; guest can fill in modal
  guest_email      TEXT,               -- optional; useful when call is missed
  preferred_channel inquiry_channel NOT NULL,   -- which button they clicked
  intent           inquiry_intent  NOT NULL DEFAULT 'booking',
  -- Optional dates — modal lets guest skip. Stored so admin has a head-start
  -- when converting to a real booking; NULL means "guest didn't say yet".
  check_in         DATE,
  check_out        DATE,
  status           inquiry_status  NOT NULL DEFAULT 'new',
  -- Attribution snapshot at the moment of the click, sourced from the same
  -- sessionStorage helper the booking form uses. Lets us credit ads for
  -- inquiries that never make it to the public booking form.
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,
  utm_term         TEXT,
  utm_content      TEXT,
  gclid            TEXT,
  fbclid           TEXT,
  referrer         TEXT,
  landing_path     TEXT,
  -- Free-text notes admin adds while working the inquiry
  notes            TEXT,
  -- Link back to the booking this inquiry became, if any (status='converted').
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inquiries_status_created ON inquiries(status, created_at DESC);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);

-- ============================================================
-- AVAILABILITY BLOCKS
-- ============================================================
CREATE TYPE block_reason AS ENUM ('booking','maintenance','walkin');

CREATE TABLE availability_blocks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  reason     block_reason NOT NULL DEFAULT 'booking',
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL
  -- No UNIQUE(room_id, date): a room can be blocked up to total_units
  -- times per date (one row per blocked unit). Availability check counts
  -- rows and compares to rooms.total_units.
);

-- ============================================================
-- AVAILABILITY OVERRIDES  (per-date total_units override)
-- ============================================================
-- When present for (room_id, date), overrides rooms.total_units for that
-- specific day. Used to reduce inventory for maintenance, owner-holds,
-- or any one-off cap change — clean alternative to adding "phantom"
-- manual blocks that would clutter the reports.
CREATE TABLE availability_overrides (
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  effective_total INTEGER NOT NULL CHECK (effective_total >= 0),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, date)
);

-- ============================================================
-- COUPONS  (discount codes applied at booking)
-- ============================================================
-- Discounts the ROOM TOTAL (nights × price) only. Extra beds stay at
-- their fixed rate. All constraint fields are optional — a coupon with
-- no constraints is a global always-valid discount.
CREATE TABLE coupons (
  code            TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percent','flat')),
  discount_value  NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  valid_from      DATE,
  valid_to        DATE,
  stay_from       DATE,
  stay_to         DATE,
  min_nights      INTEGER,
  min_amount      NUMERIC(10,2),
  max_discount    NUMERIC(10,2),
  applies_to_room_ids UUID[],
  usage_limit     INTEGER,
  times_used      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTENT (editable from admin)
-- ============================================================
CREATE TABLE content (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADMIN USERS (maps Supabase Auth user → dashboard role)
-- ============================================================
-- role='admin'        → full access (settings, content, rooms, reports, etc.)
-- role='receptionist' → limited to bookings + inquiries (front-desk staff)
CREATE TABLE admin_users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','receptionist')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_availability_blocks_room_date ON availability_blocks(room_id, date);
CREATE INDEX idx_bookings_room_id ON bookings(room_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_check_in ON bookings(check_in);
CREATE INDEX idx_bookings_utm_source ON bookings(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX idx_room_images_room_id ON room_images(room_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE rooms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                ENABLE ROW LEVEL SECURITY;
ALTER TABLE content           ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users       ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a full admin? Used for admin-only surfaces
-- (settings, content, rooms/gallery, reports, team management).
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: is current user any staff member (admin OR receptionist)? Used
-- for shared operational surfaces — bookings, inquiries, availability —
-- so reception can do day-to-day work without touching config.
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- rooms: public read, admin write
CREATE POLICY "rooms_public_read"  ON rooms FOR SELECT USING (true);
CREATE POLICY "rooms_admin_all"    ON rooms FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

-- room_images: public read, admin write
CREATE POLICY "rimages_public_read" ON room_images FOR SELECT USING (true);
CREATE POLICY "rimages_admin_all"   ON room_images FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

-- bookings: any staff (admin or receptionist) may read/write. Public inserts
-- still go through the service role server action, not RLS.
CREATE POLICY "bookings_staff_all"  ON bookings FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- inquiries: any staff may read/write — reception's core workflow.
CREATE POLICY "inquiries_staff_all" ON inquiries FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- coupons: admin-only. Public bookings validate/consume through the server
-- action with the service client so no public read policy is needed.
CREATE POLICY "coupons_admin_all" ON coupons FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- availability_blocks: public read (to check availability), any staff write
-- (reception needs to block dates when taking walk-in / phone bookings).
CREATE POLICY "avail_public_read"   ON availability_blocks FOR SELECT USING (true);
CREATE POLICY "avail_staff_write"   ON availability_blocks FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- availability_overrides: staff read/write; public bookings check via service role
CREATE POLICY "overrides_staff_all" ON availability_overrides FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- content: public read, admin write
CREATE POLICY "content_public_read" ON content FOR SELECT USING (true);
CREATE POLICY "content_admin_all"   ON content FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- settings: public read, admin write
CREATE POLICY "settings_public_read" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_all"   ON settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- admin_users:
--   • Any authenticated staff member can read their OWN row (needed so
--     server code can look up their role without holding admin rights).
--   • Full admins can read all rows (for the Team management page).
--   • Writes are admin-only (Team page uses service role for inserts).
CREATE POLICY "admin_users_self_read" ON admin_users FOR SELECT
  USING (id = auth.uid() OR is_admin());
CREATE POLICY "admin_users_admin_write" ON admin_users FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
