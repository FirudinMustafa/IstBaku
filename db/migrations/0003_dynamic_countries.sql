-- PR3: Dinamik ülke sistemi
-- ============================
-- 1) `countries` master tablosu (UI dropdownları için kaynak)
-- 2) `listings.country` ve `users.country` enum -> varchar(8) (yeni ülkeler için)
-- 3) Eski `country` PG enum tipini drop
--
-- Mevcut TR/AZ verisi text kolona düşer (USING country::text); kayıp yok.
-- Idempotent: tekrar çalıştırma güvenli (IF NOT EXISTS / IF EXISTS).

-- 1) Countries master table
CREATE TABLE IF NOT EXISTS "countries" (
  "code" varchar(8) PRIMARY KEY NOT NULL,
  "name_tr" text NOT NULL,
  "name_az" text NOT NULL,
  "name_en" text NOT NULL,
  "name_ru" text DEFAULT '' NOT NULL,
  "name_de" text DEFAULT '' NOT NULL,
  "name_zh" text DEFAULT '' NOT NULL,
  "flag_emoji" text DEFAULT '' NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Seed core countries (TR + AZ) — idempotent
INSERT INTO "countries" ("code", "name_tr", "name_az", "name_en", "name_ru", "name_de", "name_zh", "flag_emoji", "enabled", "sort_order")
VALUES
  ('TR', 'Türkiye',    'Türkiyə',     'Turkey',     'Турция',         'Türkei',        '土耳其',  '🇹🇷', true, 1),
  ('AZ', 'Azerbaycan', 'Azərbaycan',  'Azerbaijan', 'Азербайджан',    'Aserbaidschan', '阿塞拜疆','🇦🇿', true, 2)
ON CONFLICT (code) DO NOTHING;

-- 2) listings.country: country (enum) -> varchar(8)
ALTER TABLE "listings"
  ALTER COLUMN "country" TYPE varchar(8) USING "country"::text;

-- 3) users.country: country (enum) -> varchar(8)
ALTER TABLE "users"
  ALTER COLUMN "country" TYPE varchar(8) USING "country"::text;

-- 4) Eski enum tipini drop (artık hiçbir kolon referans vermiyor)
DROP TYPE IF EXISTS "public"."country";
