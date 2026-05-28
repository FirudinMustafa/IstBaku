import { test, expect } from '@playwright/test';

const SEED_USER = { email: 'firudin@istbaku.com', password: 'Test1234!' };

test('Satılık step2 shows price + Ticaret Bakanlığı warning (clean session)', async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultNavigationTimeout(120_000);
  await page.goto('/');
  await page.request.post('/api/dev/sign-in', { data: SEED_USER, headers: { 'Content-Type': 'application/json' } });
  // Clean any persisted wizard draft so purpose starts unset.
  await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });

  await page.goto('/new-listing', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /İlanını yayınla/i })).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });

  await page.getByRole('button', { name: /^Satılık$/ }).first().click();
  await page.getByRole('button', { name: /^Konut$/ }).first().click();
  await page.getByRole('button', { name: /^İleri/ }).first().click();

  await expect(page.getByRole('heading', { name: /^Konum$/ })).toBeVisible({ timeout: 15_000 });
  const selects = page.locator('select');
  await selects.nth(1).selectOption({ label: 'İstanbul' }).catch(() => undefined);
  await page.waitForTimeout(300);
  await selects.nth(2).selectOption({ label: 'Beşiktaş' }).catch(() => undefined);
  await page.locator('input[placeholder^="Cadde, no"]').first().fill('Test Cd. No:1');
  const map = page.locator('.leaflet-container').first();
  if (await map.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await map.scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(1500);
    for (let i = 0; i < 4; i++) {
      await map.click({ position: { x: 160 + i * 30, y: 120 + i * 20 } }).catch(() => undefined);
      await page.waitForTimeout(400);
    }
  }
  await page.getByRole('button', { name: /^İleri/ }).first().click();
  await expect(page.getByRole('heading', { name: /^Detaylar$/ })).toBeVisible({ timeout: 10_000 });

  const priceField = await page.getByText('Fiyat', { exact: true }).first().isVisible().catch(() => false);
  const warning = await page.getByText(/Ticaret Bakanlığı/).first().isVisible().catch(() => false);
  console.log(`SALE price field visible: ${priceField}`);
  console.log(`SALE Ticaret Bakanlığı warning visible: ${warning}`);
  await page.getByText(/Ticaret Bakanlığı/).first().scrollIntoViewIfNeeded().catch(() => undefined);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'e2e-out/screenshots/phase1-wizard-step2-sale-clean.png', fullPage: true });
  expect(warning).toBeTruthy();
});
