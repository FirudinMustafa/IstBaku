/**
 * PERSONA 8 — PAULA
 * German foreign buyer. English UI. EUR currency.
 *
 * Scenarios cover:
 *   1. Language switch to EN + visible English strings on home + raw i18n key leak detection
 *   2. Currency switch to EUR (if global switcher exists) + listing card EUR symbol/code
 *   3. /listings filters: city=Antalya, type=villa, beds 3+1, pool, price 300k-800k → Apply
 *   4. EN string sweep on /listings + property detail; collect untranslated keys
 *   5. /legal-guide → "Foreign buyer" entry → PDF link assertion
 *   6. /reports → "Antalya market trends" entry detection
 *   7. Chatbot EN: "Can foreigners buy property in Turkey?" → ≤ 8s response
 *   8. Agent message modal: open + type EN message (no send)
 *   9. Currency loop TRY → USD → AZN → EUR (if global switcher exists)
 *
 * Notes:
 *  - The repo does NOT appear to expose a global currency switcher in the
 *    header; currency is a per-listing field. We attempt to detect any such
 *    switcher and document its absence as a FUNCTIONAL gap when missing.
 *  - i18n leaks: we snapshot body text and search for dotted lowercase
 *    fragments that look like i18n keys (`nav.home`, `home.title`).
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { attachDiagnostics, snap } from './helpers';

const REPORT_PATH = 'e2e-out/08-paula-report.md';

interface FindingBucket {
  scenario: string;
  status: 'pass' | 'fail' | 'partial' | 'info';
  details: string[];
}

const findings: FindingBucket[] = [];
const i18nLeaks = new Set<string>();
const screenshotsTaken: string[] = [];

function record(b: FindingBucket) {
  findings.push(b);
  // eslint-disable-next-line no-console
  console.log(`[PAULA] ${b.scenario}: ${b.status}\n  - ${b.details.join('\n  - ')}`);
}

async function takeShot(page: Page, name: string) {
  const file = `persona-8-${name}.png`;
  await snap(page, file);
  screenshotsTaken.push(`e2e-out/screenshots/${file}`);
}

async function switchLanguageToEN(page: Page) {
  // Header LangSwitcher: button has aria-label "Dil değiştir"
  const trigger = page.locator('button[aria-label="Dil değiştir"]').first();
  if (await trigger.count()) {
    await trigger.click().catch(() => {});
    // After opening, dropdown shows LANG_LABELS — click "English"
    const enBtn = page.getByRole('button', { name: /english/i }).first();
    if (await enBtn.count()) {
      await enBtn.click().catch(() => {});
      await page.waitForTimeout(500);
      return true;
    }
  }
  return false;
}

function harvestI18nKeysFromText(text: string): string[] {
  // Look for `word.lowercaseword` patterns that look like i18n keys, but
  // exclude URLs, file extensions, decimals, and common abbreviations.
  const matches = text.match(/\b([a-z][a-z_]+\.[a-z_][a-z_.]{2,30})\b/g) ?? [];
  const filtered = matches.filter((m) => {
    // Filter out things like "www.x", "co.uk", file extensions, etc.
    if (m.endsWith('.com') || m.endsWith('.tr') || m.endsWith('.az')) return false;
    if (m.endsWith('.png') || m.endsWith('.jpg') || m.endsWith('.svg')) return false;
    if (m.endsWith('.ts') || m.endsWith('.tsx') || m.endsWith('.js')) return false;
    if (/^\d/.test(m)) return false;
    // Heuristic: i18n keys typically have a known namespace prefix
    const prefixes = [
      'nav.', 'hero.', 'common.', 'home.', 'cta.', 'features.', 'badges.',
      'footer.', 'reports.', 'legal.', 'calc.', 'bridge.', 'whatsapp.',
      'filter.', 'listing.', 'agent.', 'property.', 'auth.', 'dashboard.',
      'compare.', 'message.', 'notification.',
    ];
    return prefixes.some((p) => m.startsWith(p));
  });
  return filtered;
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  // Ensure output dirs exist
  fs.mkdirSync('e2e-out', { recursive: true });
  fs.mkdirSync('e2e-out/screenshots', { recursive: true });
});

test.afterAll(async () => {
  // Write Markdown report
  const lines: string[] = [];
  lines.push('# PERSONA 8 — PAULA (German foreign buyer · EN · EUR)');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  const counts = { pass: 0, fail: 0, partial: 0, info: 0 };
  for (const f of findings) counts[f.status]++;
  lines.push(`- PASS: ${counts.pass}`);
  lines.push(`- PARTIAL: ${counts.partial}`);
  lines.push(`- FAIL: ${counts.fail}`);
  lines.push(`- INFO: ${counts.info}`);
  lines.push('');
  lines.push('## Scenarios');
  lines.push('');
  for (const f of findings) {
    lines.push(`### ${f.scenario}`);
    lines.push('');
    lines.push(`Status: **${f.status.toUpperCase()}**`);
    lines.push('');
    for (const d of f.details) lines.push(`- ${d}`);
    lines.push('');
  }
  lines.push('## i18n Key Leaks Detected');
  lines.push('');
  if (i18nLeaks.size === 0) {
    lines.push('_None detected via heuristic pattern match._');
  } else {
    for (const k of [...i18nLeaks].sort()) lines.push(`- \`${k}\``);
  }
  lines.push('');
  lines.push('## Screenshots');
  lines.push('');
  for (const s of screenshotsTaken) lines.push(`- ${s}`);
  lines.push('');
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
});

test('Scenario 1 — language switch EN + visible English strings + i18n leak scan', async ({ page }) => {
  const diag = attachDiagnostics(page);
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await takeShot(page, '01-home-before-lang');

  const switched = await switchLanguageToEN(page);
  await page.waitForTimeout(700);
  await takeShot(page, '01-home-after-lang-en');

  const body = await page.locator('body').innerText().catch(() => '');
  const englishMarkers = [
    'Listings', 'Sign in', 'Reports', 'Legal', 'AI Match',
    'Private', 'Home', 'Search', 'Discover', 'Sign up',
  ];
  const found = englishMarkers.filter((m) => body.includes(m));

  // Harvest leaks
  const leaks = harvestI18nKeysFromText(body);
  leaks.forEach((k) => i18nLeaks.add(k));

  const details: string[] = [];
  details.push(`Language switcher trigger ${switched ? 'clicked successfully' : 'NOT FOUND'}.`);
  details.push(`Visible English strings found (out of ${englishMarkers.length}): ${found.length} → [${found.join(', ')}]`);
  details.push(`i18n key leaks on home (sample, max 10): ${leaks.slice(0, 10).join(', ') || 'none'}`);
  if (diag.consoleErrors.length) details.push(`Console errors: ${diag.consoleErrors.length}`);
  if (diag.pageErrors.length) details.push(`Page errors: ${diag.pageErrors.length}`);

  const status: FindingBucket['status'] = found.length >= 5 ? 'pass' : (found.length > 0 ? 'partial' : 'fail');
  if (found.length < 5) details.push('FUNCTIONAL GAP: fewer than 5 visible English markers on home after switching lang to EN.');

  record({ scenario: 'S1 — Language switch to EN', status, details });
  // Don't fail hard — we want all scenarios to run
  expect(switched || found.length > 0).toBeTruthy();
});

test('Scenario 2 — currency switcher to EUR + EUR symbol on listing card', async ({ page }) => {
  await page.goto('/');
  await switchLanguageToEN(page);
  await page.waitForTimeout(400);

  // Try to find any global currency switcher
  const candidates = [
    page.getByRole('button', { name: /eur|currency|para birimi/i }),
    page.locator('[data-currency-switcher]'),
    page.locator('select[name="currency"]'),
    page.getByRole('combobox', { name: /currency|para/i }),
  ];

  let foundSwitcher = false;
  for (const c of candidates) {
    if (await c.count()) {
      foundSwitcher = true;
      break;
    }
  }

  await page.goto('/listings');
  await page.waitForLoadState('networkidle').catch(() => {});
  await takeShot(page, '02-listings-card-currency');

  const body = await page.locator('body').innerText().catch(() => '');
  const hasEUR = body.includes('€') || /\bEUR\b/.test(body);
  const hasUSD = body.includes('$') || /\bUSD\b/.test(body);
  const hasTRY = body.includes('₺') || /\bTRY\b/.test(body);
  const hasAZN = body.includes('₼') || /\bAZN\b/.test(body);

  const details: string[] = [];
  details.push(`Global currency switcher detected: ${foundSwitcher}`);
  details.push(`Listing page currencies visible — EUR: ${hasEUR}, USD: ${hasUSD}, TRY: ${hasTRY}, AZN: ${hasAZN}`);
  if (!foundSwitcher) {
    details.push('FUNCTIONAL GAP: No global currency switcher in the header — currency appears to be per-listing (each listing has its own native currency).');
  }
  const status: FindingBucket['status'] = hasEUR ? 'pass' : (foundSwitcher ? 'partial' : 'fail');
  if (!hasEUR) details.push('FUNCTIONAL GAP: No EUR-priced listings visible on /listings landing.');

  record({ scenario: 'S2 — Currency to EUR', status, details });
});

test('Scenario 3 — /listings filters Antalya + villa + 3+1 + pool + 300-800k', async ({ page }) => {
  const diag = attachDiagnostics(page);
  await page.goto('/listings');
  await page.waitForLoadState('domcontentloaded');
  await switchLanguageToEN(page).catch(() => {});
  await page.waitForTimeout(400);

  const details: string[] = [];

  // Country = Türkiye (TR) — click chip if present
  const trChip = page.getByRole('button', { name: /türkiye|turkey|🇹🇷/i }).first();
  if (await trChip.count()) {
    await trChip.click().catch(() => {});
    details.push('Clicked Türkiye country chip.');
  } else {
    details.push('Türkiye country chip not found.');
  }
  await page.waitForTimeout(300);

  // City select → Antalya
  const citySelect = page.locator('select').filter({ hasText: /tüm şehirler|all cities|antalya/i }).first();
  if (await citySelect.count()) {
    await citySelect.selectOption({ label: 'Antalya' }).catch(async () => {
      await citySelect.selectOption('Antalya').catch(() => {});
    });
    details.push('Selected Antalya in city select.');
  } else {
    // Fallback: try any select on page that includes Antalya
    const allSelects = page.locator('select');
    const n = await allSelects.count();
    let picked = false;
    for (let i = 0; i < n; i++) {
      const opts = await allSelects.nth(i).locator('option').allInnerTexts();
      if (opts.some((o) => /antalya/i.test(o))) {
        await allSelects.nth(i).selectOption({ label: 'Antalya' }).catch(() => {});
        picked = true;
        details.push(`Selected Antalya in select index ${i}.`);
        break;
      }
    }
    if (!picked) details.push('City select with Antalya not found.');
  }
  await page.waitForTimeout(400);

  // Villa chip
  const villaChip = page.getByRole('button', { name: /^villa$/i }).first();
  if (await villaChip.count()) {
    await villaChip.click().catch(() => {});
    details.push('Clicked Villa property-type chip.');
  } else {
    details.push('FUNCTIONAL GAP: Villa chip not found (or not localized in EN).');
  }

  // 3+1 chip
  const r31 = page.getByRole('button', { name: /^3\+1$/ }).first();
  if (await r31.count()) {
    await r31.click().catch(() => {});
    details.push('Clicked 3+1 room chip.');
  } else {
    details.push('3+1 room chip not found.');
  }

  // Pool feature
  const pool = page.getByText(/^(Havuz|Pool)$/i).first();
  if (await pool.count()) {
    await pool.click().catch(() => {});
    details.push('Clicked Pool feature chip.');
  } else {
    details.push('Pool feature chip not found.');
  }

  // Price min/max — USD inputs
  const minPrice = page.locator('input[aria-label*="Minimum fiyat" i], input[aria-label*="Min price" i]').first();
  const maxPrice = page.locator('input[aria-label*="Maksimum fiyat" i], input[aria-label*="Max price" i]').first();
  if (await minPrice.count()) {
    await minPrice.fill('300000').catch(() => {});
    details.push('Filled min price 300000.');
  }
  if (await maxPrice.count()) {
    await maxPrice.fill('800000').catch(() => {});
    details.push('Filled max price 800000.');
  }

  await page.waitForTimeout(800);
  await takeShot(page, '03-listings-filters-applied');

  // Count results
  const cardCount = await page.locator('article, [data-listing-card], a[href^="/property/"]').count();
  details.push(`Listing card count after filters: ${cardCount}`);

  // Currency-in-filter check (filter says USD; foreign buyer expects EUR)
  const filterUSDLabel = await page.getByText(/Fiyat aralığı \(USD\)|Price range \(USD\)/i).count();
  if (filterUSDLabel) details.push('Note: price range hardcoded to USD — no EUR option in filter.');

  if (diag.consoleErrors.length) details.push(`Console errors: ${diag.consoleErrors.length}`);

  const status: FindingBucket['status'] = cardCount > 0 ? 'pass' : 'partial';
  record({ scenario: 'S3 — Filters Antalya/villa/3+1/pool/300-800k', status, details });
});

test('Scenario 4 — EN string sweep on /listings + property detail', async ({ page }) => {
  await page.goto('/listings');
  await switchLanguageToEN(page).catch(() => {});
  await page.waitForTimeout(400);

  const listingsBody = await page.locator('body').innerText().catch(() => '');
  const listingsLeaks = harvestI18nKeysFromText(listingsBody);
  listingsLeaks.forEach((k) => i18nLeaks.add(k));

  // Turkish leak detection — strings still in TR even after EN switch
  const trMarkers = [
    'Filtreler', 'Şehir', 'İlçe', 'Tüm şehirler', 'Emlak Türü',
    'Fiyat aralığı', 'Oda Sayısı', 'Banyo Sayısı', 'Özellikler',
    'Yayın tarihi', 'Ekstralar', 'Sıfırla', 'Sahibinden', 'Boş',
  ];
  const remainingTR = trMarkers.filter((m) => listingsBody.includes(m));

  await takeShot(page, '04a-listings-en-sweep');

  // Open first property detail
  const firstCard = page.locator('a[href^="/property/"]').first();
  let propertyDetailLeaks: string[] = [];
  let propertyRemainingTR: string[] = [];
  if (await firstCard.count()) {
    await firstCard.click().catch(() => {});
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    await takeShot(page, '04b-property-detail-en');
    const propBody = await page.locator('body').innerText().catch(() => '');
    propertyDetailLeaks = harvestI18nKeysFromText(propBody);
    propertyDetailLeaks.forEach((k) => i18nLeaks.add(k));
    propertyRemainingTR = trMarkers.filter((m) => propBody.includes(m));
  }

  const details: string[] = [];
  details.push(`/listings: TR strings still visible after EN switch (FUNCTIONAL GAP): [${remainingTR.join(', ')}]`);
  details.push(`/listings: i18n key leaks (sample): [${listingsLeaks.slice(0, 10).join(', ')}]`);
  details.push(`property detail: TR strings still visible: [${propertyRemainingTR.join(', ')}]`);
  details.push(`property detail: i18n key leaks (sample): [${propertyDetailLeaks.slice(0, 10).join(', ')}]`);
  if (remainingTR.length > 0) {
    details.push('FUNCTIONAL GAP: FilterSidebar and many UI labels are hardcoded to Turkish. EN translation incomplete.');
  }

  const status: FindingBucket['status'] = remainingTR.length === 0 && propertyRemainingTR.length === 0 ? 'pass' : 'partial';
  record({ scenario: 'S4 — EN string sweep + untranslated keys', status, details });
});

test('Scenario 5 — /legal-guide → "Foreign buyer in Turkey" + PDF link', async ({ page }) => {
  await page.goto('/legal-guide');
  await page.waitForLoadState('domcontentloaded');
  await switchLanguageToEN(page).catch(() => {});
  await page.waitForTimeout(500);
  await takeShot(page, '05-legal-guide-en');

  const details: string[] = [];
  const body = await page.locator('body').innerText().catch(() => '');

  // The legal guide is hardcoded TR; AZ→TR template covers foreign buyer flow
  const trMarkers = ['Hukuki Rehber', 'Vatandaşlığın', 'Alım yapacağın ülke'];
  const trVisible = trMarkers.filter((m) => body.includes(m));
  if (trVisible.length > 0) {
    details.push(`FUNCTIONAL GAP: /legal-guide is fully hardcoded Turkish: [${trVisible.join(', ')}]`);
  }

  // Try to select "Other country" for nationality + Türkiye target (foreign-buyer scenario)
  const nationalitySelect = page.locator('select').first();
  if (await nationalitySelect.count()) {
    await nationalitySelect.selectOption('OTHER').catch(() => {});
    details.push('Selected nationality=OTHER (foreign buyer).');
  }
  const targetSelect = page.locator('select').nth(1);
  if (await targetSelect.count()) {
    await targetSelect.selectOption('TR').catch(() => {});
    details.push('Selected target=TR.');
  }
  await page.waitForTimeout(400);
  await takeShot(page, '05-legal-guide-foreign-tr');

  // Look for any "Foreign buyer" entry or PDF link
  const foreignEntry = await page.getByText(/foreign buyer|yabancı (yatırımcı|alıcı)|foreigner/i).first().count();
  details.push(`"Foreign buyer" related text on page: ${foreignEntry > 0 ? 'found' : 'not found'}.`);
  const pdfLinks = page.locator('a[href$=".pdf"], a[href*=".pdf?"]');
  const pdfCount = await pdfLinks.count();
  details.push(`PDF links on page: ${pdfCount}`);
  if (pdfCount > 0) {
    const href = await pdfLinks.first().getAttribute('href');
    details.push(`First PDF href: ${href}`);
    // Assert presence only (do not download)
    expect(href).toBeTruthy();
  } else {
    details.push('FUNCTIONAL GAP: No PDF/downloadable legal references found in /legal-guide.');
  }

  const status: FindingBucket['status'] = pdfCount > 0 ? 'pass' : 'partial';
  record({ scenario: 'S5 — /legal-guide foreign buyer + PDF', status, details });
});

test('Scenario 6 — /reports Antalya market trends', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('domcontentloaded');
  await switchLanguageToEN(page).catch(() => {});
  await page.waitForTimeout(500);
  await takeShot(page, '06-reports-en');

  const body = await page.locator('body').innerText().catch(() => '');
  const details: string[] = [];

  const antalya = /antalya/i.test(body);
  const market = /market (trend|analiz|report)/i.test(body) || /piyasa (trend|analiz|rapor)/i.test(body);
  details.push(`Antalya mentioned on /reports: ${antalya}`);
  details.push(`"Market trends"-like phrase visible: ${market}`);

  // Look for an entry titled like "Antalya market trends"
  const antalyaEntry = page.getByText(/antalya.*market|antalya.*trend|antalya.*rapor/i).first();
  if (await antalyaEntry.count()) {
    details.push('Found Antalya-related report entry.');
  } else {
    details.push('FUNCTIONAL GAP: No "Antalya market trends" entry detected on /reports.');
  }

  // Check for raw key leaks here
  const leaks = harvestI18nKeysFromText(body);
  leaks.forEach((k) => i18nLeaks.add(k));
  if (leaks.length) details.push(`i18n leaks on /reports: [${leaks.slice(0, 8).join(', ')}]`);

  const status: FindingBucket['status'] = antalya && market ? 'pass' : (antalya || market ? 'partial' : 'fail');
  record({ scenario: 'S6 — /reports Antalya market trends', status, details });
});

test('Scenario 7 — chatbot EN: foreigners buying property in Turkey', async ({ page }) => {
  const diag = attachDiagnostics(page);
  await page.goto('/');
  await switchLanguageToEN(page).catch(() => {});
  await page.waitForTimeout(400);

  // Open chatbot FAB
  const fab = page.getByRole('button', { name: /AI (Asistanı|assistant)/i }).first();
  const details: string[] = [];

  if (!(await fab.count())) {
    details.push('FUNCTIONAL GAP: chatbot FAB not found.');
    record({ scenario: 'S7 — Chatbot EN', status: 'fail', details });
    return;
  }
  await fab.click().catch(() => {});
  await page.waitForTimeout(500);
  await takeShot(page, '07-chatbot-opened');

  const input = page.locator('input[aria-label*="AI" i], input[placeholder*="sor" i], input[placeholder*="ask" i]').first();
  if (!(await input.count())) {
    details.push('FUNCTIONAL GAP: chatbot input not found.');
    record({ scenario: 'S7 — Chatbot EN', status: 'fail', details });
    return;
  }
  const question = 'Can foreigners buy property in Turkey?';
  await input.fill(question);
  await page.keyboard.press('Enter');

  // Wait up to 8s for the assistant response (new assistant bubble after user)
  const start = Date.now();
  let assistantReply = '';
  while (Date.now() - start < 8000) {
    const bubbles = await page.locator('div.glass.rounded-2xl, div.rounded-2xl').allInnerTexts().catch(() => [] as string[]);
    const last = bubbles[bubbles.length - 1] ?? '';
    if (last && !last.includes(question) && last.length > 5) {
      assistantReply = last;
      break;
    }
    await page.waitForTimeout(250);
  }
  const elapsed = Date.now() - start;

  details.push(`Question sent: "${question}"`);
  details.push(`Response time: ${elapsed} ms`);
  details.push(`Assistant reply (first 200 chars): ${assistantReply.slice(0, 200).replace(/\s+/g, ' ')}`);

  await takeShot(page, '07-chatbot-response');

  // Chatbot placeholder is hardcoded TR — note that
  const placeholder = await input.getAttribute('placeholder').catch(() => '');
  if (placeholder && /sor/i.test(placeholder)) {
    details.push(`FUNCTIONAL GAP: chatbot placeholder is Turkish ("${placeholder}") even after EN switch.`);
  }
  if (diag.consoleErrors.length) details.push(`Console errors: ${diag.consoleErrors.length}`);

  const status: FindingBucket['status'] = assistantReply.length > 0 && elapsed <= 8000 ? 'pass' : 'partial';
  record({ scenario: 'S7 — Chatbot EN response', status, details });
});

test('Scenario 8 — agent message modal EN (no send)', async ({ page }) => {
  await page.goto('/listings');
  await page.waitForLoadState('domcontentloaded');
  await switchLanguageToEN(page).catch(() => {});
  await page.waitForTimeout(400);

  const firstCard = page.locator('a[href^="/property/"]').first();
  const details: string[] = [];

  if (!(await firstCard.count())) {
    details.push('FUNCTIONAL GAP: no property cards on /listings.');
    record({ scenario: 'S8 — Agent message modal', status: 'fail', details });
    return;
  }

  await firstCard.click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);

  // Open message modal — try multiple selectors
  const msgButtons = page.getByRole('button', { name: /mesaj|message|write|yaz/i });
  const n = await msgButtons.count();
  let opened = false;
  for (let i = 0; i < n; i++) {
    await msgButtons.nth(i).click({ trial: false }).catch(() => {});
    await page.waitForTimeout(400);
    const textarea = page.locator('textarea').first();
    if (await textarea.count() && await textarea.isVisible().catch(() => false)) {
      opened = true;
      break;
    }
  }
  if (!opened) {
    // Try clicking any visible message icon
    const msgIcon = page.locator('button:has(svg)').filter({ hasText: /^$/ });
    details.push(`Buttons attempted: ${n}, message modal opened: ${opened}`);
  }

  if (opened) {
    await takeShot(page, '08-agent-message-modal-open');
    const ta = page.locator('textarea').first();
    const initial = await ta.inputValue().catch(() => '');
    details.push(`Initial textarea value: "${initial.slice(0, 120)}"`);
    const enMessage = 'Hello, I am a foreign buyer from Germany. Is this property still available? I prefer EUR pricing if possible.';
    await ta.fill(enMessage);
    details.push('Filled EN message into agent textarea (NOT sending).');
    await takeShot(page, '08-agent-message-filled');
  } else {
    details.push('FUNCTIONAL GAP: could not open agent message modal from property detail.');
  }

  const status: FindingBucket['status'] = opened ? 'pass' : 'fail';
  record({ scenario: 'S8 — Agent message modal EN', status, details });
});

test('Scenario 9 — currency switch loop TRY → USD → AZN → EUR', async ({ page }) => {
  await page.goto('/listings');
  await page.waitForLoadState('domcontentloaded');
  await switchLanguageToEN(page).catch(() => {});
  await page.waitForTimeout(400);

  const details: string[] = [];

  // Detect a global currency switcher
  const switcherCandidates = [
    page.getByRole('button', { name: /currency|para birimi/i }),
    page.locator('[data-currency-switcher]'),
    page.locator('select[name="currency"]'),
  ];
  let switcherFound = false;
  for (const c of switcherCandidates) {
    if (await c.count()) { switcherFound = true; break; }
  }
  details.push(`Global currency switcher present: ${switcherFound}`);
  if (!switcherFound) {
    details.push('FUNCTIONAL GAP: No global currency switcher available — TRY → USD → AZN → EUR loop cannot be exercised through the UI.');
    details.push('NOTE: lib/currency.ts exposes formatPrice & convert helpers, but no header control invokes them.');
    record({ scenario: 'S9 — Currency switch loop', status: 'fail', details });
    return;
  }

  // If a switcher exists, attempt the loop
  const loop: ('TRY' | 'USD' | 'AZN' | 'EUR')[] = ['TRY', 'USD', 'AZN', 'EUR'];
  const priceSamples: Record<string, string> = {};
  for (const cur of loop) {
    const btn = page.getByRole('button', { name: new RegExp(cur, 'i') }).first();
    if (await btn.count()) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(500);
      const priceText = await page.locator('article, [data-listing-card], a[href^="/property/"]').first().innerText().catch(() => '');
      priceSamples[cur] = priceText.split('\n').find((l) => /[\d€$₺₼]/.test(l)) ?? '';
      details.push(`After ${cur}: sample = "${priceSamples[cur]}"`);
      await takeShot(page, `09-currency-${cur.toLowerCase()}`);
    } else {
      details.push(`Currency option ${cur} not found in switcher.`);
    }
  }

  const distinct = new Set(Object.values(priceSamples).filter(Boolean));
  if (distinct.size < 2) {
    details.push('FUNCTIONAL GAP: price text did not change across currency switches.');
  }

  const status: FindingBucket['status'] = distinct.size >= 2 ? 'pass' : 'partial';
  record({ scenario: 'S9 — Currency switch loop', status, details });
});
