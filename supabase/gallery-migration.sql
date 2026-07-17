-- ============================================================
-- Hotel Elegant — Gallery Images (dynamic, admin-managed)
-- Run this ONCE in Supabase SQL Editor.
-- Creates the gallery_images table, security policies, and
-- seeds it with all the original hotel photos.
-- ============================================================

-- 1. TABLE ----------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url         TEXT NOT NULL,
  alt         TEXT,
  category    TEXT NOT NULL DEFAULT 'hotel',  -- rooms | dining | common | hotel
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_images_category ON gallery_images(category);
CREATE INDEX IF NOT EXISTS idx_gallery_images_sort ON gallery_images(sort_order);

-- 2. ROW LEVEL SECURITY --------------------------------------
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

-- public can read active images; admin can do everything.
-- (is_admin() helper already exists from schema.sql)
DROP POLICY IF EXISTS "gallery_public_read" ON gallery_images;
CREATE POLICY "gallery_public_read" ON gallery_images
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "gallery_admin_all" ON gallery_images;
CREATE POLICY "gallery_admin_all" ON gallery_images
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 3. SEED — all original hotel photos ------------------------
-- Safe to re-run: clears previous seed rows first.
DELETE FROM gallery_images;

INSERT INTO gallery_images (url, alt, category, sort_order) VALUES
  -- Hotel & Exterior
  ('/Hotel Front.jpg',      'Hotel Elegant Executive Suites — building front', 'hotel', 0),
  ('/853883376.jpg',        'Hotel Elegant Executive Suites — street view',    'hotel', 1),

  -- Common Areas (lobby, reception, lounge, hallways)
  ('/511167740.jpg',        'Reception & front desk',        'common', 0),
  ('/511167728.jpg',        'Guest lounge seating area',     'common', 1),
  ('/511167768.jpg',        'Lounge with TV and artwork',    'common', 2),
  ('/511167747.jpg',        'Hallway and waiting area',      'common', 3),

  -- Dining
  ('/Dinning Area.jpg',     'Dining area',                   'dining', 0),
  ('/Buffet Area.jpg',      'Multi-cuisine buffet area',     'dining', 1),
  ('/511167737.jpg',        'Dining table setting',          'dining', 2),

  -- Rooms & Suites
  ('/Executive King 1.jpg',    'Executive King Suite',       'rooms', 0),
  ('/Executive King 2.jpg',    'Executive King Suite',       'rooms', 1),
  ('/Executive King 3.jpg',    'Executive King Suite',       'rooms', 2),
  ('/Executive King 4.jpg',    'Executive King Suite',       'rooms', 3),
  ('/Executive King 5.jpg',    'Executive King Suite',       'rooms', 4),
  ('/Executive King 6.jpg',    'Executive King Suite',       'rooms', 5),
  ('/Family Suite 1.jpg',      'Family Suite',               'rooms', 6),
  ('/Family Suite 2.jpg',      'Family Suite',               'rooms', 7),
  ('/Family Suite 3.jpg',      'Family Suite',               'rooms', 8),
  ('/Junior Suite 1.jpg',      'Junior Suite',               'rooms', 9),
  ('/Junior Suite 2.jpg',      'Junior Suite',               'rooms', 10),
  ('/Junior Suite 3.jpg',      'Junior Suite',               'rooms', 11),
  ('/Junior Suite 4.jpg',      'Junior Suite',               'rooms', 12),
  ('/Presidential Suite 1.jpg','Presidential Suite',         'rooms', 13),
  ('/Presidential Suite 2.jpg','Presidential Suite',         'rooms', 14),
  ('/Presidential Suite 3.jpg','Presidential Suite',         'rooms', 15),
  ('/Triple Sharing 1.jpg',    'Triple Sharing Room',        'rooms', 16),
  ('/Triple Sharing 2.jpg',    'Triple Sharing Room',        'rooms', 17),
  ('/511420769.jpg',           'Guest room interior',        'rooms', 18);

SELECT 'gallery_images created and seeded — ' || COUNT(*) || ' photos' AS status
FROM gallery_images;
