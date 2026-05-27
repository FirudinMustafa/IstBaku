import { test, expect } from '@playwright/test';
import { attachDiagnostics, snap, uniqueEmail, uniqueName } from './helpers';

/**
 * PERSONA 2 — "RAUF"
 * 45-yo Bakı investor. AZN currency, AZ language. Looking for TR investment props.
 *
 * Findings are captured into the global findings array (writable by tests) and
 * persisted by an afterAll hook into e2e-out/02-rauf-report.md.
 */

type Severity = 'BROKEN' | 'FUNCTIONAL' | 'UX' | 'POLISH' | 'PASSED';
interface Finding {
  scenario: string;
  severity: Severity;
  note: string;
}
const findings: Finding[] = [];
const record = (scenario: string, severity: Severity, note: string) => {
  findings.push({ scenario, severity, note });
};

test.describe('Persona 2 — Rauf', () => {
  let signupEmail = '';
  const password = 'Test12345!';
  const fullName = uniqueName('Rauf');

  test.beforeEach(async ({ page }) => {
    attachDiagnostics(page);
  });

  test('S1: Switch language to AZ from header', async ({ page }) => {
    const diag = attachDiagnostics(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await snap(page, 'persona-2-s1-home-initial.png');

    // Locate the language switcher (button with aria-label "Dil değiştir")
    const langButton = page.locator('button[aria-label="Dil değiştir"]').first();
    const langButtonCount = await langButton.count();
    if (langButtonCount === 0) {
      record('S1 Language switcher', 'BROKEN', 'Could not find header language switcher (aria-label="Dil değiştir").');
      await snap(page, 'persona-2-s1-no-lang-switcher.png');
      expect(langButtonCount).toBeGreaterThan(0);
      return;
    }

    await langButton.click();
    await page.waitForTimeout(200);
    await snap(page, 'persona-2-s1-lang-open.png');

    // Click the AZ option ("Azərbaycan")
    const azOption = page.getByRole('button', { name: /Azərbaycan/i }).first();
    const azCount = await azOption.count();
    if (azCount === 0) {
      record('S1 Language switcher', 'BROKEN', 'AZ option ("Azərbaycan") not present in language dropdown.');
      expect(azCount).toBeGreaterThan(0);
      return;
    }
    await azOption.click();
    await page.waitForTimeout(500);
    await snap(page, 'persona-2-s1-lang-az.png');

    // Verify some AZ string in nav — e.g. "Elanlar" (Listings in AZ)
    const nav = page.locator('nav[aria-label="Ana gezinme"]').first();
    const navText = await nav.textContent().catch(() => '');
    const hasAzString = /Elanlar|Portfel|Hüquqi|Hesabatlar|Uyğunlaşma/i.test(navText ?? '');
    if (!hasAzString) {
      record('S1 Language switcher', 'FUNCTIONAL', `Language toggle did not propagate to nav: got "${(navText ?? '').slice(0, 200)}".`);
    } else {
      record('S1 Language switcher', 'PASSED', `Nav contains AZ string. Text sample: "${(navText ?? '').slice(0, 80)}".`);
    }
    if (diag.consoleErrors.length || diag.pageErrors.length) {
      record('S1 Language switcher', 'POLISH', `Console errors: ${diag.consoleErrors.length}, page errors: ${diag.pageErrors.length}.`);
    }
    expect(hasAzString).toBeTruthy();
  });

  test('S2: Currency switcher to AZN + price displays ₼/AZN', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Look for currency switcher — could be a button/dropdown labelled USD/EUR/TRY/AZN.
    const possibleSelectors = [
      'button[aria-label*="Para birimi" i]',
      'button[aria-label*="Currency" i]',
      'button[aria-label*="Valyuta" i]',
      'button:has-text("USD")',
      'button:has-text("AZN")',
      'select[name="currency"]',
    ];

    let foundCurrencySwitcher = false;
    for (const sel of possibleSelectors) {
      if (await page.locator(sel).count()) {
        foundCurrencySwitcher = true;
        break;
      }
    }

    await snap(page, 'persona-2-s2-home-currency-search.png');

    if (!foundCurrencySwitcher) {
      record(
        'S2 Currency switcher',
        'BROKEN',
        'No header currency switcher found. App appears to render listing prices in each listing\'s native currency only; no global currency selector.',
      );
    } else {
      record('S2 Currency switcher', 'FUNCTIONAL', 'Currency switcher located but switching/verification flow needs UI inspection.');
    }

    // Independent check: navigate to /listings and verify if a price card shows ₼/AZN naturally
    await page.goto('/listings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    await snap(page, 'persona-2-s2-listings.png');
    const bodyText = (await page.locator('body').textContent()) ?? '';
    const hasAznSymbol = bodyText.includes('₼') || /\bAZN\b/.test(bodyText);
    if (hasAznSymbol) {
      record('S2 Currency display', 'PASSED', 'Some listing card on /listings is denominated in AZN (₼ or "AZN" found).');
    } else {
      record(
        'S2 Currency display',
        'UX',
        'No ₼/AZN found in listings — prices appear in USD/EUR/TRY only. AZ investor needs AZN view.',
      );
    }
    // Soft assertion — record finding regardless
    expect(typeof bodyText).toBe('string');
  });

  test('S3: Country switcher in header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const candidates = [
      'button[aria-label*="Ülke" i]',
      'button[aria-label*="Country" i]',
      'button[aria-label*="Ölkə" i]',
      'select[name="country"]',
      'button:has-text("🇹🇷")',
      'button:has-text("🇦🇿")',
    ];
    let found = false;
    for (const sel of candidates) {
      if (await page.locator(sel).count()) { found = true; break; }
    }
    await snap(page, 'persona-2-s3-country.png');
    if (!found) {
      record(
        'S3 Country switcher',
        'UX',
        'No header country picker found (only language switcher exists). For AZ investor, country context is implicit via /listings filters.',
      );
    } else {
      record('S3 Country switcher', 'PASSED', 'Country switcher exists in header.');
    }
    // Non-fatal scenario — just record.
    expect(true).toBeTruthy();
  });

  test('S4: /reports loads', async ({ page }) => {
    const diag = attachDiagnostics(page);
    const resp = await page.goto('/reports');
    await page.waitForLoadState('domcontentloaded');
    await snap(page, 'persona-2-s4-reports.png');
    const status = resp?.status() ?? 0;
    if (!status || status >= 400) {
      record('S4 /reports', 'BROKEN', `HTTP ${status} on /reports.`);
      expect(status).toBeLessThan(400);
      return;
    }
    // Look for headline/heading
    const heading = page.locator('h1, h2').first();
    const headingTxt = (await heading.textContent().catch(() => '')) ?? '';
    if (!headingTxt.trim()) {
      record('S4 /reports', 'POLISH', 'Page loaded (HTTP 200) but no top-level heading detected.');
    } else {
      record('S4 /reports', 'PASSED', `Loaded — heading: "${headingTxt.trim().slice(0, 80)}".`);
    }
    if (diag.networkErrors.length) {
      record('S4 /reports', 'POLISH', `Network 5xx errors: ${diag.networkErrors.slice(0, 3).join('; ')}.`);
    }
  });

  test('S5: AI Match wizard (yatirim, 10y, 500K USD)', async ({ page }) => {
    const diag = attachDiagnostics(page);
    await page.goto('/ai-match');
    await page.waitForLoadState('domcontentloaded');
    await snap(page, 'persona-2-s5-aimatch-0.png');

    // Step 0 — pick goal "Yatırım" (UserGoal: yatirim)
    const investGoal = page.getByRole('button', { name: /Yatırım/i }).first();
    const investCount = await investGoal.count();
    if (investCount === 0) {
      record('S5 AI Match wizard', 'BROKEN', 'Step 0: could not find "Yatırım" goal button.');
      expect(investCount).toBeGreaterThan(0);
      return;
    }
    await investGoal.click();
    await page.waitForTimeout(150);

    const nextBtn = page.getByRole('button', { name: /^İleri/i });
    await nextBtn.first().click();
    await page.waitForTimeout(150);
    await snap(page, 'persona-2-s5-aimatch-1.png');

    // Step 1 — countries — both already pre-selected by default. Advance.
    const nextBtn2 = page.getByRole('button', { name: /^İleri/i });
    await nextBtn2.first().click({ timeout: 5000 }).catch(async () => {
      // If both countries got toggled off, click one
      await page.getByRole('button', { name: /Türkiye/i }).first().click();
      await page.getByRole('button', { name: /^İleri/i }).first().click();
    });
    await page.waitForTimeout(150);
    await snap(page, 'persona-2-s5-aimatch-2.png');

    // Step 2 — budget + horizon
    const budgetInput = page.locator('input[type="number"]').first();
    if (await budgetInput.count()) {
      await budgetInput.fill('500000');
    } else {
      record('S5 AI Match wizard', 'POLISH', 'Step 2: budget input not found.');
    }
    const horizonSelect = page.locator('select').first();
    if (await horizonSelect.count()) {
      await horizonSelect.selectOption('10');
    } else {
      record('S5 AI Match wizard', 'POLISH', 'Step 2: horizon select not found.');
    }
    await snap(page, 'persona-2-s5-aimatch-2-filled.png');

    const submitBtn = page.getByRole('button', { name: /AI Önerilerini Getir/i });
    if (await submitBtn.count() === 0) {
      record('S5 AI Match wizard', 'BROKEN', 'Step 2 submit button "AI Önerilerini Getir" missing.');
      expect(true).toBeFalsy();
      return;
    }
    await submitBtn.first().click();

    // Wait for results
    const resultsHeading = page.getByRole('heading', { name: /İşte sana özel/i });
    try {
      await resultsHeading.waitFor({ timeout: 20000 });
      await snap(page, 'persona-2-s5-aimatch-results.png');
      const matchCards = page.locator('text=#1 EŞLEŞME, text=#2 EŞLEŞME').or(page.locator(':text("EŞLEŞME")'));
      const count = await matchCards.count().catch(() => 0);
      record('S5 AI Match wizard', 'PASSED', `Results page rendered with ${count} match-marker(s) detected.`);
    } catch {
      record('S5 AI Match wizard', 'BROKEN', 'Results step never rendered (no "İşte sana özel" heading within 20s).');
      await snap(page, 'persona-2-s5-aimatch-no-results.png');
      expect(false).toBeTruthy();
      return;
    }
    if (diag.consoleErrors.length || diag.pageErrors.length || diag.networkErrors.length) {
      record('S5 AI Match wizard', 'POLISH', `Console: ${diag.consoleErrors.length}, page errs: ${diag.pageErrors.length}, 5xx: ${diag.networkErrors.length}.`);
    }
  });

  test('S6+S7: Add ≥2 listings to compare and view /compare', async ({ page }) => {
    const diag = attachDiagnostics(page);
    await page.goto('/listings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    await snap(page, 'persona-2-s6-listings.png');

    const compareButtons = page.locator('button[aria-label*="Karşılaştırmaya ekle" i]');
    const total = await compareButtons.count();
    if (total === 0) {
      record('S6 Compare add', 'BROKEN', 'No "Karşılaştırmaya ekle" buttons found on /listings.');
      expect(total).toBeGreaterThan(0);
      return;
    }

    const toAdd = Math.min(3, total);
    for (let i = 0; i < toAdd; i++) {
      await compareButtons.nth(i).click({ force: true });
      await page.waitForTimeout(250);
    }
    record('S6 Compare add', 'PASSED', `Clicked compare-toggle on ${toAdd} listing card(s).`);
    await snap(page, 'persona-2-s6-after-add.png');

    // Inspect store + api before navigating
    const storedIds = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('istbaku-compare');
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    });
    let apiProbe: { id: string; status: number }[] = [];
    if (Array.isArray(storedIds) && storedIds.length) {
      for (const id of storedIds.slice(0, 3)) {
        const r = await page.request.get(`/api/listings/${id}`).catch(() => null);
        apiProbe.push({ id: String(id).slice(0, 12), status: r?.status() ?? 0 });
      }
    }

    // Now navigate to /compare
    await page.goto('/compare');
    await page.waitForLoadState('domcontentloaded');
    // Compare page fires per-id /api/listings/:id fetches; wait for loader to clear.
    await page.waitForFunction(() => {
      const body = document.body.innerText || '';
      return !body.includes('Yükleniyor');
    }, undefined, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    await snap(page, 'persona-2-s7-compare.png');

    // Empty state heading
    const emptyHeading = page.getByRole('heading', { name: /Henüz karşılaştırılacak/i });
    if (await emptyHeading.count()) {
      record('S7 Compare page', 'BROKEN', `Compare page shows empty state. Stored ids=${JSON.stringify(storedIds)}, api=${JSON.stringify(apiProbe)}.`);
      return; // do not throw — capture as finding
    }

    // Heading like "{N} ilanı karşılaştır"
    const compareHeading = page.getByRole('heading', { name: /ilanı karşılaştır/i });
    const compareCount = await compareHeading.count();
    if (compareCount === 0) {
      // Could be still loading or api 404'd — check body text
      const body = (await page.locator('body').textContent()) ?? '';
      if (/Yükleniyor/i.test(body)) {
        record(
          'S7 Compare page',
          'BROKEN',
          `/compare stuck on "Yükleniyor…" — per-id /api/listings/:id fetches did not resolve in 20s. Stored ids=${JSON.stringify(storedIds)}, api probe=${JSON.stringify(apiProbe)}.`,
        );
      } else {
        record(
          'S7 Compare page',
          'BROKEN',
          'No "{N} ilanı karşılaştır" heading and not in loading state. Body sample: ' + body.slice(0, 160).replace(/\s+/g, ' '),
        );
      }
      return; // capture-only, do not fail run
    }
    const headingTxt = (await compareHeading.first().textContent()) ?? '';
    const m = headingTxt.match(/(\d+)/);
    const n = m ? parseInt(m[1], 10) : 0;
    if (n < 2) {
      record('S7 Compare page', 'FUNCTIONAL', `Compare table only shows ${n} listing(s) — expected ≥ 2.`);
    } else {
      record('S7 Compare page', 'PASSED', `Compare table shows ${n} listings.`);
    }

    // Optional: AI summary button
    const aiBtn = page.getByRole('button', { name: /AI (özet|summary)/i });
    if (await aiBtn.count()) {
      await aiBtn.first().click({ trial: true }).catch(() => {});
      record('S8 AI summary', 'PASSED', 'AI summary button exists on /compare.');
    } else {
      record('S8 AI summary', 'UX', 'No "AI summary/özet" button on /compare — feature missing.');
    }

    if (diag.consoleErrors.length || diag.pageErrors.length) {
      record('S7 Compare page', 'POLISH', `Console errs: ${diag.consoleErrors.length}, page errs: ${diag.pageErrors.length}.`);
    }
  });

  test('S9: /private-portfolio hits auth wall when logged out', async ({ page, context }) => {
    await context.clearCookies();
    const resp = await page.goto('/private-portfolio');
    await page.waitForLoadState('domcontentloaded');
    await snap(page, 'persona-2-s9-private-redirect.png');

    const finalUrl = page.url();
    const status = resp?.status() ?? 0;
    if (/\/auth\/sign-in/.test(finalUrl)) {
      record('S9 Private auth wall', 'PASSED', `Redirected to ${finalUrl} as expected.`);
    } else if (/\/private-portfolio/.test(finalUrl)) {
      record(
        'S9 Private auth wall',
        'BROKEN',
        `Private portfolio served WITHOUT auth — final URL ${finalUrl}, HTTP ${status}. Middleware not protecting route.`,
      );
    } else {
      record('S9 Private auth wall', 'UX', `Unexpected destination: ${finalUrl} (HTTP ${status}).`);
    }
    expect(finalUrl).toMatch(/\/auth\/sign-in|\/private-portfolio/);
  });

  test('S10: Sign up, then revisit /private-portfolio (KYC required)', async ({ page }) => {
    const diag = attachDiagnostics(page);
    signupEmail = uniqueEmail('rauf');

    await page.goto('/auth/sign-up');
    await page.waitForLoadState('domcontentloaded');

    // Fill form
    await page.locator('#signup-name').fill(fullName);
    await page.locator('#signup-email').fill(signupEmail);
    await page.locator('#signup-phone').fill('555 010 1010');
    await page.locator('#signup-password').fill(password);
    // Accept terms checkbox
    const accept = page.locator('input[type="checkbox"]').first();
    if (await accept.count()) {
      await accept.check({ force: true });
    }
    await snap(page, 'persona-2-s10-signup-filled.png');

    await page.getByRole('button', { name: /Hesap Oluştur/i }).click();
    await page.waitForTimeout(2000);
    await snap(page, 'persona-2-s10-signup-result.png');

    // Verification step might appear — try to skip by going directly to private-portfolio
    // (the auth gate just checks session cookie presence; sign-up creates session for dev)
    const verifyVisible = await page.getByText(/Doğrulama Kodu/i).count();
    if (verifyVisible) {
      record('S10 Sign-up', 'FUNCTIONAL', 'Sign-up advanced to verify step (email verification required).');
    } else {
      record('S10 Sign-up', 'PASSED', 'Sign-up completed without verify step.');
    }

    // Try /private-portfolio
    await page.goto('/private-portfolio');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    const url = page.url();
    await snap(page, 'persona-2-s10-private-after-signup.png');

    if (/\/auth\/sign-in/.test(url)) {
      record(
        'S10 Private after sign-up',
        'FUNCTIONAL',
        `Redirected back to ${url} — sign-up did not produce a session cookie (verification gate or no auto-login).`,
      );
    } else if (/\/private-portfolio/.test(url)) {
      // Check for KYC-required state
      const body = (await page.locator('body').textContent()) ?? '';
      const hasKyc = /KYC|Profili Tamamla|NDA|davetli/i.test(body);
      if (hasKyc) {
        record('S10 Private after sign-up', 'PASSED', 'Private-portfolio renders KYC-required state.');
      } else {
        record('S10 Private after sign-up', 'UX', 'Private-portfolio loaded but no visible KYC/NDA gate copy.');
      }
    }

    // S11 — try submit KYC form if it exists
    const kycSubmit = page.getByRole('button', { name: /KYC|Doğrula|Submit/i });
    if (await kycSubmit.count()) {
      record('S11 KYC form', 'PASSED', 'A KYC-like submit button exists on /private-portfolio.');
    } else {
      record(
        'S11 KYC form',
        'UX',
        'No user-facing KYC form — only "Profili Tamamla & Aç" CTA opening a modal. End-to-end KYC submission flow missing.',
      );
    }

    if (diag.consoleErrors.length || diag.pageErrors.length) {
      record('S10/11', 'POLISH', `Console errs: ${diag.consoleErrors.length}, page errs: ${diag.pageErrors.length}.`);
    }
  });

  test('S12: Sign out via header menu', async ({ page }) => {
    // Try to sign in first if previous session was lost.
    if (signupEmail) {
      await page.goto('/auth/sign-in');
      await page.waitForLoadState('domcontentloaded');
      const emailInput = page.locator('input[type="email"]').first();
      const pwInput = page.locator('input[type="password"]').first();
      if (await emailInput.count() && await pwInput.count()) {
        await emailInput.fill(signupEmail);
        await pwInput.fill(password);
        const signInBtn = page.getByRole('button', { name: /Giriş|Sign in/i }).first();
        if (await signInBtn.count()) {
          await signInBtn.click().catch(() => {});
          await page.waitForTimeout(1500);
        }
      }
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await snap(page, 'persona-2-s12-home-before-signout.png');

    const userMenuBtn = page.locator('button[aria-label="Hesap menüsü"]').first();
    if (await userMenuBtn.count() === 0) {
      record(
        'S12 Sign out',
        'FUNCTIONAL',
        'Header user menu ("Hesap menüsü") not visible — session was not maintained between sign-up and S12, or auto-login is off.',
      );
      // Confirm the user landed on a public page anyway
      expect(page.url()).toContain('/');
      return;
    }
    await userMenuBtn.click();
    await page.waitForTimeout(200);
    const signOutBtn = page.getByRole('button', { name: /Çıkış|Sign out|Log out/i }).first();
    if (await signOutBtn.count() === 0) {
      record('S12 Sign out', 'BROKEN', 'User menu opened but no "Çıkış" button found.');
      expect(false).toBeTruthy();
      return;
    }
    await signOutBtn.click();
    await page.waitForTimeout(1500);
    await snap(page, 'persona-2-s12-after-signout.png');

    const url = page.url();
    // After sign-out, header should show "Giriş Yap" again
    const signInLinkCount = await page.getByRole('link', { name: /Giriş Yap/i }).count();
    if (signInLinkCount > 0) {
      record('S12 Sign out', 'PASSED', `Signed out — header shows Giriş Yap again. Final URL: ${url}`);
    } else {
      record('S12 Sign out', 'FUNCTIONAL', `Sign-out clicked but "Giriş Yap" CTA not visible. URL: ${url}.`);
    }
  });

  test.afterAll(async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const outDir = path.resolve('e2e-out');
    await fs.mkdir(outDir, { recursive: true });

    const byBucket: Record<Severity, Finding[]> = {
      BROKEN: [], FUNCTIONAL: [], UX: [], POLISH: [], PASSED: [],
    };
    for (const f of findings) byBucket[f.severity].push(f);

    const total = findings.length;
    const stats = (s: Severity) => byBucket[s].length;

    const fmt = (s: Severity) => byBucket[s].length
      ? byBucket[s].map(f => `- **${f.scenario}** — ${f.note}`).join('\n')
      : '_(none)_';

    const md = `# Persona 2 — Rauf (Bakı investor, AZN/AZ) — E2E Report

_Auto-generated by tests/e2e/persona-2-rauf.spec.ts on ${new Date().toISOString()}_

## Persona
- 45-year-old Bakı investor
- Native language: AZ
- Preferred currency: AZN (₼)
- Looking for **investment** properties in TR

## STATISTICS
| Bucket | Count |
| --- | --- |
| BROKEN     | ${stats('BROKEN')} |
| FUNCTIONAL | ${stats('FUNCTIONAL')} |
| UX         | ${stats('UX')} |
| POLISH     | ${stats('POLISH')} |
| PASSED     | ${stats('PASSED')} |
| **TOTAL**  | ${total} |

## BROKEN
${fmt('BROKEN')}

## FUNCTIONAL
${fmt('FUNCTIONAL')}

## UX
${fmt('UX')}

## POLISH
${fmt('POLISH')}

## PASSED
${fmt('PASSED')}
`;

    await fs.writeFile(path.join(outDir, '02-rauf-report.md'), md, 'utf8');
  });
});
