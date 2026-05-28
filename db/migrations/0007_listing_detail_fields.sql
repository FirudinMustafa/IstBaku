-- 0007: İlan detay alanları genişletmesi
-- Yeni enum tipleri, günlük kira için 3. purpose değeri ve ek listing kolonları.

-- Yeni purpose: günlük kiralık
ALTER TYPE purpose ADD VALUE IF NOT EXISTS 'daily_rent';

-- Enerji kimlik belgesi sınıfı
DO $$ BEGIN
  CREATE TYPE energy_class AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'muaf', 'belirsiz');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Konut tipi (dubleks, tribleks, vb.)
DO $$ BEGIN
  CREATE TYPE housing_type AS ENUM (
    'belirtilmemis', 'dubleks', 'tribleks', 'en_ust_kat', 'ara_kat', 'ara_kat_dubleks',
    'bahce_dubleksi', 'cati_dubleksi', 'forleks', 'ters_dubleks'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Cephe / yön
DO $$ BEGIN
  CREATE TYPE facade AS ENUM (
    'belirtilmemis', 'kuzey', 'guney', 'dogu', 'bati',
    'kuzeydogu', 'kuzeybati', 'guneydogu', 'guneybati'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Yapının durumu
DO $$ BEGIN
  CREATE TYPE building_status AS ENUM ('belirtilmemis', 'sifir', 'ikinci_el', 'yapim_asamasinda');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Yapı tipi
DO $$ BEGIN
  CREATE TYPE structure_type AS ENUM ('belirtilmemis', 'betonarme', 'celik', 'ahsap', 'yigma', 'prefabrik');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Yeni listing kolonları
ALTER TABLE listings ADD COLUMN IF NOT EXISTS housing_type housing_type NOT NULL DEFAULT 'belirtilmemis';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS facade facade NOT NULL DEFAULT 'belirtilmemis';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS building_status building_status NOT NULL DEFAULT 'belirtilmemis';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS structure_type structure_type NOT NULL DEFAULT 'belirtilmemis';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS energy_class energy_class NOT NULL DEFAULT 'belirsiz';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS permit_no varchar(64);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS parcel_no varchar(64);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS site_name varchar(120);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS dues integer;
