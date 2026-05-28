import { test, expect, Page } from '@playwright/test';

// ============================================================================
// Phase 1 + Phase 2 UI verification (manual-review oriented).
// Produces screenshots under e2e-out/screenshots/phase-*. Steps are soft:
// failures are logged, not thrown, so the run always completes and we collect
// every screenshot for visual review.
// ============================================================================

const SEED_USER = { email: 'firudin@istbaku.com', password: 'Test1234!' };
const KNOWN_SLUG = 'besiktas-bogaz-manzarali-luks-konut';
const log: string[] = [];
function note(s: string) { log.push(s); console.log('  • ' + s); }

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `e2e-out/screenshots/${name}`, fullPage: true }).catch(() => undefined);
}

async function devSignIn(page: Page): Promise<boolean> {
  await page.goto('/');
  const resp = await page.request.post('/api/dev/sign-in', {
    data: SEED_USER, headers: { 'Content-Type': 'application/json' },
  }).catch(() => null);
  if (!resp || !resp.ok()) return false;
  const body = await resp.json().catch(() => ({}));
  return Boolean(body?.ok);
}

test('Phase 1+2 UI verification with screenshots', async ({ page }) => {
  test.setTimeout(240_000);
  page.setDefaultNavigationTimeout(120_000);

  // ---------------------------------------------------------------
  // PHASE 2 — Filters page: bold font + new filter sections + rooms
  // ---------------------------------------------------------------
  await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);

  for (const title of ['Konut tipi', 'Enerji sınıfı', 'Yapının durumu', 'Yapı tipi', 'Cephe / yön']) {
    const found = await page.getByText(title, { exact: true }).first().isVisible().catch(() => false);
    note(`Filtre bölümü "${title}": ${found ? 'VAR' : 'YOK'}`);
  }

  // Expand the new sections + rooms so chips are visible in the screenshot.
  for (const title of ['Oda Sayısı', 'Oda', 'Konut tipi', 'Enerji sınıfı', 'Yapının durumu', 'Yapı tipi', 'Cephe / yön']) {
    const btn = page.getByRole('button', { name: new RegExp(title, 'i') }).first();
    if (await btn.count()) await btn.click().catch(() => undefined);
  }
  await page.waitForTimeout(500);
  const studio = await page.getByText('Stüdyo (1+0)').first().isVisible().catch(() => false);
  note(`Oda chip "Stüdyo (1+0)": ${studio ? 'VAR' : 'YOK'}`);
  await shot(page, 'phase2-listings-filters.png');

  // ---------------------------------------------------------------
  // PHASE 1 — Detail page: bold "Bina ve Daire Detayları" + new rows
  // ---------------------------------------------------------------
  await page.goto(`/property/${KNOWN_SLUG}`, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  const detailOk = await page.getByText('Bina ve Daire Detayları').first().isVisible({ timeout: 15_000 }).catch(() => false);
  note(`Detay "Bina ve Daire Detayları" kartı: ${detailOk ? 'VAR' : 'YOK (slug değişmiş olabilir)'}`);
  if (detailOk) {
    await page.getByText('Bina ve Daire Detayları').first().scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(500);
    await shot(page, 'phase1-detail-features.png');
  }

  // ---------------------------------------------------------------
  // PHASE 1 — New-listing wizard (auth required)
  // ---------------------------------------------------------------
  const signedIn = await devSignIn(page);
  note(`Dev sign-in (${SEED_USER.email}): ${signedIn ? 'BAŞARILI' : 'BAŞARISIZ — sihirbaz testi atlandı'}`);
  if (!signedIn) return;

  await page.goto('/new-listing', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /İlanını yayınla/i })).toBeVisible({ timeout: 30_000 });

  // Step 0 — three purpose buttons
  for (const l of ['Satılık', 'Kiralık', 'Günlük Kiralık']) {
    const v = await page.getByRole('button', { name: new RegExp(`^${l}$`) }).first().isVisible().catch(() => false);
    note(`İlan türü butonu "${l}": ${v ? 'VAR' : 'YOK'}`);
  }
  await page.getByRole('button', { name: /^Günlük Kiralık$/ }).first().click().catch(() => undefined);
  await page.getByRole('button', { name: /^Konut$/ }).first().click().catch(() => undefined);
  await shot(page, 'phase1-wizard-step0-types.png');
  await page.getByRole('button', { name: /^İleri/ }).first().click();

  // Step 1 — Konum: fill + drop map pin
  await expect(page.getByRole('heading', { name: /^Konum$/ })).toBeVisible({ timeout: 15_000 });
  const selects = page.locator('select');
  await selects.nth(1).selectOption({ label: 'İstanbul' }).catch(() => undefined);
  await page.waitForTimeout(300);
  await selects.nth(2).selectOption({ label: 'Beşiktaş' }).catch(() => undefined);
  await page.locator('input[placeholder^="Cadde, no"]').first().fill('Test Cd. No:1').catch(() => undefined);
  const map = page.locator('.leaflet-container').first();
  if (await map.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await map.scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(1500);
    for (let i = 0; i < 4; i++) {
      await map.click({ position: { x: 160 + i * 30, y: 120 + i * 20 } }).catch(() => undefined);
      await page.waitForTimeout(400);
    }
  }
  await page.getByRole('button', { name: /^İleri/ }).first().click();

  // Step 2 — Detaylar: the heart of Phase 1
  const detayReached = await page.getByRole('heading', { name: /^Detaylar$/ }).isVisible({ timeout: 8_000 }).catch(() => false);
  note(`Sihirbaz "Detaylar" adımına ulaşıldı: ${detayReached ? 'EVET' : 'HAYIR (harita pini kaydolmadı olabilir)'}`);
  if (detayReached) {
    // New field labels present?
    for (const lbl of ['İlan başlığı (opsiyonel)', 'Konut tipi', 'Enerji kimlik belgesi', 'Cephe / yön', 'Yapının durumu', 'Yapı tipi', 'Aidat (aylık)', 'İzin / ruhsat belge no', 'Taşınmaz numarası']) {
      const v = await page.getByText(lbl, { exact: false }).first().isVisible().catch(() => false);
      note(`  Detay alanı "${lbl}": ${v ? 'VAR' : 'YOK'}`);
    }
    // Feature toggles
    for (const f of ['Asansör', 'Eşyalı', 'Balkon', 'Yüzme havuzu', 'Spor alanı', 'Site içerisinde']) {
      const v = await page.getByRole('button', { name: new RegExp(f) }).first().isVisible().catch(() => false);
      note(`  Özellik toggle "${f}": ${v ? 'VAR' : 'YOK'}`);
    }
    // Daily rent → no price field / no bakanlık warning at step 2
    const warning = await page.getByText(/Ticaret Bakanlığı/).first().isVisible().catch(() => false);
    note(`  (Günlük kira) fiyat uyarısı step2'de gizli: ${warning ? 'HAYIR (görünür)' : 'EVET (gizli)'}`);

    // Tiptap editor present + type + bold
    const editor = page.locator('.tiptap-content').first();
    const editorOk = await editor.isVisible().catch(() => false);
    note(`  Tiptap açıklama editörü: ${editorOk ? 'VAR' : 'YOK'}`);
    if (editorOk) {
      await editor.click().catch(() => undefined);
      await page.keyboard.type('Boğaz manzaralı, asansörlü, site içinde lüks daire. ');
      await page.getByRole('button', { name: 'Kalın' }).first().click().catch(() => undefined);
      await page.keyboard.type('Kaçırılmayacak fırsat!');
    }
    // Fill some numerics (0-fix: fields start empty with placeholders)
    await page.getByRole('button', { name: /^Site içerisinde/ }).first().click().catch(() => undefined);
    await page.locator('input[placeholder^="Örn: 100"]').first().fill('135').catch(() => undefined);
    await page.waitForTimeout(400);
    await shot(page, 'phase1-wizard-step2-detay-daily.png');
  }

  // Second pass: a Satılık listing to show the price field + bakanlık warning
  await page.goto('/new-listing', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /İlanını yayınla/i })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /^Satılık$/ }).first().click().catch(() => undefined);
  await page.getByRole('button', { name: /^Konut$/ }).first().click().catch(() => undefined);
  await page.getByRole('button', { name: /^İleri/ }).first().click();
  await page.getByRole('heading', { name: /^Konum$/ }).isVisible({ timeout: 10_000 }).catch(() => false);
  const selects2 = page.locator('select');
  await selects2.nth(1).selectOption({ label: 'İstanbul' }).catch(() => undefined);
  await page.waitForTimeout(300);
  await selects2.nth(2).selectOption({ label: 'Beşiktaş' }).catch(() => undefined);
  await page.locator('input[placeholder^="Cadde, no"]').first().fill('Test Cd. No:1').catch(() => undefined);
  const map2 = page.locator('.leaflet-container').first();
  if (await map2.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await map2.scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(1500);
    for (let i = 0; i < 4; i++) {
      await map2.click({ position: { x: 160 + i * 30, y: 120 + i * 20 } }).catch(() => undefined);
      await page.waitForTimeout(400);
    }
  }
  await page.getByRole('button', { name: /^İleri/ }).first().click();
  if (await page.getByRole('heading', { name: /^Detaylar$/ }).isVisible({ timeout: 8_000 }).catch(() => false)) {
    const warn = await page.getByText(/Ticaret Bakanlığı/).first().isVisible().catch(() => false);
    note(`(Satılık) fiyat uyarı metni görünür: ${warn ? 'EVET' : 'HAYIR'}`);
    await page.getByText(/Ticaret Bakanlığı/).first().scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(400);
    await shot(page, 'phase1-wizard-step2-detay-sale.png');
  }

  console.log('\n===== PHASE 1+2 VERIFICATION SUMMARY =====\n' + log.join('\n') + '\n==========================================');
});
