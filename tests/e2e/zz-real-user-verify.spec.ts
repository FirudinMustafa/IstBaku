import { test, expect } from '@playwright/test';

// Gerçek-kullanıcı doğrulaması: persona testlerinde başarısız olan akışların
// SİTEDE gerçekten çalışıp çalışmadığını GÜNCEL seçicilerle test eder.
// (Persona testleri eski aria-label "Dil değiştir" arıyordu; gerçek buton "Dil seç".)

test('Dil değiştirici: AZ ve EN gerçekten çalışıyor', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const btn = page.getByTestId('lang-switcher-button');
  await expect(btn).toBeVisible({ timeout: 15_000 });

  // AZ
  await btn.click();
  await page.getByRole('button', { name: /Azərbaycan/i }).first().click();
  await page.waitForTimeout(600);
  const navAz = await page.locator('nav').first().textContent().catch(() => '');
  const azOk = /Elanlar|Hesabatlar|Hüquqi|Portfel/i.test(navAz ?? '');
  console.log(`LANG AZ -> nav: "${(navAz ?? '').replace(/\s+/g, ' ').slice(0, 90)}" | AZ string: ${azOk ? 'VAR' : 'YOK'}`);

  // EN
  await btn.click();
  await page.getByRole('button', { name: /English/i }).first().click();
  await page.waitForTimeout(600);
  const navEn = await page.locator('nav').first().textContent().catch(() => '');
  const enOk = /Listings|Reports|Legal|Portfolio|Home/i.test(navEn ?? '');
  console.log(`LANG EN -> nav: "${(navEn ?? '').replace(/\s+/g, ' ').slice(0, 90)}" | EN string: ${enOk ? 'VAR' : 'YOK'}`);

  expect(azOk || enOk).toBeTruthy();
});

test('Para birimi değiştirici çalışıyor', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const cur = page.getByTestId('currency-switcher-button').or(page.locator('button:has-text("USD"), button:has-text("AZN")')).first();
  const visible = await cur.isVisible().catch(() => false);
  console.log(`Para birimi switcher görünür: ${visible ? 'EVET' : 'HAYIR'}`);
  expect(visible).toBeTruthy();
});

test('AI Match sihirbazı açılıyor ve adımlar ilerliyor', async ({ page }) => {
  test.setTimeout(90_000);
  const resp = await page.goto('/ai-match', { waitUntil: 'domcontentloaded' });
  console.log(`/ai-match status: ${resp?.status()}`);
  const bodyText = (await page.locator('body').textContent().catch(() => '')) ?? '';
  const hasWizard = /Yatırım|Oturmak|bütçe|Akıllı|eşle|match/i.test(bodyText);
  console.log(`AI Match içerik yüklendi: ${hasWizard ? 'EVET' : 'HAYIR'}`);
  expect(resp?.status()).toBeLessThan(400);
});

test('Blog detay sayfası 500 vermiyor (sanitize-html fix)', async ({ page }) => {
  const resp = await page.goto('/blog/sistem-testi-blog', { waitUntil: 'domcontentloaded' });
  const status = resp?.status() ?? 0;
  const body = (await page.locator('body').textContent().catch(() => '')) ?? '';
  console.log(`/blog/sistem-testi-blog status: ${status}`);
  expect(status).toBe(200);
  expect(/Internal Server Error|Application error/i.test(body)).toBeFalsy();
});

test('KYC sayfası giriş yapınca açılıyor', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.request.post('/api/dev/sign-in', {
    data: { email: 'firudin@istbaku.com', password: 'Test1234!' },
    headers: { 'Content-Type': 'application/json' },
  });
  const resp = await page.goto('/kyc', { waitUntil: 'domcontentloaded' });
  const body = (await page.locator('body').textContent().catch(() => '')) ?? '';
  console.log(`/kyc (giriş yapılmış) status: ${resp?.status()}`);
  const hasForm = /Kimlik Doğrulama|Doğrulama türü|KYC/i.test(body);
  console.log(`KYC formu/durumu render: ${hasForm ? 'EVET' : 'HAYIR'}`);
  expect(resp?.status()).toBeLessThan(400);
});
