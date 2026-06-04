'use client';

import { useLang } from '@/components/layout/LangProvider';
import { formatFloor } from '@/lib/labels';

/**
 * Kat numarasını kullanıcının diline göre biçimlendirir (örn. "3. Kat" / "Floor 3").
 * <T>/<E> ile aynı client-köprü mantığı: server bileşeninden gelen sayı, client
 * tarafında dile uyarlanır.
 */
export function FloorText({ n }: { n: number }) {
  const { lang } = useLang();
  return <>{formatFloor(n, lang)}</>;
}

/**
 * Isıtma tipini (kombi/merkezi/yerden/yok) `heat.*` anahtarlarıyla çevirir.
 * Anahtar yoksa ham değere düşer (eski/serbest metin verileri için).
 */
export function HeatingText({ v }: { v: string | null | undefined }) {
  const { t } = useLang();
  if (!v) return null;
  const key = `heat.${v}`;
  const out = t(key);
  return <>{out === key ? v : out}</>;
}
