/** Public bug avı: tüm sayfalarda konsol hatası + başarısız istek + temel etkileşim. */
import { chromium, devices } from 'playwright';

const BASE = process.env.LIVE_BASE || 'https://ist-baku.vercel.app';
const PAGES = ['/', '/listings', '/property/i-stanbul-cekmekoy-1-1-konut', '/ai-match', '/reports', '/blog', '/hakkimizda', '/contact', '/legal-guide', '/auth/sign-up', '/auth/sign-in', '/auth/forgot-password', '/publisher/apply'];

async function run(label: string, mobile: boolean) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(mobile ? { ...devices['iPhone 12'] } : { viewport: { width: 1366, height: 900 } });
  for (const p of PAGES) {
    const page = await ctx.newPage();
    const errs: string[] = [];
    const bad: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
    page.on('pageerror', (e) => errs.push('PAGEERR: ' + e.message.slice(0, 120)));
    page.on('response', (r) => { const s = r.status(); if (s >= 400 && !r.url().includes('favicon')) bad.push(`${s} ${r.url().replace(BASE, '').slice(0, 70)}`); });
    try {
      await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1800);
    } catch (e) { errs.push('GOTO: ' + (e as Error).message.slice(0, 80)); }
    const uniqErr = [...new Set(errs)];
    const uniqBad = [...new Set(bad)];
    const status = uniqErr.length || uniqBad.length ? '⚠️' : 'ok';
    console.log(`[${label}] ${p}: ${status}`);
    uniqErr.forEach((e) => console.log(`    konsol: ${e}`));
    uniqBad.forEach((b) => console.log(`    istek: ${b}`));
    await page.close();
  }
  await browser.close();
}

async function main() {
  console.log('=== MASAÜSTÜ ===');
  await run('d', false);
  console.log('=== MOBİL ===');
  await run('m', true);
  console.log('Bitti.');
}
main().catch((e) => { console.error(e); process.exit(1); });
