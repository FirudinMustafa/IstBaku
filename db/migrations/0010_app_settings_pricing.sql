-- 0010 — App settings (admin-configurable platform pricing)
-- Elle uygulanır (Neon prod). Drizzle journal stale; bu dosya hand-written.

-- Basit key→integer (USD cent) ayar tablosu. Platform fiyatları admin panelden yönetilir.
CREATE TABLE IF NOT EXISTS "app_settings" (
  "key"        varchar(64) PRIMARY KEY,
  "value_int"  integer     NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Varsayılan fiyatlar (USD cent). Zaten varsa dokunma (idempotent).
INSERT INTO "app_settings" ("key", "value_int") VALUES
  ('price_date_renewal', 1900),   -- Tarih yenileme — $19
  ('price_istbaku_badge', 4900),  -- İstBaku Onaylı rozet — $49
  ('price_private', 9900),        -- Gizli portföy — $99
  ('price_tier_guclu', 900),      -- Tier: Güçlü — $9
  ('price_tier_premium', 2900)    -- Tier: Premium — $29
ON CONFLICT ("key") DO NOTHING;
