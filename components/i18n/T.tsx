'use client';

import { useLang } from '@/components/layout/LangProvider';

/**
 * Sunucu (server) bileşenleri içinde tek bir UI etiketini kullanıcının diline
 * çevirmek için minik client köprüsü.
 *
 * Neden: dil `localStorage`'da (client) tutulur; server bileşenleri onu okuyamaz.
 * `<T k="..." />` etiket metnini client tarafında çevirir — veri çekimi ve sayfa
 * cache'i server'da kalır, sadece bu metin düğümü hidrasyonda dile uyarlanır.
 *
 * Hidrasyon güvenli: ilk render hem server'da hem client'ta DEFAULT_LANG ('tr')
 * ile aynı; mount sonrası kullanıcı dili devreye girer (LangProvider).
 */
export function T({ k }: { k: string }) {
  const { t } = useLang();
  return <>{t(k)}</>;
}
