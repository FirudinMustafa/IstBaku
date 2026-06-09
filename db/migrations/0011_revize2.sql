-- 0011_revize2.sql — Sahip revize turu 2 (Madde 7, 8c)
-- Neon (prod) üzerinde ELLE uygulanır. Enum ADD VALUE statement'ları transaction
-- dışında çalışmalı; aşağıdaki bloklar ayrı ayrı çalıştırılabilir.

-- Madde 8c: konut tipine "Giriş Kat" eklendi.
ALTER TYPE "public"."housing_type" ADD VALUE IF NOT EXISTS 'giris_kat';

-- Madde 7: randevu durum akışı (ofis onay/red + alternatif saat).
ALTER TYPE "public"."appointment_status" ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE "public"."appointment_status" ADD VALUE IF NOT EXISTS 'rescheduled';

-- Madde 7: ofisin önerdiği alternatif saat + yeni randevular 'pending' başlar.
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "proposed_at" timestamptz;
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'pending';

-- Madde 7: slot kilidi sadece AKTİF randevuları kapsasın (reddedilen/iptal slotlar
-- yeniden açılabilsin). Eski tam unique index'i kısmi unique ile değiştir.
DROP INDEX IF EXISTS "appointments_agent_slot_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_agent_slot_idx"
  ON "appointments" ("agent_id", "scheduled_at")
  WHERE status IN ('pending','confirmed','rescheduled');
