/** D1 — genel UI yatay-taşma denetimi (mobil + masaüstü). npx tsx scripts/live-ui-audit.ts */
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
const BASE = process.env.LIVE_BASE || 'https://ist-baku.vercel.app';
const OUT = path.join(process.cwd(), 'e2e-out', 'ui-audit');
fs.mkdirSync(OUT, { recursive: true });

const PAGES = ['/', '/listings', '/property/00001', '/ai-match', '/reports', '/blog', '/hakkimizda', '/contact', '/legal-guide', '/auth/sign-up', '/auth/sign-in'];

async function audit(viewport: { width: number; height: number }, label: string, isMobile: boolean) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(isMobile ? { ...devices['iPhone 12'] } : { viewport });
  const page = await ctx.newPage();
  for (const p of PAGES) {
    try {
      await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(400);
      const o = await page.evaluate(() => {
        const de = document.documentElement;
        const overflow = de.scrollWidth - window.innerWidth;
        // taşan en geniş elemanı bul
        let worst = ''; let worstW = 0;
        document.querySelectorAll('body *').forEach((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          if (r.right > window.innerWidth + 2 && r.width > worstW && r.width < 4000) {
            worstW = r.width; worst = (el.tagName + '.' + (el.className || '').toString().slice(0, 40));
          }
        });
        return { overflow, worst };
      });
      const flag = o.overflow > 2 ? `⚠️ TAŞMA ${o.overflow}px [${o.worst}]` : 'ok';
      console.log(`[${label}] ${p}: ${flag}`);
      if (o.overflow > 2) await page.screenshot({ path: path.join(OUT, `${label}${p.replace(/\//g, '_')}.png`) });
    } catch (e) {
      console.log(`[${label}] ${p}: HATA ${(e as Error).message.slice(0, 60)}`);
    }
  }
  await browser.close();
}

async function main() {
  await audit({ width: 390, height: 844 }, 'mobil', true);
  await audit({ width: 1280, height: 900 }, 'masaüstü', false);
  console.log('Çıktı:', OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
