import { cookies } from 'next/headers';
import { SUPPORTED_LANGS, DEFAULT_LANG, t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

/**
 * Resolve the active UI language for server-rendered metadata by reading the
 * `istbaku-lang` cookie (set by middleware / LangProvider). Falls back to the
 * default language when the cookie is missing or invalid.
 */
export async function getMetadataLang(): Promise<Lang> {
  const cookieLang = (await cookies()).get('istbaku-lang')?.value;
  return (SUPPORTED_LANGS as readonly string[]).includes(cookieLang ?? '')
    ? (cookieLang as Lang)
    : DEFAULT_LANG;
}

/**
 * Build a localized `{ title, description }` metadata pair from i18n keys based
 * on the request's language cookie.
 */
export async function localizedMetadata(titleKey: string, descKey: string) {
  const lang = await getMetadataLang();
  return { title: t(titleKey, lang), description: t(descKey, lang) };
}
