/** K1 PDF indirme + I1 geri-buton canlı doğrulama. npx tsx scripts/live-verify-k1.ts */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
const BASE = process.env.LIVE_BASE || 'https://ist-baku.vercel.app';
const OUT = path.join(process.cwd(), 'e2e-out', 'live-k1');
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();

  // K1: /reports → PDF indir → download tetikleniyor mu
  await page.goto(`${BASE}/reports`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  try {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.getByRole('button', { name: /PDF/i }).first().click(),
    ]);
    const fn = download.suggestedFilename();
    const p = path.join(OUT, fn);
    await download.saveAs(p);
    const sz = fs.statSync(p).size;
    console.log(`[K1] PDF indirildi: ${fn} (${sz} bayt) ${sz > 1000 ? '✅' : '⚠️ küçük'}`);
  } catch (e) {
    console.log(`[K1] ❌ PDF indirilemedi: ${(e as Error).message}`);
    await page.screenshot({ path: path.join(OUT, 'reports-fail.png') });
  }

  // I1: /hakkimizda geri-buton ile başlık arası bindirme yok mu
  await page.goto(`${BASE}/hakkimizda`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'hakkimizda-back.png') });
  console.log('[I1] hakkimizda screenshot alındı');

  await browser.close();
  console.log('Çıktı:', OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
