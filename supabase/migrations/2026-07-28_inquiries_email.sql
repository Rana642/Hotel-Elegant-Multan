-- ============================================================
-- MIGRATION: Add guest_email to inquiries
-- Run once in Supabase SQL Editor.
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS guest_email TEXT;
