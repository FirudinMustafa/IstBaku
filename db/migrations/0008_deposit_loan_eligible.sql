-- 0008: Depozito (kiralık) ve krediye uygunluk (satılık) alanları.
-- Additive — nullable / default'lu kolonlar, mevcut satırları etkilemez.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS deposit integer;                         -- Depozito (kiralıkta)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS loan_eligible boolean NOT NULL DEFAULT false;  -- Krediye uygun (satılıkta)
