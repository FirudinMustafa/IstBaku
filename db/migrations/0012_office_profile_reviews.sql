-- 0012 — Ofis public profili + gerçek yorum/puan sistemi (Madde 5/6/12/13)
-- Elle uygulanır (Neon prod). Additive + idempotent.

-- review_status enum
DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- agents: ofis public profili + kayıt/KYC alanları
ALTER TABLE agents ADD COLUMN IF NOT EXISTS about            text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS photos           jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS office_country   varchar(8);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tax_id           varchar(64);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS company_name     text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS authorization_no varchar(64);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS office_address   text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS office_city      varchar(64);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS office_district  varchar(64);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS office_docs      jsonb NOT NULL DEFAULT '[]'::jsonb;

-- reviews tablosu (gerçek yorum/puan — mock değil)
CREATE TABLE IF NOT EXISTS reviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating         integer NOT NULL,
  text           text NOT NULL DEFAULT '',
  status         review_status NOT NULL DEFAULT 'pending',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX        IF NOT EXISTS reviews_agent_idx         ON reviews(agent_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS reviews_author_agent_uniq ON reviews(agent_user_id, author_user_id);
