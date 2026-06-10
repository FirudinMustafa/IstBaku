/**
 * Canlı site salt-okunur görsel/işlevsel doğrulama (Playwright, veri OLUŞTURMAZ).
 * Çalıştır: npx tsx scripts/live-check.ts
 */
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.LIVE_BASE || 'https://ist-baku.vercel.app';
const OUT = path.join(process.cwd(), 'e2e-out', 'live-check');
fs.mkdirSync(OUT, { recursive: true });

const log = (...a: unknown[]) => console.log(...a);
async function shot(page: import('playwright').Page, name: string) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  log(`  📸 ${name}.png`);
}

async function setLang(ctx: import('playwright').BrowserContext, lang: string) {
  await ctx.addCookies([{ name: 'istbaku-lang', value: lang, url: BASE }]);
}

async function main() {
  const browser = await chromium.launch();
  log('BASE:', BASE);

  // 1) Ana sayfa (arka plan / bölüm sırası) — desktop
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
    await shot(page, 'home-desktop');
    await ctx.close();
  }

  // 2) RU ve DE header (C2 — iç içe girme)
  for (const lang of ['ru', 'de']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await setLang(ctx, lang);
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, `header-${lang}`);
    await ctx.close();
  }

  // 3) Sign-up → Ofis rolü → ülke + belge alanları (M5/E2)
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/auth/sign-up`, { waitUntil: 'networkidle', timeout: 60000 });
    const officeBtn = page.locator('[data-testid="role-office"]');
    if (await officeBtn.count()) {
      await officeBtn.click();
      await page.waitForTimeout(400);
      const hasCountry = await page.locator('#office-country').count();
      const hasCompany = await page.locator('#office-company').count();
      const hasNationalId = await page.locator('#office-national-id').count();
      const hasDocsBtn = await page.getByText(/Belge ekle|Sənəd/i).count();
      log(`  [signup ofis] country=${hasCountry} company=${hasCompany} nationalId=${hasNationalId} belgeEkle=${hasDocsBtn}`);
    } else {
      log('  [signup ofis] role-office butonu bulunamadı');
    }
    await shot(page, 'signup-office');
    await ctx.close();
  }

  // 4) Bir ilan sayfası (ilan no, geri buton, watermark, rozet)
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/property/00001`, { waitUntil: 'networkidle', timeout: 60000 });
    const back = await page.getByRole('button', { name: /geri|back|zurück|назад/i }).count();
    const num = await page.getByText(/#0*1\b/).count();
    log(`  [property] geriButon=${back} ilanNo=${num}`);
    await shot(page, 'property-00001');
    await ctx.close();
  }

  // 5) Listings filtreler (mahalle, eşyalı/site, konut tipi)
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/listings`, { waitUntil: 'networkidle', timeout: 60000 });
    await shot(page, 'listings');
    await ctx.close();
  }

  // 6) ISTBAKU AI chatbot — harf yazınca fokus kayıyor mu (I4)
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
    // FAB'ı bul ve aç
    const fab = page.locator('button').filter({ hasText: /ISTBAKU AI|AI|asistan|chat/i }).first();
    try {
      const fabBtns = page.locator('button[aria-label*="AI" i], button[aria-label*="asistan" i], button[aria-label*="chat" i]');
      if (await fabBtns.count()) await fabBtns.first().click();
      else if (await fab.count()) await fab.click();
      await page.waitForTimeout(500);
      const input = page.locator('input[type="text"], textarea').last();
      if (await input.count()) {
        await input.click();
        await page.keyboard.type('merhaba', { delay: 120 });
        await page.waitForTimeout(200);
        const val = await input.inputValue().catch(() => '');
        const focused = await page.evaluate(() => document.activeElement?.tagName);
        log(`  [chatbot] yazılan="${val}" aktifEleman=${focused}`);
      } else {
        log('  [chatbot] input bulunamadı (FAB açılmadı?)');
      }
      await shot(page, 'chatbot');
    } catch (e) {
      log('  [chatbot] hata:', (e as Error).message);
    }
    await ctx.close();
  }

  await browser.close();
  log('Bitti. Görüntüler:', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
