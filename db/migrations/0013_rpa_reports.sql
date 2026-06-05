-- 0013 — RPA rapor talepleri (Madde 7)
-- Elle uygulanır (Neon prod). Additive + idempotent.

-- RPA rapor fiyatı (admin panelden değiştirilebilir; USD cent).
INSERT INTO "app_settings" ("key", "value_int") VALUES ('price_rpa_report', 4900)
ON CONFLICT ("key") DO NOTHING;

-- rpa_report_status enum
DO $$ BEGIN
  CREATE TYPE rpa_report_status AS ENUM ('pending', 'generated', 'sent', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- rpa_reports tablosu
CREATE TABLE IF NOT EXISTS rpa_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
  status          rpa_report_status NOT NULL DEFAULT 'pending',
  payment_id      uuid,
  file_url        text,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz
);
CREATE INDEX IF NOT EXISTS rpa_reports_user_idx   ON rpa_reports(user_id);
CREATE INDEX IF NOT EXISTS rpa_reports_status_idx ON rpa_reports(status);
