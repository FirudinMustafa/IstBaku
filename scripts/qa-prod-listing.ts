import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE = 'https://ist-baku.vercel.app';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const next = () => page.getByTestId('wizard-next').click();
  const ss = (name: string) => page.screenshot({ path: `qa-${name}.png`, fullPage: true });

  console.log('1. Agent girişi...');
  await page.goto(`${BASE}/auth/sign-in`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'a2@istbaku.com');
  await page.fill('input[type="password"]', 'Agent2026!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  console.log('   ✓', page.url());

  console.log('2. /new-listing...');
  await page.goto(`${BASE}/new-listing`, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  await ss('01-wizard');

  // Step 0: Tür
  console.log('3. Tür...');
  await page.locator('button', { hasText: 'Satılık' }).first().click();
  await page.waitForTimeout(300);
  await page.locator('button', { hasText: 'Konut' }).first().click();
  await page.waitForTimeout(300);
  await ss('02-tur');
  await next();
  await page.waitForTimeout(1000);
  await ss('03-konum');

  // Step 1: Konum
  console.log('4. Konum...');
  // Adres doldur
  const addrField = page.locator('input[placeholder*="Cadde"]');
  if (await addrField.count() > 0) {
    await addrField.fill('Test Mahallesi, Deniz Caddesi No:15');
    console.log('   Adres dolduruldu');
  }
  // Harita tıkla
  const map = page.locator('.leaflet-container');
  if (await map.count() > 0) {
    await map.click({ position: { x: 200, y: 150 } });
    await page.waitForTimeout(1000);
    console.log('   Haritada tıklandı');
  }
  await ss('04-konum-pin');
  await next();
  await page.waitForTimeout(1000);
  await ss('05-detay');

  // Step 2: Detay
  console.log('5. Detay...');
  const textareas = page.locator('textarea');
  if (await textareas.count() > 0) {
    await textareas.first().fill('Bu güzel bir test ilanıdır. Deniz manzaralı, merkezi konumda, metro yakınında güzel bir ev.');
  }
  await ss('06-detay-filled');
  await next();
  await page.waitForTimeout(1000);
  await ss('07-medya');

  // Step 3: Medya
  console.log('6. Fotoğraf...');
  const sampleSrc = path.join(process.cwd(), 'tests', 'fixtures', 'sample-listing.jpg');
  if (fs.existsSync(sampleSrc)) {
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles([sampleSrc, sampleSrc, sampleSrc]);
      await page.waitForTimeout(3000);
      console.log('   ✓ Fotoğraflar eklendi');
    }
  } else {
    console.log('   ⚠ sample-listing.jpg bulunamadı');
  }
  await ss('08-medya-photos');
  await next();
  await page.waitForTimeout(500);

  // Steps 4-8: Hızlıca geç — her birinde step indicator kontrol et
  for (let i = 5; i <= 8; i++) {
    const stepLabel = await page.locator('[class*="text-gold"], [class*="font-bold"]').first().textContent().catch(() => '?');
    console.log(`${i+2}. Step ${i} (şu an: ${stepLabel?.trim().substring(0,20)})...`);
    await ss(`09-step${i}`);
    await next().catch(() => console.log('   next() başarısız'));
    await page.waitForTimeout(500);
  }
  await ss('10-son-adim');

  // Son adımda hangi step'teyiz kontrol et
  const pageText = await page.textContent('body') ?? '';
  const hasPublish = pageText.includes('Yayınla');
  console.log('   Yayınla butonu sayfada var mı:', hasPublish);

  // YAYINLA
  console.log('12. YAYINLA...');
  // Sayfadaki tüm butonları göster
  const btns = await page.locator('button').allTextContents();
  console.log('   Butonlar:', btns.filter(t => t.trim()).map(t => t.trim().substring(0, 30)));

  const pubBtn = page.locator('button:has-text("Yayınla")').first();
  const isDisabled = await pubBtn.getAttribute('disabled');
  console.log('   Yayınla disabled?', isDisabled !== null);

  if (isDisabled === null) {
    await pubBtn.click();
    console.log('   Tıklandı, bekleniyor...');

    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(2000);
      const url = page.url();
      if (url.includes('/property/')) {
        console.log('   ✓ BAŞARILI:', url);
        break;
      }
      if (i === 29) console.log('   ⚠ 60s timeout');
    }
  }

  await ss('11-final');
  await browser.close();
  console.log('\n✓ Test bitti.');
}

main().catch(e => { console.error('HATA:', e.message); process.exit(1); });
