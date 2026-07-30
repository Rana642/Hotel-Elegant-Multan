-- Tax: hotel-wide sales tax rate (Pakistan/Punjab default 16% PRA GST on
-- hotel services). Stored as a plain string in the existing key-value
-- `settings` table so the admin can change it live without a redeploy;
-- the number is parsed on read (never trust the client-side edit surface
-- to constrain it). Kept as a single global rate because in practice
-- every room in a Pakistani hotel gets the same PRA rate — per-room
-- variance would be tax-avoidance and get us audited.
INSERT INTO settings (key, value)
VALUES ('hotel_tax_percent', '16')
ON CONFLICT (key) DO NOTHING;

-- Snapshot the tax rate + calculated amount ON THE BOOKING ROW so that if
-- the hotel later changes the tax rate (federal budget change, PRA
-- rounding, whatever), old booking rows still show the correct historical
-- breakdown on receipts, reports, and admin views. The alternative —
-- recomputing on display — silently rewrites past receipts, which is a
-- compliance headache and confuses returning guests looking at their
-- old confirmation email.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tax_amount  NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Existing rows all get tax_percent=0, tax_amount=0 — meaning their
-- grand_total (already computed pre-tax) stays exactly what it was and
-- historical receipts don't retroactively grow by 16%. Only NEW bookings
-- created after this migration start including tax in grand_total.
COMMENT ON COLUMN bookings.tax_percent IS 'Sales tax rate applied at booking time, snapshot for historical accuracy (rate may change over time)';
COMMENT ON COLUMN bookings.tax_amount  IS 'Tax amount in PKR computed at booking time on the post-discount subtotal';
