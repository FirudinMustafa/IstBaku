/**
 * Public ilan numarası yardımcıları.
 *
 * İlanların `listingNumber` alanı otomatik artan bir tamsayıdır. Kullanıcıya
 * her zaman sıfır-dolgulu (#00012) gösterilir; URL ve arama bununla yapılır.
 */

/** 12 → "00012" (en az 5 hane). */
export function formatListingNumber(n: number): string {
  return String(n).padStart(5, '0');
}

/**
 * Bir URL segmenti / arama girdisi sadece rakamlardan oluşuyorsa ilan numarasına
 * çevirir; aksi halde null (o zaman slug olarak değerlendirilir). Baştaki sıfırlar
 * ("00012") ve "#" ön eki tolere edilir.
 */
export function parseListingNumber(raw: string): number | null {
  const s = raw.trim().replace(/^#/, '');
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
