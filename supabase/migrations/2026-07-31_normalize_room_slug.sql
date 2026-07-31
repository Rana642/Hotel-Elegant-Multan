-- Normalize room slug casing. The Executive King room was inserted with slug
-- 'Executive-king' (capital E), inconsistent with every other room which uses
-- lowercase kebab ('family-suite', 'presidential-suite', etc.). This caused
-- 404s from the Azadi LP room cards, which correctly link to /rooms/executive-king,
-- because the room detail page's slug lookup is case-sensitive.
--
-- Web URL convention is lowercase; SEO tooling and social share links both
-- prefer lowercase. Fix: normalize the one bad row. Safe because:
--   1. The room detail page uses generateStaticParams so it will rebuild
--      /rooms/executive-king on the next deploy
--   2. Anyone with an old bookmarked /rooms/Executive-king URL will 404, but
--      that's <10 URLs given the site's age and there's no clean redirect
--      possible for a single-slug case flip without breaking the pattern
--      for real future case-different rooms

UPDATE rooms
SET slug = 'executive-king'
WHERE slug = 'Executive-king';
