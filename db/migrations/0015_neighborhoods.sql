-- 0015 — G1: tam il/ilçe/mahalle veri seti için tablo (seed scripts/seed-neighborhoods.ts).
CREATE TABLE IF NOT EXISTS neighborhoods (
  id serial PRIMARY KEY,
  country varchar(8) NOT NULL,
  city text NOT NULL,
  district text NOT NULL,
  name text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS neighborhoods_lookup_idx ON neighborhoods (country, city, district);
