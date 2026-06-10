/** H1/H2 görsel regresyon: homepage blob + listings harita. npx tsx scripts/live-verify-h.ts */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
const BASE = process.env.LIVE_BASE || 'https://ist-baku.vercel.app';
const OUT = path.join(process.cwd(), 'e2e-out', 'live-h');
fs.mkdirSync(OUT, { recursive: true });
async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'home-scrolled.png') });
  await page.goto(`${BASE}/listings`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  const markers = await page.locator('.leaflet-price-pin').count().catch(() => -1);
  await page.screenshot({ path: path.join(OUT, 'listings-map.png') });
  console.log(`[H2] harita marker sayısı=${markers}`);
  await browser.close();
  console.log('Çıktı:', OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
