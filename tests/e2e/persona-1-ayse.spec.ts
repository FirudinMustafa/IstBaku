import { test, expect, Page } from '@playwright/test';
import { attachDiagnostics, snap, uniqueEmail } from './helpers';

// Persona 1 — Ayşe, 32 TR professional, looking for 2+1 in Beşiktaş, budget 8M TL (~250k USD).
// Note: filter price-range in the app is USD-denominated, so the 8M TL budget is mapped to ~250000 USD.

const findings: Array<{ id: string; severity: 'BROKEN' | 'FUNCTIONAL' | 'UX' | 'POLISH'; title: string; details: Record<string, string> }> = [];
const passedSteps: string[] = [];

function recordFinding(severity: 'BROKEN' | 'FUNCTIONAL' | 'UX' | 'POLISH', title: string, details: Record<string, string>) {
  const idx = findings.filter((f) => f.severity === severity).length + 1;
  const prefix = severity === 'BROKEN' ? 'B' : severity === 'FUNCTIONAL' ? 'F' : severity === 'UX' ? 'U' : 'P';
  findings.push({ id: `${prefix}${String(idx).padStart(3, '0')}`, severity, title, details });
}

async function safe(page: Page, name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passedSteps.push(name);
  } catch (err) {
    const msg = (err as Error).message?.split('\n')[0] ?? String(err);
    recordFinding('BROKEN', name, {
      URL: page.url(),
      Action: name,
      Expected: 'Step succeeds without error',
      Actual: `Error: ${msg}`,
      Screenshot: `e2e-out/screenshots/persona-1-${name}-FAIL.png`,
    });
    await snap(page, `persona-1-${name}-FAIL.png`);
  }
}

