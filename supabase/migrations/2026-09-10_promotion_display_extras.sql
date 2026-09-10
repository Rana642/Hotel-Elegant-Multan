-- Promotion extras to match Silver Sand's admin UX:
--   • coupon_code  — display-only code (e.g. "EARLY10"). Marketing hint;
--                    the real coupon logic still lives in the coupons table.
--   • benefits     — bullet list rendered on cards & the promotions page.
alter table promotions
  add column if not exists coupon_code text,
  add column if not exists benefits    text[] default '{}'::text[];
