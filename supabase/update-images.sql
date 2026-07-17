-- ============================================================
-- Update Room Images to Use Original Hotel Photos
-- Run this in Supabase SQL Editor
-- ============================================================

-- First, delete all old/fake images
DELETE FROM room_images;

-- Get room IDs
WITH room_ids AS (
  SELECT id, slug FROM rooms WHERE is_active = true
)

-- Insert images for Executive King room
INSERT INTO room_images (room_id, url, alt, is_featured, sort_order)
SELECT id, '/Executive King 1.jpg', 'Executive King Suite - Image 1', true, 0 FROM room_ids WHERE slug = 'executive-king'
UNION ALL
SELECT id, '/Executive King 2.jpg', 'Executive King Suite - Image 2', false, 1 FROM room_ids WHERE slug = 'executive-king'
UNION ALL
SELECT id, '/Executive King 3.jpg', 'Executive King Suite - Image 3', false, 2 FROM room_ids WHERE slug = 'executive-king'
UNION ALL
SELECT id, '/Executive King 4.jpg', 'Executive King Suite - Image 4', false, 3 FROM room_ids WHERE slug = 'executive-king'
UNION ALL
SELECT id, '/Executive King 5.jpg', 'Executive King Suite - Image 5', false, 4 FROM room_ids WHERE slug = 'executive-king'
UNION ALL
SELECT id, '/Executive King 6.jpg', 'Executive King Suite - Image 6', false, 5 FROM room_ids WHERE slug = 'executive-king'

-- Family Suite images
UNION ALL
SELECT id, '/Family Suite 1.jpg', 'Family Suite - Image 1', true, 0 FROM room_ids WHERE slug = 'family-suite'
UNION ALL
SELECT id, '/Family Suite 2.jpg', 'Family Suite - Image 2', false, 1 FROM room_ids WHERE slug = 'family-suite'
UNION ALL
SELECT id, '/Family Suite 3.jpg', 'Family Suite - Image 3', false, 2 FROM room_ids WHERE slug = 'family-suite'

-- Junior Suite images
UNION ALL
SELECT id, '/Junior Suite 1.jpg', 'Junior Suite - Image 1', true, 0 FROM room_ids WHERE slug = 'junior-suite'
UNION ALL
SELECT id, '/Junior Suite 2.jpg', 'Junior Suite - Image 2', false, 1 FROM room_ids WHERE slug = 'junior-suite'
UNION ALL
SELECT id, '/Junior Suite 3.jpg', 'Junior Suite - Image 3', false, 2 FROM room_ids WHERE slug = 'junior-suite'
UNION ALL
SELECT id, '/Junior Suite 4.jpg', 'Junior Suite - Image 4', false, 3 FROM room_ids WHERE slug = 'junior-suite'

-- Presidential Suite images
UNION ALL
SELECT id, '/Presidential Suite 1.jpg', 'Presidential Suite - Image 1', true, 0 FROM room_ids WHERE slug = 'presidential-suite'
UNION ALL
SELECT id, '/Presidential Suite 2.jpg', 'Presidential Suite - Image 2', false, 1 FROM room_ids WHERE slug = 'presidential-suite'
UNION ALL
SELECT id, '/Presidential Suite 3.jpg', 'Presidential Suite - Image 3', false, 2 FROM room_ids WHERE slug = 'presidential-suite'

-- Triple Sharing images
UNION ALL
SELECT id, '/Triple Sharing 1.jpg', 'Triple Sharing - Image 1', true, 0 FROM room_ids WHERE slug = 'triple-sharing'
UNION ALL
SELECT id, '/Triple Sharing 2.jpg', 'Triple Sharing - Image 2', false, 1 FROM room_ids WHERE slug = 'triple-sharing';

-- Add special content images to content table
INSERT INTO content (key, value) VALUES
  ('buffet_area_image', '/Buffet Area.jpg'),
  ('dinning_area_image', '/Dinning Area.jpg'),
  ('hotel_front_image', '/Hotel Front.jpg')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

SELECT 'Images updated successfully!' as status;