test.describe('Persona 1 — Ayşe', () => {
  test('Ayşe finds a 2+1 in Beşiktaş, explores listings, signs up', async ({ page }) => {
    test.setTimeout(180_000);
    const diag = attachDiagnostics(page);

    // ----------------------------------------------------------------------
    // Step 1: Homepage load, scroll, hero search visible
    // ----------------------------------------------------------------------
    await safe(page, 'step1-homepage-load', async () => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      // Hero search input
      const heroInput = page.locator('input[name="q"]').first();
      await expect(heroInput).toBeVisible({ timeout: 10_000 });
      // Scroll a little
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(400);
      await page.mouse.wheel(0, -800);
      await snap(page, 'persona-1-step1-homepage.png');
    });

    // ----------------------------------------------------------------------
    // Step 2: Hero search → "Beşiktaş 2+1" → submit → /listings
    // ----------------------------------------------------------------------
    await safe(page, 'step2-hero-search', async () => {
      const heroInput = page.locator('input[name="q"]').first();
      await heroInput.fill('Beşiktaş 2+1');
      await snap(page, 'persona-1-step2-typed.png');
      // submit the surrounding form
      await heroInput.press('Enter');
      await page.waitForURL(/\/listings/, { timeout: 15_000 });
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/listings\?q=/);
      // ensure heading rendered
      await expect(page.getByRole('heading', { name: /Tüm İlanlar/i })).toBeVisible({ timeout: 10_000 });
      await snap(page, 'persona-1-step2-listings.png');
    });

    // ----------------------------------------------------------------------
    // Step 3: Sidebar filters — TR → İstanbul → Beşiktaş, type Konut, price 0–250000 USD (~8M TL), rooms 2+1
    // ----------------------------------------------------------------------
    await safe(page, 'step3-sidebar-filters', async () => {
      // clear the q chip influence: search field has the prior query; leave it.
      // Country chip
      const trChip = page.getByRole('button', { name: /Türkiye/i }).first();
      await expect(trChip).toBeVisible({ timeout: 10_000 });
      await trChip.click();

      // City select appears after country
      const citySelect = page.locator('aside select').first();
      await expect(citySelect).toBeVisible({ timeout: 10_000 });
      await citySelect.selectOption({ label: 'İstanbul' });

      // District select appears after city
      const districtSelect = page.locator('aside select').nth(1);
      await expect(districtSelect).toBeVisible({ timeout: 10_000 });
      await districtSelect.selectOption({ label: 'Beşiktaş' });

      // Property type chip — Konut (avoid Lüks Konut)
      const konutChip = page.getByRole('button', { name: /^Konut$/ }).first();
      await expect(konutChip).toBeVisible({ timeout: 10_000 });
      await konutChip.click();

      // Price range — using USD inputs (max ~250k USD ≈ 8M TL)
      const minPrice = page.getByLabel('Minimum fiyat (USD)');
      const maxPrice = page.getByLabel('Maksimum fiyat (USD)');
      await minPrice.fill('0');
      await maxPrice.fill('250000');

      // Rooms — open the section first (it's collapsed by default)
      const roomsHeader = page.getByRole('button', { name: /Oda Sayısı/i }).first();
      await roomsHeader.click();
      const roomChip = page.getByRole('button', { name: /^2\+1$/ }).first();
      await expect(roomChip).toBeVisible({ timeout: 10_000 });
      await roomChip.click();

      // Filters apply live — wait a tick for results to recompute
      await page.waitForTimeout(700);
      await snap(page, 'persona-1-step3-filtered.png');

      // Read result-count text
      const counter = page.locator('text=/sonuç/').first();
      if (await counter.count()) {
        const txt = (await counter.textContent()) ?? '';
        if (/^0\s*sonuç/.test(txt.trim())) {
          recordFinding('FUNCTIONAL', 'Filter for 2+1 Beşiktaş Konut <250k USD returned 0 results', {
            URL: page.url(),
            Action: 'Apply sidebar filters: TR / İstanbul / Beşiktaş / Konut / 0–250000 USD / 2+1',
            Expected: 'At least one matching listing',
            Actual: `Counter says "${txt.trim()}"`,
            'Suspected cause': 'Seeded dataset may not contain matching properties at this price; or USD vs TL price-axis mismatch with persona budget',
            'Suggested fix': 'Verify seed data in lib/data/* — ensure Beşiktaş 2+1 fixtures under 250k USD exist',
          });
        }
      }
    });

    // ----------------------------------------------------------------------
    // Step 4: Switch to map view, then back to list
    // ----------------------------------------------------------------------
    await safe(page, 'step4-map-toggle', async () => {
      const mapToggle = page.getByRole('button', { name: /^Harita$/ }).first();
      await expect(mapToggle).toBeVisible({ timeout: 10_000 });
      await mapToggle.click();
      await page.waitForTimeout(700);
      await snap(page, 'persona-1-step4-map.png');

      const listToggle = page.getByRole('button', { name: /^Liste$/ }).first();
      await expect(listToggle).toBeVisible({ timeout: 10_000 });
      await listToggle.click();
      await page.waitForTimeout(500);
      await snap(page, 'persona-1-step4-list.png');
    });

    // ----------------------------------------------------------------------
    // Step 5: Click first listing → property detail loads
    // ----------------------------------------------------------------------
    await safe(page, 'step5-open-first-listing', async () => {
      // Try first detail link
      const firstCard = page.locator('a[href^="/property/"]').first();
      const count = await firstCard.count();
      if (count === 0) {
        // relax all filters to make sure something is visible
        const reset = page.getByRole('button', { name: /Sıfırla/i }).first();
        if (await reset.count()) await reset.click();
        await page.waitForTimeout(700);
      }
      const card = page.locator('a[href^="/property/"]').first();
      await expect(card).toBeVisible({ timeout: 10_000 });
      const href = await card.getAttribute('href');
      await Promise.all([
        page.waitForURL(/\/property\//, { timeout: 15_000 }),
        card.click(),
      ]);
      await page.waitForLoadState('domcontentloaded');
      // detail H1
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
      await snap(page, 'persona-1-step5-detail.png');
      if (!href) throw new Error('first card had no href');
    });

    // ----------------------------------------------------------------------
    // Step 6: Gallery — click thumbnails, verify lightbox / main image swap
    // ----------------------------------------------------------------------
    await safe(page, 'step6-gallery', async () => {
      // Desktop gallery uses buttons "Foto N" — click 3 of them (these open the lightbox).
      const thumb2 = page.getByRole('button', { name: /^Foto 2$/ }).first();
      await expect(thumb2).toBeVisible({ timeout: 10_000 });
      await thumb2.click();
      // lightbox open
      const lightbox = page.getByRole('dialog', { name: /Galeri/i });
      await expect(lightbox).toBeVisible({ timeout: 10_000 });
      await snap(page, 'persona-1-step6a-lightbox.png');
      // navigate inside via right-arrow buttons
      const next = lightbox.getByRole('button', { name: /Sonraki/i }).first();
      if (await next.count()) {
        await next.click();
        await page.waitForTimeout(250);
        await next.click();
        await page.waitForTimeout(250);
      }
      await snap(page, 'persona-1-step6b-lightbox-advance.png');
      // close lightbox
      const close = lightbox.getByRole('button', { name: /Kapat/i }).first();
      await close.click();
      await page.waitForTimeout(300);
    });

    // ----------------------------------------------------------------------
    // Step 7: AI score expandable
    // ----------------------------------------------------------------------
    await safe(page, 'step7-ai-score', async () => {
      const aiToggle = page.getByRole('button', { name: /Skor nasıl hesaplandı/i }).first();
      await expect(aiToggle).toBeVisible({ timeout: 10_000 });
      // It starts open in code; toggle once to confirm interactivity, then re-open.
      await aiToggle.click();
      await page.waitForTimeout(300);
      await aiToggle.click();
      await page.waitForTimeout(300);
      // After re-opening expect Konum puanı row to be visible
      await expect(page.getByText('Konum puanı')).toBeVisible({ timeout: 5_000 });
      await snap(page, 'persona-1-step7-aiscore.png');
    });

    // ----------------------------------------------------------------------
    // Step 8: Mortgage calculator — change peşinat & vade → monthly text updates
    // ----------------------------------------------------------------------
    await safe(page, 'step8-mortgage', async () => {
      // Find heading and scroll into view
      const heading = page.getByRole('heading', { name: /Hızlı kredi hesaplama/i });
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible({ timeout: 10_000 });

      // Capture monthly value before
      const monthlyRow = page.locator('text=/Tahmini aylık taksit/').first();
      await expect(monthlyRow).toBeVisible({ timeout: 5_000 });
      const before = await monthlyRow.locator('..').textContent();

      // Locate the 3 sliders in the QuickMortgage card.
      // Use the card container scoped to its heading
      const card = page.locator('section, div').filter({ has: heading }).first();
      const sliders = card.locator('input[type="range"]');
      const sliderCount = await sliders.count();
      if (sliderCount < 2) throw new Error(`Expected at least 2 sliders, got ${sliderCount}`);

      // Peşinat — slide to ~60%
      const pesinat = sliders.nth(0);
      await pesinat.focus();
      // Use keyboard to nudge significantly
      for (let i = 0; i < 12; i++) await pesinat.press('ArrowRight');

      // Vade — nudge down
      const vade = sliders.nth(1);
      await vade.focus();
      for (let i = 0; i < 8; i++) await vade.press('ArrowLeft');

      await page.waitForTimeout(300);
      const after = await monthlyRow.locator('..').textContent();
      await snap(page, 'persona-1-step8-mortgage.png');
      if (before === after) {
        recordFinding('FUNCTIONAL', 'Mortgage monthly value did not change after slider input', {
          URL: page.url(),
          Action: 'Move peşinat slider 12 steps right; vade slider 8 steps left',
          Expected: 'Tahmini aylık taksit text changes',
          Actual: 'Same text before/after',
          'Suspected cause': 'components/listings/QuickMortgage.tsx slider→state binding',
          'Suggested fix': 'Verify onChange wires to state setters; check accent-gold-400 range styling does not block input events',
        });
      }
    });

    // ----------------------------------------------------------------------
    // Step 9: Favorilere ekle without login → toast / redirect
    // ----------------------------------------------------------------------
    await safe(page, 'step9-favorite-anon', async () => {
      // Use the header Favori button (desktop)
      const favBtn = page.getByRole('button', { name: /^Favori$/ }).first();
      await expect(favBtn).toBeVisible({ timeout: 10_000 });
      await favBtn.click();
      await page.waitForTimeout(800);
      // Expect a toast "Giriş yapmalısın"
      const toast = page.locator('text=/Giriş yapmalısın/i').first();
      const visible = await toast.isVisible().catch(() => false);
      await snap(page, 'persona-1-step9-fav-anon.png');
      if (!visible) {
        // not necessarily broken — could redirect to sign-in instead
        if (!/auth\/sign-in/.test(page.url())) {
          recordFinding('UX', 'Anonymous favorite click had no visible feedback', {
            URL: page.url(),
            Action: 'Click Favori button while signed out',
            Expected: 'Toast asking to sign in, or redirect to /auth/sign-in',
            Actual: 'No toast and no redirect',
            'Suspected cause': 'components/listings/PropertyHeaderActions.tsx → favorites.toggle return value',
            'Suggested fix': 'Ensure useFavorites().toggle returns ok=false when signed out; verify Toast provider mounted',
          });
        }
      }
    });

    // ----------------------------------------------------------------------
    // Step 10: Sign up
    // ----------------------------------------------------------------------
    const ayseEmail = uniqueEmail('ayse');
    await safe(page, 'step10-signup', async () => {
      await page.goto('/auth/sign-up');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.getByRole('heading')).toBeVisible({ timeout: 10_000 });

      await page.locator('#signup-name').fill('Ayşe Demir');
      await page.locator('#signup-email').fill(ayseEmail);
      // phone — pick TR dial by default (already TR per form initial state)
      await page.locator('#signup-phone').fill('5551112233');
      await page.locator('#signup-password').fill('Test12345!');

      // Accept terms
      const accept = page.locator('input[type="checkbox"]').first();
      await accept.check();
      await snap(page, 'persona-1-step10a-form.png');

      const submit = page.getByRole('button', { name: /Hesap Oluştur/i });
      await submit.click();

      // Either error toast, or step==='verify' (with the verify input visible)
      // Wait for one of those signals.
      await Promise.race([
        page.waitForSelector('#signup-code', { timeout: 15_000 }).catch(() => null),
        page.waitForSelector('text=/doğrulama kodu/i', { timeout: 15_000 }).catch(() => null),
        page.waitForSelector('[role="alert"]', { timeout: 15_000 }).catch(() => null),
      ]);
      await snap(page, 'persona-1-step10b-after-submit.png');
    });

    // ----------------------------------------------------------------------
    // Step 11: Verify page reached → screenshot
    // ----------------------------------------------------------------------
    await safe(page, 'step11-verify-screen', async () => {
      const verifyInput = page.locator('#signup-code');
      const isVerify = await verifyInput.isVisible().catch(() => false);
      if (!isVerify) {
        // Look for any alert with the server-side error to record it
        const alert = page.locator('[role="alert"]').first();
        const alertText = await alert.textContent().catch(() => null);
        recordFinding('BROKEN', 'Sign-up did not reach verify step', {
          URL: page.url(),
          Action: `Submit sign-up form for ${ayseEmail}`,
          Expected: '6-digit code prompt (verify step) renders',
          Actual: `Verify input not visible. Alert text: "${alertText ?? '(none)'}"`,
          'Suspected cause': 'lib/auth-actions.ts → signUpAction; lib/schemas.ts → signUpSchema (phone format with leading space?)',
          'Suggested fix': 'Check signUpAction logs in dev server; verify Drizzle migrations ran; confirm phone schema accepts "5551112233"',
          Screenshot: 'e2e-out/screenshots/persona-1-step11-no-verify.png',
        });
        await snap(page, 'persona-1-step11-no-verify.png');
      } else {
        await snap(page, 'persona-1-step11-verify.png');
        // We cannot bypass verification — that's expected.
      }
    });

    // ----------------------------------------------------------------------
    // Step 12: /messages — requires auth, should redirect to sign-in
    // ----------------------------------------------------------------------
    await safe(page, 'step12-messages-anon', async () => {
      await page.goto('/messages');
      await page.waitForLoadState('domcontentloaded');
      // Either /auth/sign-in?next=/messages or messages page with empty state
      const url = page.url();
      await snap(page, 'persona-1-step12-messages.png');
      if (/auth\/sign-in/.test(url)) {
        // Expected — un-verified user is not logged in.
        await expect(page).toHaveURL(/auth\/sign-in/, { timeout: 5_000 });
      } else if (/\/messages/.test(url)) {
        // signed in already? assert some empty state UI
        const empty = page.locator('text=/mesaj/i').first();
        await expect(empty).toBeVisible({ timeout: 5_000 });
      } else {
        recordFinding('FUNCTIONAL', '/messages did not redirect anon user to sign-in', {
          URL: url,
          Action: 'Visit /messages while signed out',
          Expected: 'Redirect to /auth/sign-in?next=/messages',
          Actual: `URL is ${url}`,
          'Suspected cause': 'app/messages/page.tsx getCurrentUser/redirect',
          'Suggested fix': 'Confirm middleware/session cookie handling',
        });
      }
    });

    // ----------------------------------------------------------------------
    // End — record console / page errors as notes (do not fail)
    // ----------------------------------------------------------------------
    if (diag.consoleErrors.length || diag.pageErrors.length || diag.networkErrors.length) {
      recordFinding('POLISH', 'Console/page/network noise during run', {
        URL: page.url(),
        Action: 'End-of-test diagnostic dump',
        Expected: '0 console errors, 0 page errors, 0 5xx responses',
        Actual: `console=${diag.consoleErrors.length} pageerr=${diag.pageErrors.length} net5xx=${diag.networkErrors.length}`,
        Console: [
          ...diag.consoleErrors.slice(0, 6),
          ...diag.pageErrors.slice(0, 6),
          ...diag.networkErrors.slice(0, 6),
        ].join(' | '),
      });
    }
  });

  test.afterAll(async () => {
    // Persist the report data so the spec run produces a digestible artifact even on partial failure.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const outDir = path.resolve('e2e-out');
    await fs.mkdir(outDir, { recursive: true });

    const broken = findings.filter((f) => f.severity === 'BROKEN');
    const functional = findings.filter((f) => f.severity === 'FUNCTIONAL');
    const ux = findings.filter((f) => f.severity === 'UX');
    const polish = findings.filter((f) => f.severity === 'POLISH');

    function block(emoji: string, label: string, items: typeof findings) {
      if (items.length === 0) return `## ${emoji} ${label}\n_None._\n`;
      return `## ${emoji} ${label}\n${items.map((f) => {
        const lines = [`### #${f.id} — ${f.title}`];
        for (const [k, v] of Object.entries(f.details)) lines.push(`**${k}:** ${v}`);
        return lines.join('\n');
      }).join('\n\n')}\n`;
    }

    const totalSteps = 12;
    const failed = broken.length;
    const passed = totalSteps - failed;

    const md =
`# Persona 1 — Ayşe Report
**Date:** 2026-05-17
**Browser:** Chromium desktop
**Total scenarios run:** ${totalSteps}
**Passed:** ${passed}
**Failed:** ${failed}

${block('🔴', 'BROKEN', broken)}
${block('🟠', 'FUNCTIONAL', functional)}
${block('🟡', 'UX', ux)}
${block('🟢', 'POLISH', polish)}

## ✅ PASSED
${passedSteps.length ? passedSteps.map((s) => `- ${s}`).join('\n') : '_None._'}

## 📊 STATISTICS
- Findings: ${findings.length} (BROKEN ${broken.length} / FUNCTIONAL ${functional.length} / UX ${ux.length} / POLISH ${polish.length})
- Steps passed: ${passedSteps.length}/${totalSteps}
- Screenshots written under e2e-out/screenshots/persona-1-*
`;
    await fs.writeFile(path.join(outDir, '01-ayse-report.md'), md, 'utf8');
  });
});
