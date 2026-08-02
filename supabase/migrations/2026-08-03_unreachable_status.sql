-- Add an 'unreachable' booking status for the gap between "pending" and a
-- real decision: guest submitted a booking but doesn't respond to the
-- confirmation call/WhatsApp, and the phone number given may be a genuine
-- typo rather than a fake one. Run once in Supabase SQL Editor.
--
-- Deliberately NOT a dead end like 'cancelled' or 'no_show':
--   - Confirming it later moves it to 'confirmed' as normal.
--   - If the guest just shows up in person despite being uncontactable by
--     phone, staff can move it straight to 'checked_in' — no need to fake
--     a "confirmation" that never happened.
--   - If staff give up after enough attempts, they cancel it manually,
--     which frees the blocked dates the same way any other cancellation does.
--
-- Does NOT auto-release availability_blocks (same reasoning as no_show —
-- the guest might still turn up or reconnect; staff can free the dates
-- manually from the calendar if they decide to give up on it).
--
-- NOT excluded from revenue/check-in counts anywhere — treated the same as
-- 'pending' (an open, unresolved booking), not the same as cancelled/no_show
-- (a resolved negative outcome).
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'unreachable';

-- Optional free-text note staff can attach when marking a booking
-- unreachable — e.g. "tried calling twice, phone off" — so the next person
-- to look at it knows what's already been tried.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status_note TEXT;
