'use client';

import { useLang } from '@/components/layout/LangProvider';

/**
 * Enum değerini (örn. purpose='sale', parking='kapali') kullanıcının diline çevirir.
 * `<E g="purpose" v={value} />` → t(`enums.purpose.${value}`).
 *
 * <T> ile aynı mantık: server bileşenlerinde enum etiketlerini client tarafında
 * çevirir, cache'i bozmaz, hidrasyon güvenlidir. Anahtar yoksa ham değeri gösterir.
 */
export function E({ g, v }: { g: string; v: string | null | undefined }) {
  const { t } = useLang();
  if (!v) return null;
  const key = `enums.${g}.${v}`;
  const out = t(key);
  // Anahtar bulunamazsa t() anahtarın kendisini döndürür → ham değere düş.
  return <>{out === key ? v : out}</>;
}
