-- Tur6 — büyük özellikler için additive şema değişiklikleri (Neon'a elle uygulanır)
-- Hepsi geri-uyumlu: yeni tablo + nullable kolonlar + default'lu kolon.

-- 4b: Favori koleksiyonları (sahibinden tarzı sekme/klasör)
CREATE TABLE IF NOT EXISTS favorite_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fav_collections_user ON favorite_collections(user_id);

ALTER TABLE favorites
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES favorite_collections(id) ON DELETE SET NULL;

-- 4c: Gizli portföy erişimi (none | requested | approved | rejected)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS private_access varchar(16) NOT NULL DEFAULT 'none';

-- 4d: Ofis kapak fotoğrafı
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS cover_photo text;
