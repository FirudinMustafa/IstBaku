/** J3 rozet + D7 foto sayısı + I3 scroll canlı doğrulama. npx tsx scripts/live-verify-batch.ts */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
const BASE = process.env.LIVE_BASE || 'https://ist-baku.vercel.app';
const OUT = path.join(process.cwd(), 'e2e-out', 'live-batch');
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();

  // J3: listings — onaylı/premium kartlarda rozet
  await page.goto(`${BASE}/listings`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'listings-badges.png') });

  // D7: kullanıcının 3-foto ilanı — galeride kaç görsel + sahte placeholder var mı
  await page.goto(`${BASE}/property/i-stanbul-cekmekoy-1-1-konut`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(600);
  const imgCount = await page.locator('main img').count().catch(() => -1);
  await page.screenshot({ path: path.join(OUT, 'cekmekoy-gallery.png') });
  console.log(`[D7 cekmekoy] main img sayısı=${imgCount}`);

  // J3 property — rozet
  await page.goto(`${BASE}/property/00001`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'property-badge.png') });

  // I3: /listings'te aşağı in, "İlanlar" nav'a tekrar bas → başa kayar mı
  await page.goto(`${BASE}/listings`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.scrollY);
  const nav = page.getByRole('link', { name: /^İlanlar$|^Объявления$|^Anzeigen$|^Listings$/ }).first();
  await nav.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => window.scrollY);
  console.log(`[I3 scroll] önce=${before} sonra=${after} (sonra ~0 beklenir)`);

  await browser.close();
  console.log('Görüntüler:', OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
