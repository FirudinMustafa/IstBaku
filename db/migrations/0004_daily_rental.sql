-- PR5: Günlük kira sistemi
-- ============================
-- 1) listings tablosuna daily rental alanları
-- 2) yeni daily_booking_status enum
-- 3) daily_bookings tablosu
-- 4) notification_type enum'una 'daily_booking' değeri
-- Idempotent.

-- 1) listings alanları
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "daily_rental_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "daily_rental_price_per_night" integer;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "daily_rental_currency" "currency";
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "daily_rental_min_nights" integer DEFAULT 1 NOT NULL;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "daily_rental_notes" text;

-- 2) daily_booking_status enum
DO $$ BEGIN
  CREATE TYPE "public"."daily_booking_status" AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3) daily_bookings tablosu
CREATE TABLE IF NOT EXISTS "daily_bookings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "guest_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "guest_name" text NOT NULL,
  "guest_email" text NOT NULL,
  "guest_phone" text,
  "check_in" timestamp with time zone NOT NULL,
  "check_out" timestamp with time zone NOT NULL,
  "nights" integer NOT NULL,
  "total_price" integer NOT NULL,
  "currency" "currency" DEFAULT 'USD' NOT NULL,
  "guest_count" integer DEFAULT 1 NOT NULL,
  "status" "daily_booking_status" DEFAULT 'pending' NOT NULL,
  "notes" text,
  "owner_response_note" text,
  "responded_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "daily_bookings_listing_date_idx"
  ON "daily_bookings" ("listing_id", "check_in", "check_out");
CREATE INDEX IF NOT EXISTS "daily_bookings_owner_idx"
  ON "daily_bookings" ("owner_id");
CREATE INDEX IF NOT EXISTS "daily_bookings_status_idx"
  ON "daily_bookings" ("status");

-- 4) notification_type enum'una 'daily_booking' değeri ekle (idempotent)
DO $$ BEGIN
  ALTER TYPE "public"."notification_type" ADD VALUE 'daily_booking';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
