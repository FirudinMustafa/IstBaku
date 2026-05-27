import { db } from '@/db/client';
import { countries, listings } from '@/db/schema';
import { eq, sql, inArray, isNull, asc } from 'drizzle-orm';
import type { Lang } from '@/lib/types';

export interface CountryOption {
  code: string;
  label: string;
  flag: string;
  enabled: boolean;
}

const NAME_FIELD: Record<Lang, 'nameTr' | 'nameAz' | 'nameEn' | 'nameRu' | 'nameDe' | 'nameZh'> = {
  tr: 'nameTr',
  az: 'nameAz',
  en: 'nameEn',
  ru: 'nameRu',
  de: 'nameDe',
  zh: 'nameZh',
};

/** Aktif (enabled) ülkelerin master listesi. UI dropdownları bundan beslenir. */
export async function getActiveCountries(lang: Lang = 'tr'): Promise<CountryOption[]> {
  try {
    const rows = await db
      .select()
      .from(countries)
      .where(eq(countries.enabled, true))
      .orderBy(asc(countries.sortOrder), asc(countries.code));
    const field = NAME_FIELD[lang];
    return rows.map((r) => ({
      code: r.code,
      label: (r[field] as string) || r.nameTr || r.code,
      flag: r.flagEmoji,
      enabled: r.enabled,
    }));
  } catch (err) {
    console.error('getActiveCountries failed', err);
    // Fallback: en az TR/AZ görünsün — UI çökmesin
    return [
      { code: 'TR', label: 'Türkiye', flag: '🇹🇷', enabled: true },
      { code: 'AZ', label: 'Azerbaycan', flag: '🇦🇿', enabled: true },
    ];
  }
}

/**
 * İlanlarda gerçekten var olan ülkelerin distinct listesi, master ile birleştirilmiş.
 * Filtreler bunu kullanarak "ilan yokken görünen ülke" sorununu önler.
 * İlan eklenince yeni ülke otomatik filtrede çıkar (dinamik).
 */
export async function getCountriesWithListings(lang: Lang = 'tr'): Promise<CountryOption[]> {
  try {
    const distinct = await db
      .selectDistinct({ code: listings.country })
      .from(listings)
      .where(isNull(listings.deletedAt));
    const codes = distinct.map((d) => d.code).filter(Boolean);
    if (codes.length === 0) return getActiveCountries(lang);
    const rows = await db
      .select()
      .from(countries)
      .where(inArray(countries.code, codes))
      .orderBy(asc(countries.sortOrder), asc(countries.code));
    const field = NAME_FIELD[lang];
    return rows.map((r) => ({
      code: r.code,
      label: (r[field] as string) || r.nameTr || r.code,
      flag: r.flagEmoji,
      enabled: r.enabled,
    }));
  } catch (err) {
    console.error('getCountriesWithListings failed', err);
    return getActiveCountries(lang);
  }
}

/** Tek bir ülke kodu için label/flag çek (örn. ListingCard'da). */
export async function getCountryByCode(code: string, lang: Lang = 'tr'): Promise<CountryOption | null> {
  try {
    const [row] = await db.select().from(countries).where(eq(countries.code, code)).limit(1);
    if (!row) return null;
    const field = NAME_FIELD[lang];
    return {
      code: row.code,
      label: (row[field] as string) || row.nameTr || row.code,
      flag: row.flagEmoji,
      enabled: row.enabled,
    };
  } catch {
    return null;
  }
}

void sql;
