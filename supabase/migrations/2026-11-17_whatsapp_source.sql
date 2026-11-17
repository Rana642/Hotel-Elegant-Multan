-- Bookings made by the WhatsApp booking bot are recorded with source = 'whatsapp'.
-- Run once in the Supabase SQL Editor. Safe to run again.
-- (Until this is run, the bot's bookings are saved as 'phone' so none is lost.)
ALTER TYPE booking_source ADD VALUE IF NOT EXISTS 'whatsapp';
