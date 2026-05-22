-- ============================================================
-- Remove Plaid-era NOT NULL constraint on unique_amount
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

alter table orders alter column unique_amount drop not null;
