-- 0009 — Cross-border steps (admin-editable) + Office monthly performance metrics
-- Elle uygulanır (Neon prod). Drizzle journal stale; bu dosya hand-written.

-- 1) Sınır ötesi alım adımları — admin panelden yönetilir
CREATE TABLE IF NOT EXISTS "cross_border_steps" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nationality" varchar(8)  NOT NULL,
  "country"     varchar(2)  NOT NULL,
  "purpose"     varchar(16) NOT NULL,
  "language"    "language"  NOT NULL DEFAULT 'tr',
  "order_index" integer     NOT NULL DEFAULT 0,
  "icon"        varchar(48),
  "title"       text        NOT NULL,
  "description" text        NOT NULL,
  "active"      boolean     NOT NULL DEFAULT true,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "updated_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "cross_border_steps_combo_idx"
  ON "cross_border_steps" ("nationality", "country", "purpose", "language", "order_index");

-- 2) Ofis aylık performans metrikleri + rütbe (müşteriye kapalı)
DO $$ BEGIN
  CREATE TYPE "office_tier" AS ENUM ('none', 'premium_office', 'gold_partner');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "agent_monthly_metrics" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id"          uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "year_month"        varchar(7) NOT NULL,
  "active_listings"   integer NOT NULL DEFAULT 0,
  "video_ratio"       real    NOT NULL DEFAULT 0,
  "tour360_ratio"     real    NOT NULL DEFAULT 0,
  "avg_photo_count"   real    NOT NULL DEFAULT 0,
  "avg_review_rating" real    NOT NULL DEFAULT 0,
  "complaint_ratio"   real    NOT NULL DEFAULT 0,
  "avg_response_mins" integer NOT NULL DEFAULT 0,
  "sold_closed_count" integer NOT NULL DEFAULT 0,
  "criteria_met"      jsonb   NOT NULL DEFAULT '[]'::jsonb,
  "tier"              "office_tier" NOT NULL DEFAULT 'none',
  "computed_at"       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_monthly_metrics_agent_month_idx"
  ON "agent_monthly_metrics" ("agent_id", "year_month");
