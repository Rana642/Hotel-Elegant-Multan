-- ============================================================
-- MIGRATION: Advance payment (bank transfer + screenshot)
-- Run once in Supabase SQL Editor. Idempotent.
-- ============================================================
--
-- Interim manual-payment flow until a real payment gateway is integrated.
-- Normal (non-promotional) bookings stay "book now, pay at hotel" as before
-- — advance payment is never required for them. A promotion that carries
-- requires_advance_payment = TRUE now asks the guest to bank-transfer the
-- total and upload a screenshot before submitting, so the hotel isn't
-- holding a discounted room for a no-show — but the stay itself remains
-- 100% refundable / free to cancel, same as any other promotion.

-- ── Promotions: per-promotion advance-payment flag ──────────────────────
ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS requires_advance_payment BOOLEAN NOT NULL DEFAULT TRUE;

-- All three current promotions require advance payment (the hotel's
-- explicit instruction), and all three stay fully refundable — advance
-- payment and refundability are independent settings, not the same switch.
UPDATE promotions
SET requires_advance_payment = TRUE,
    refundable = TRUE,
    free_cancel_days = GREATEST(free_cancel_days, 2),
    updated_at = NOW()
WHERE slug IN ('early-booking', 'last-minute', 'long-stay');

-- ── Bookings: where the uploaded payment-proof screenshot lives ────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS advance_payment_screenshot_url TEXT;

-- ── Settings: the hotel's bank account, shown at checkout when advance
--    payment is required. One shared account for the whole site (not
--    per-promotion) — same key/value pattern as every other hotel-wide
--    setting (hotel_tax_percent, hotel_phone, etc.).
INSERT INTO settings (key, value) VALUES
  ('advance_payment_bank_name',      'Meezan Bank'),
  ('advance_payment_account_title',  'Hotel Elegant Executive Suites'),
  ('advance_payment_iban',           'PK22MEZN0005010113566932'),
  ('advance_payment_account_number', '05010113566932'),
  ('advance_payment_branch_code',    '0501'),
  ('advance_payment_branch_name',    'Nawan Shaher Branch, Multan, Pakistan')
ON CONFLICT (key) DO NOTHING;

-- ── Storage: public bucket for payment-proof screenshots ───────────────
-- Public so the uploaded image's URL works directly in the admin dashboard
-- and the notification email without a signed-URL round trip. Guests are
-- anonymous at this point in the booking flow, so INSERT is open to
-- everyone; only admins can update/remove an uploaded file afterward.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-screenshots', 'payment-screenshots', TRUE, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "payment_screenshots_public_upload" ON storage.objects;
CREATE POLICY "payment_screenshots_public_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots');

DROP POLICY IF EXISTS "payment_screenshots_admin_update" ON storage.objects;
CREATE POLICY "payment_screenshots_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'payment-screenshots' AND is_admin());

DROP POLICY IF EXISTS "payment_screenshots_admin_delete" ON storage.objects;
CREATE POLICY "payment_screenshots_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'payment-screenshots' AND is_admin());
