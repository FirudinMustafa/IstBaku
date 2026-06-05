-- 0011 — Public ilan numarası + Zemin etüdü + Arsa (type='arsa') alanları
-- Elle uygulanır (Neon prod). Drizzle journal stale; bu dosya hand-written.
-- Additive: mevcut satırları bozmaz.

-- ============================================================
-- 1) PUBLIC İLAN NUMARASI (bina.az item id benzeri)
--    Otomatik artan; mevcut ilanlara kronolojik sıra (created_at) ile atanır.
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS listings_listing_number_seq;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_number integer;

-- Mevcut ilanlara 1..N numara ver (en eski = 1).
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM listings
  WHERE listing_number IS NULL
)
UPDATE listings l
SET listing_number = o.rn
FROM ordered o
WHERE l.id = o.id;

-- Sequence'i en yüksek numaranın üstüne kur (sıradaki = MAX+1).
SELECT setval('listings_listing_number_seq', (SELECT COALESCE(MAX(listing_number), 0) FROM listings));

-- Default nextval + NOT NULL + UNIQUE + sequence ownership.
ALTER TABLE listings ALTER COLUMN listing_number SET DEFAULT nextval('listings_listing_number_seq');
ALTER TABLE listings ALTER COLUMN listing_number SET NOT NULL;
ALTER SEQUENCE listings_listing_number_seq OWNED BY listings.listing_number;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_listing_number_unique'
  ) THEN
    ALTER TABLE listings ADD CONSTRAINT listings_listing_number_unique UNIQUE (listing_number);
  END IF;
END $$;

-- ============================================================
-- 2) ZEMİN ETÜDÜ (var/yok)
-- ============================================================
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ground_survey boolean NOT NULL DEFAULT false;

-- ============================================================
-- 3) ARSA ALANLARI (type='arsa' için)
-- ============================================================
ALTER TABLE listings ADD COLUMN IF NOT EXISTS imar_durumu varchar(64);  -- İmar durumu
ALTER TABLE listings ADD COLUMN IF NOT EXISTS pafta_no   varchar(64);  -- Pafta no
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ada_no     varchar(64);  -- Ada no
ALTER TABLE listings ADD COLUMN IF NOT EXISTS kaks       real;         -- KAKS / Emsal
ALTER TABLE listings ADD COLUMN IF NOT EXISTS gabari     varchar(32);  -- Gabari (yükseklik)
