import { test, expect } from '@playwright/test';

const SEED_USER = { email: 'firudin@istbaku.com', password: 'Test1234!' };

// Read-only UI check: render the new "Ayarlar" tab and screenshot it.
// Does NOT submit any mutation (seed user lives on a shared DB).
test('Hesabım > Ayarlar tab renders profile/email/password forms', async ({ page }) => {
  test.setTimeout(120_000);
  page.setDefaultNavigationTimeout(120_000);
  await page.goto('/');
  await page.request.post('/api/dev/sign-in', { data: SEED_USER, headers: { 'Content-Type': 'application/json' } });

  await page.goto('/dashboard?tab=settings', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Hesap Ayarları')).toBeVisible({ timeout: 30_000 });

  for (const t of ['Profil Bilgileri', 'E-posta', 'Şifre Değiştir', 'Ad Soyad', 'Telefon', 'Mevcut şifre']) {
    const v = await page.getByText(t, { exact: false }).first().isVisible().catch(() => false);
    console.log(`Ayarlar bölümü "${t}": ${v ? 'VAR' : 'YOK'}`);
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e-out/screenshots/phase3-account-settings.png', fullPage: true });
});
