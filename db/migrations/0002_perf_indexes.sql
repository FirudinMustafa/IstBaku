-- Performance-only index migration (Fix Agent D)
-- Date: 2026-05-17
-- Covers: MC-20 / MH-24 — composite + FK indexes for hot read paths.
-- All statements are idempotent (`IF NOT EXISTS`).
-- NOTE: If running against a busy production table, swap each `CREATE INDEX`
-- for `CREATE INDEX CONCURRENTLY` and execute statement-by-statement outside
-- a transaction (Drizzle wraps migrations in a transaction by default; for
-- concurrent builds, apply this file manually with `psql -f`).

-- ============================================================
-- MC-20: Composite indexes for listings hot-path filters/sorts.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_listings_type_purpose
  ON listings(type, purpose);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_listings_purpose_country_price
  ON listings(purpose, country, price DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_listings_price_area
  ON listings(price, net_area);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_listings_approval_pending
  ON listings(approval_status)
  WHERE approval_status = 'pending';--> statement-breakpoint

-- ============================================================
-- MH-24: FK indexes that Fix Agent B's migration does not cover.
-- (messages.thread_id has an index already from 0000; we keep these
--  idempotent for clarity / fresh-DB installs.)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON messages(thread_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages(sender_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_favorites_user
  ON favorites(user_id);--> statement-breakpoint
-- Schema uses `scheduled_at` (the audit's `slot` is a logical name).
CREATE INDEX IF NOT EXISTS idx_appointments_agent_slot
  ON appointments(agent_id, scheduled_at);--> statement-breakpoint
