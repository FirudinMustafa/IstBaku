-- 0014 — Üç küçük additive kolon (idempotent, IF NOT EXISTS):
--   Madde 5  : agents.national_id   — ofis şahıs şirketi kimlik no (TC / FIN), VÖEN'den ayrı.
--   Madde 3  : listings.total_units — bina (type='bina') toplam daire / bağımsız bölüm.
--   Madde 20 : listings.watermarked — onayda fotoğraflara kalıcı watermark gömülünce true.
ALTER TABLE agents ADD COLUMN IF NOT EXISTS national_id varchar(32);
--> statement-breakpoint
ALTER TABLE listings ADD COLUMN IF NOT EXISTS total_units integer;
--> statement-breakpoint
ALTER TABLE listings ADD COLUMN IF NOT EXISTS watermarked boolean NOT NULL DEFAULT false;
