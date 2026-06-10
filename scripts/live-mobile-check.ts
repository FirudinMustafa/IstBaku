/** Mobil (390px) ofis kayıt + property taşma kontrolü. npx tsx scripts/live-mobile-check.ts */
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
const BASE = process.env.LIVE_BASE || 'https://ist-baku.vercel.app';
const OUT = path.join(process.cwd(), 'e2e-out', 'live-mobile');
fs.mkdirSync(OUT, { recursive: true });

async function hasHOverflow(page: import('playwright').Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 12'] });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/auth/sign-up`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('[data-testid="role-office"]').click().catch(() => {});
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 9999));
  await page.waitForTimeout(200);
  console.log('[signup-office mobil] yatay taşma=', await hasHOverflow(page));
  await page.screenshot({ path: path.join(OUT, 'signup-office-mobile.png'), fullPage: true });

  await page.goto(`${BASE}/property/00001`, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('[property mobil] yatay taşma=', await hasHOverflow(page));
  await page.screenshot({ path: path.join(OUT, 'property-mobile.png') });

  await browser.close();
  console.log('Görüntüler:', OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
