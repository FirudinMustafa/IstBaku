'use server';

import { db } from '@/db/client';
import { listings } from '@/db/schema';
import { inArray, isNull } from 'drizzle-orm';

export async function getCategoriesByCountries(countryCodes: string[]): Promise<string[]> {
  if (countryCodes.length === 0) return [];
  try {
    const rows = await db
      .selectDistinct({ type: listings.type })
      .from(listings)
      .where(
        inArray(listings.country, countryCodes),
      );
    return rows.map((r) => r.type).filter(Boolean);
  } catch (err) {
    console.error('getCategoriesByCountries failed', err);
    return [];
  }
}
