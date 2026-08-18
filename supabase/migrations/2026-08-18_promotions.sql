-- ============================================================
-- MIGRATION: Promotions (editable marketing offers)
-- Run once in Supabase SQL Editor. Idempotent.
-- ============================================================
--
-- Promotions are purely informational marketing cards shown on the public
-- /promotions page and the floating promo popup. They are NOT tied to the
-- coupon/discount engine — a promotion is copy + image + a "Book Now" link
-- the admin can create/edit/reorder without touching code.
-- ============================================================

CREATE TABLE IF NOT EXISTS promotions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,       -- stable anchor / tab id
  title       TEXT NOT NULL,              -- "Early Booking Offer"
  tagline     TEXT,                       -- short eyebrow line
  description TEXT NOT NULL DEFAULT '',    -- body copy
  image_url   TEXT,                        -- /public path or full URL
  badge       TEXT,                        -- small pill e.g. "Save More"
  cta_label   TEXT NOT NULL DEFAULT 'Book Now',
  cta_href    TEXT NOT NULL DEFAULT '/booking',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_active_order ON promotions(is_active, sort_order);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Public may read only ACTIVE promotions (this is public marketing content).
DROP POLICY IF EXISTS "promotions_public_read" ON promotions;
CREATE POLICY "promotions_public_read" ON promotions
  FOR SELECT USING (is_active = TRUE);

-- Admins manage everything (mirrors the coupons policy; is_admin() helper
-- already exists from the coupons migration).
DROP POLICY IF EXISTS "promotions_admin_all" ON promotions;
CREATE POLICY "promotions_admin_all" ON promotions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Keep updated_at fresh on every edit.
CREATE OR REPLACE FUNCTION set_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_promotions_updated_at ON promotions;
CREATE TRIGGER trg_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION set_promotions_updated_at();

-- Seed three starter offers (fully editable in the admin panel). Idempotent
-- by slug so re-running the migration never duplicates rows.
INSERT INTO promotions (slug, title, tagline, description, image_url, badge, cta_label, cta_href, sort_order, is_active)
VALUES
  ('early-booking', 'Early Booking Offer', 'Plan ahead & save',
   'Book at least 7 days before check-in and enjoy our best direct rate at Hotel Elegant Executive Suites, Multan. Ideal for business trips and family holidays — reserve early, pay at checkout, and confirm instantly on WhatsApp. No advance payment required.',
   '/Executive King 1.jpg', 'Save More', 'Book Now', '/booking', 1, TRUE),
  ('last-minute', 'Last Minute Deal', 'Spontaneous getaways',
   'Travelling on short notice? Grab a last-minute room at Hotel Elegant Executive Suites, Multan with instant WhatsApp confirmation and no advance payment. Comfortable suites, 24/7 reception and our best direct rate.',
   '/Junior Suite 1.jpg', 'Limited', 'Book Now', '/booking', 2, TRUE),
  ('long-stay', 'Long Stay Offer', 'Stay longer, save more',
   'Staying 3 nights or more? Enjoy our best long-stay direct rate plus flexible check-in and late check-out (subject to availability). Corporate and monthly packages welcome — message us on WhatsApp for a custom quote.',
   '/Family Suite 1.jpg', 'Best Value', 'Book Now', '/booking', 3, TRUE)
ON CONFLICT (slug) DO NOTHING;
