-- Audit fix migration (Fix Agent B)
-- Date: 2026-05-17
-- Covers: MC-09/MC-15 (appointments unique constraint), MC-17 (notification_type enum drift),
--         MC-18 (FK SET NULL on message_threads.listing_id), MC-30 (soft-delete columns),
--         MH-24 (FK indexes).
-- Idempotent where possible.

-- ============================================================
-- MC-17: notification_type enum drift
-- Add the missing values: 'approval', 'kyc', 'payment'.
-- (Postgres < 12 needs them outside a transaction; modern Postgres handles it.)
-- ============================================================
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'approval';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'kyc';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'payment';--> statement-breakpoint

-- ============================================================
-- MC-30: Soft-delete columns on listings and users.
-- ============================================================
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "listings"
  DROP CONSTRAINT IF EXISTS "listings_deleted_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "listings"
  ADD CONSTRAINT "listings_deleted_by_users_id_fk"
  FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "listings_deleted_at_idx" ON "listings" ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users" ("deleted_at");--> statement-breakpoint

-- ============================================================
-- MC-18: message_threads.listing_id should SET NULL, not CASCADE.
-- Preserves conversation history when the parent listing is deleted.
-- ============================================================
ALTER TABLE "message_threads"
  DROP CONSTRAINT IF EXISTS "message_threads_listing_id_listings_id_fk";--> statement-breakpoint
ALTER TABLE "message_threads"
  ADD CONSTRAINT "message_threads_listing_id_listings_id_fk"
  FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

-- ============================================================
-- MC-09 / MC-15: appointments unique slot index is already present
-- (appointments_agent_slot_idx). Re-assert it for safety.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_agent_slot_idx"
  ON "appointments" ("agent_id", "scheduled_at");--> statement-breakpoint

-- ============================================================
-- MH-24: indexes for FK columns and message-thread uniqueness.
-- ============================================================
CREATE INDEX IF NOT EXISTS "message_threads_participants_idx"
  ON "message_threads" ("participant_a", "participant_b");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "message_threads_pair_listing_idx"
  ON "message_threads" ("participant_a", "participant_b", "listing_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "favorites_listing_idx"
  ON "favorites" ("listing_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_requests_status_idx"
  ON "approval_requests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_requests_listing_idx"
  ON "approval_requests" ("listing_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kyc_requests_status_idx"
  ON "kyc_requests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "abuse_reports_status_idx"
  ON "abuse_reports" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_idx"
  ON "payments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_unread_idx"
  ON "messages" ("thread_id", "read_at");--> statement-breakpoint

-- ============================================================
-- HIGH-005: approval_level CHECK constraint.
-- ============================================================
ALTER TABLE "listings"
  DROP CONSTRAINT IF EXISTS "listings_approval_level_check";--> statement-breakpoint
ALTER TABLE "listings"
  ADD CONSTRAINT "listings_approval_level_check"
  CHECK ("approval_level" BETWEEN 0 AND 3);--> statement-breakpoint

-- ============================================================
-- MEDIUM-005: favorites_count and views cannot go negative.
-- ============================================================
ALTER TABLE "listings"
  DROP CONSTRAINT IF EXISTS "listings_favorites_count_nonneg";--> statement-breakpoint
ALTER TABLE "listings"
  ADD CONSTRAINT "listings_favorites_count_nonneg"
  CHECK ("favorites_count" >= 0);--> statement-breakpoint
ALTER TABLE "listings"
  DROP CONSTRAINT IF EXISTS "listings_views_nonneg";--> statement-breakpoint
ALTER TABLE "listings"
  ADD CONSTRAINT "listings_views_nonneg"
  CHECK ("views" >= 0);--> statement-breakpoint
