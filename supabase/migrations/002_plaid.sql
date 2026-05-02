-- ============================================================
-- Migration 002: Plaid Payment Integration
-- Run in Supabase SQL Editor AFTER 001_initial.sql
-- ============================================================

-- Drop unused columns from orders
ALTER TABLE orders DROP COLUMN IF EXISTS payment_screenshot_url;
ALTER TABLE orders DROP COLUMN IF EXISTS unique_amount;

-- Add Plaid matching columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_code         text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS plaid_transaction_id text;

-- Index for fast order_code lookups (webhook matching)
CREATE INDEX IF NOT EXISTS orders_order_code_idx ON orders(order_code);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status, created_at);

-- ─────────────────────────────────────────────
-- PLAID CONFIG  (stores bank connection credentials)
-- Only accessible via service role key — no user-facing policies
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plaid_config (
  id           uuid primary key default gen_random_uuid(),
  access_token text not null,
  item_id      text not null unique,
  institution  text,
  account_id   text,
  account_name text,
  created_at   timestamptz default now()
);

ALTER TABLE plaid_config ENABLE ROW LEVEL SECURITY;
-- No RLS policies: only service_role key can access this table
