/** C2 (header 1100px RU/DE) + I4 (chatbot fokus) canlı doğrulama. npx tsx scripts/live-verify-fixes.ts */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.LIVE_BASE || 'https://ist-baku.vercel.app';
const OUT = path.join(process.cwd(), 'e2e-out', 'live-verify');
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch();

  // C2: header 1100px (taşma genişliği) RU + DE → hamburger görünmeli, nav gizli
  for (const lang of ['ru', 'de']) {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
    await ctx.addCookies([{ name: 'istbaku-lang', value: lang, url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
    const hamburger = await page.locator('button[aria-controls="mobile-drawer"]').isVisible().catch(() => false);
    await page.screenshot({ path: path.join(OUT, `header-1100-${lang}.png`) });
    console.log(`[C2 ${lang}@1100] hamburger görünür=${hamburger} (true beklenir)`);
    await ctx.close();
  }

  // I4: chatbot — yaz, fokus korunuyor mu
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
    // FAB: desktop'ta "Asistan" metinli buton
    const fab = page.getByRole('button', { name: /asistan|assistant|помощник|ассистент|assistent|助手|开启/i }).first();
    await fab.click({ timeout: 10000 }).catch(async () => {
      // fallback: sağ-alt FAB
      await page.locator('button.fixed').last().click().catch(() => {});
    });
    await page.waitForTimeout(600);
    const input = page.getByPlaceholder(/.*/).last();
    const composer = page.locator('form input[maxlength="2000"], input[maxlength="2000"]').first();
    const target = (await composer.count()) ? composer : input;
    await target.click();
    await page.keyboard.type('merhaba dunya', { delay: 90 });
    await page.waitForTimeout(150);
    const val = await target.inputValue().catch(() => '');
    const stillFocused = await target.evaluate((el) => el === document.activeElement).catch(() => false);
    await page.screenshot({ path: path.join(OUT, 'chatbot-typed.png') });
    console.log(`[I4 chatbot] yazılan="${val}" fokusKorundu=${stillFocused} (val tam + true beklenir)`);
    await ctx.close();
  }

  await browser.close();
  console.log('Görüntüler:', OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
