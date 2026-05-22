-- ============================================================
-- Add zelle_name to profiles for manual payment verification
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

alter table profiles add column if not exists zelle_name text;
