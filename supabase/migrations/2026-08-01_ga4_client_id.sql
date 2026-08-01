-- Store the guest's GA4 client_id (from the first-party `_ga` cookie,
-- captured at first-touch alongside utm_source/gclid/fbclid) on the booking
-- row. Needed so the server-side GA4 Measurement Protocol call fired when a
-- booking is marked Completed (see app/actions/ga4.ts) can be attributed
-- back to the SAME GA4 user/session that originally clicked the ad, instead
-- of arriving as an unattributed event. Run once in Supabase SQL Editor.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ga_client_id TEXT;
