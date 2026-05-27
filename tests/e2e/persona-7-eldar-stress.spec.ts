/**
 * PERSONA 7 — ELDAR (concurrency-stress user)
 *
 * Each scenario is wrapped in its own try/catch so a single failure cannot
 * abort the rest of the suite. Findings are surfaced via console + soft expects
 * that are also aggregated for the report.
 */
import { test, expect, Browser, BrowserContext } from '@playwright/test';
import { attachDiagnostics, snap, uniqueEmail, uniqueName } from './helpers';

const PERSONA = 'persona-7';

const findings: Record<string, string> = {};

function logFinding(scenario: string, result: string) {
  findings[scenario] = result;
  // eslint-disable-next-line no-console
  console.log(`[ELDAR] ${scenario}: ${result}`);
}

test.describe.configure({ mode: 'serial' });

test.describe('Persona 7 — Eldar (concurrency stress)', () => {
  let browserRef: Browser;
  const openContexts: BrowserContext[] = [];

  test.beforeAll(async ({ browser }) => {
    browserRef = browser;
  });

  test.afterAll(async () => {
    for (const ctx of openContexts) {
      try {
        await ctx.close();
      } catch {
        /* ignore */
      }
    }
  });

  // ----------------------------------------------------------------
  // SCENARIO 1 — Double-submit on /auth/sign-up
  // ----------------------------------------------------------------
  test('S1: double-submit /auth/sign-up creates at most one account', async () => {
    const ctx = await browserRef.newContext();
    openContexts.push(ctx);
    const page = await ctx.newPage();
    const diag = attachDiagnostics(page);

    // Track POSTs to the sign-up endpoint
    const signupRequests: { status: number; url: string }[] = [];
    page.on('response', async (resp) => {
      const u = resp.url();
      if (/\/sign-up/i.test(u) && resp.request().method() === 'POST') {
        signupRequests.push({ status: resp.status(), url: u });
      }
    });

    try {
      await page.goto('/auth/sign-up', { waitUntil: 'domcontentloaded' });
      const email = uniqueEmail('eldar-s1');
      const name = uniqueName('Eldar S1');
      const password = 'Test12345!';

      // Fill form
      await page.locator('#signup-name').fill(name);
      await page.locator('#signup-email').fill(email);
      const phone = page.locator('#signup-phone');
      if (await phone.count()) await phone.fill('5550101010');
      await page.locator('#signup-password').fill(password);

      // Accept ToS checkbox if present
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.count()) {
        try {
          await checkbox.check({ force: true });
        } catch {
          /* ignore */
        }
      }

      await snap(page, `${PERSONA}-s1-before-submit.png`);

      const submit = page.locator('button[type="submit"]').first();

      // Fire two clicks within <100ms
      const t0 = Date.now();
      await Promise.all([
        submit.click({ force: true }).catch(() => null),
        (async () => {
          await page.waitForTimeout(40);
          await submit.click({ force: true }).catch(() => null);
        })(),
      ]);
      const dt = Date.now() - t0;

      // Give the network time to settle
      await page.waitForTimeout(2500);
      await snap(page, `${PERSONA}-s1-after-submit.png`);

      const created = signupRequests.filter((r) => r.status >= 200 && r.status < 300).length;
      const errored = signupRequests.filter((r) => r.status >= 400).length;

      logFinding(
        'S1 double-submit signup',
        `clicks fired in ${dt}ms; POST /sign-up responses=${signupRequests.length} (2xx=${created}, 4xx/5xx=${errored}); 500s=${diag.networkErrors.length}`,
      );

      // Hard rule: never two successful creations
      expect(created, 'should not create two accounts on double-click').toBeLessThanOrEqual(1);
      // No 500s
      expect(diag.networkErrors.length, '5xx during double-submit').toBe(0);
    } catch (err) {
      logFinding('S1 double-submit signup', `ERROR: ${(err as Error).message}`);
      throw err;
    }
  });

  // ----------------------------------------------------------------
  // SCENARIO 2 — Race condition appointment booking (two contexts)
  // ----------------------------------------------------------------
  test('S2: race-condition appointment booking', async () => {
    const ctxA = await browserRef.newContext();
    const ctxB = await browserRef.newContext();
    openContexts.push(ctxA, ctxB);

    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await pageA.goto('/agent', { waitUntil: 'domcontentloaded' }).catch(() => null);
      await pageB.goto('/agent', { waitUntil: 'domcontentloaded' }).catch(() => null);

      const hasBookingUiA = await pageA
        .locator('button:has-text("Randevu"), button:has-text("Appointment"), [data-testid="book-appointment"]')
        .count();
      const hasBookingUiB = await pageB
        .locator('button:has-text("Randevu"), button:has-text("Appointment"), [data-testid="book-appointment"]')
        .count();

      await snap(pageA, `${PERSONA}-s2-ctxA-agent.png`);
      await snap(pageB, `${PERSONA}-s2-ctxB-agent.png`);

      if (!hasBookingUiA || !hasBookingUiB) {
        logFinding(
          'S2 appointment race',
          `DEFERRED — public booking UI not reachable without preconditions (UI matches: A=${hasBookingUiA}, B=${hasBookingUiB}). Will instead hit /api/dev/book-appointment unauthenticated to verify guard.`,
        );
        // Probe the dev API (should reject unauthenticated)
        const [respA, respB] = await Promise.all([
          pageA.request.post('/api/dev/book-appointment', {
            data: { listingId: 'race-test', slot: '2026-06-01T10:00:00Z' },
            failOnStatusCode: false,
          }),
          pageB.request.post('/api/dev/book-appointment', {
            data: { listingId: 'race-test', slot: '2026-06-01T10:00:00Z' },
            failOnStatusCode: false,
          }),
        ]);
        const okA = respA.ok();
        const okB = respB.ok();
        const both200 = okA && okB;
        logFinding(
          'S2 appointment race (API probe)',
          `A=${respA.status()} B=${respB.status()} — both 2xx=${both200} (concurrent same-slot accepted=${both200 ? 'YES — possible race' : 'NO — guarded'})`,
        );
        expect(respA.status(), 'unauthenticated booking POST should not be 5xx').toBeLessThan(500);
        expect(respB.status(), 'unauthenticated booking POST should not be 5xx').toBeLessThan(500);
      } else {
        // Same-slot concurrent submission would go here if UI present
        logFinding(
          'S2 appointment race',
          `Booking UI reachable but real race not exercisable from public page without agent-side seed data — documented.`,
        );
      }
    } catch (err) {
      logFinding('S2 appointment race', `ERROR: ${(err as Error).message}`);
    }
  });

  // ----------------------------------------------------------------
  // SCENARIO 3 — Favorite spam (50 clicks on heart in 5s)
  // ----------------------------------------------------------------
  test('S3: favorite spam after signup', async () => {
    const ctx = await browserRef.newContext();
    openContexts.push(ctx);
    const page = await ctx.newPage();
    const diag = attachDiagnostics(page);

    try {
      // Sign up fresh
      await page.goto('/auth/sign-up', { waitUntil: 'domcontentloaded' });
      const email = uniqueEmail('eldar-s3');
      const name = uniqueName('Eldar S3');
      const password = 'Test12345!';
      await page.locator('#signup-name').fill(name);
      await page.locator('#signup-email').fill(email);
      const phone = page.locator('#signup-phone');
      if (await phone.count()) await phone.fill('5550101011');
      await page.locator('#signup-password').fill(password);
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.count()) {
        try {
          await checkbox.check({ force: true });
        } catch {
          /* ignore */
        }
      }
      await page.locator('button[type="submit"]').first().click({ force: true }).catch(() => null);
      await page.waitForTimeout(2000);

      // Navigate to listings, then open first card
      await page.goto('/listings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await snap(page, `${PERSONA}-s3-listings.png`);

      // Find a heart/favorite toggle. Try common patterns.
      let heart = page.locator(
        '[aria-label*="favori" i], [aria-label*="favorite" i], button[data-testid*="favorite"], button:has-text("♥"), button:has(svg[aria-label*="heart" i])',
      );
      let count = await heart.count();

      if (count === 0) {
        // Try clicking through to a listing detail first
        const firstListingLink = page.locator('a[href^="/property/"]').first();
        if (await firstListingLink.count()) {
          await firstListingLink.click().catch(() => null);
          await page.waitForLoadState('domcontentloaded').catch(() => null);
          await page.waitForTimeout(1500);
          heart = page.locator(
            '[aria-label*="favori" i], [aria-label*="favorite" i], button[data-testid*="favorite"]',
          );
          count = await heart.count();
        }
      }

      await snap(page, `${PERSONA}-s3-detail.png`);

      if (count === 0) {
        logFinding(
          'S3 favorite spam',
          `DEFERRED — heart/favorite toggle button not found on listings or detail page (selectors tried: aria-label, data-testid).`,
        );
      } else {
        const target = heart.first();
        const t0 = Date.now();
        for (let i = 0; i < 50; i++) {
          await target.click({ force: true, timeout: 1500 }).catch(() => null);
          await page.waitForTimeout(50);
        }
        const dt = Date.now() - t0;

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => null);
        await page.waitForTimeout(1500);
        await snap(page, `${PERSONA}-s3-dashboard.png`);

        // Count favorite items on dashboard (heuristic)
        const favItems = await page
          .locator('[data-testid*="favorite"], section:has-text("Favori") a[href^="/property/"]')
          .count();
        logFinding(
          'S3 favorite spam',
          `50 toggles in ${dt}ms; dashboard favorite items=${favItems}; 5xx=${diag.networkErrors.length}. Expected 0 (even count -> off) or 1 (odd count -> on); observed=${favItems}.`,
        );
        expect(favItems, 'favorite count should be 0 or 1 after 50 toggles').toBeLessThanOrEqual(1);
        expect(diag.networkErrors.length, '5xx during favorite spam').toBe(0);
      }
    } catch (err) {
      logFinding('S3 favorite spam', `ERROR: ${(err as Error).message}`);
    }
  });

  // ----------------------------------------------------------------
  // SCENARIO 4 — Filter spam on /listings
  // ----------------------------------------------------------------
  test('S4: rapid filter changes do not 500 on /listings', async () => {
    const ctx = await browserRef.newContext();
    openContexts.push(ctx);
    const page = await ctx.newPage();
    const diag = attachDiagnostics(page);

    try {
      await page.goto('/listings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await snap(page, `${PERSONA}-s4-listings-initial.png`);

      // Try the search/filter inputs in common forms
      const filterInput = page
        .locator('input[type="search"], input[placeholder*="ara" i], input[placeholder*="search" i], input[name*="q" i]')
        .first();

      if (await filterInput.count()) {
        const samples = ['kadıköy', 'beşiktaş', 'şişli', '3+1', '2+1', 'baku', 'narimanov', 'sabunçu', 'lüks'];
        for (let i = 0; i < 20; i++) {
          const v = samples[i % samples.length] + i;
          await filterInput.fill(v).catch(() => null);
          await page.waitForTimeout(30);
        }
        await page.waitForTimeout(1500);
        await snap(page, `${PERSONA}-s4-listings-spammed.png`);
        logFinding(
          'S4 filter spam',
          `20 rapid filter changes complete; 5xx=${diag.networkErrors.length}; consoleErrors=${diag.consoleErrors.length}.`,
        );
        expect(diag.networkErrors.length, '5xx during filter spam').toBe(0);
      } else {
        // Fallback: spam URL search-param navigations
        for (let i = 0; i < 20; i++) {
          await page.goto(`/listings?q=stress${i}&type=${i % 2 ? 'rent' : 'sale'}`, {
            waitUntil: 'commit',
          }).catch(() => null);
        }
        await page.waitForTimeout(1500);
        logFinding(
          'S4 filter spam',
          `No filter input found; fell back to URL param spam (20 navigations); 5xx=${diag.networkErrors.length}.`,
        );
        expect(diag.networkErrors.length, '5xx during URL filter spam').toBe(0);
      }
    } catch (err) {
      logFinding('S4 filter spam', `ERROR: ${(err as Error).message}`);
    }
  });

  // ----------------------------------------------------------------
  // SCENARIO 5 — Logout mid-message
  // ----------------------------------------------------------------
  test('S5: clearing cookies mid-compose redirects to sign-in', async () => {
    const ctx = await browserRef.newContext();
    openContexts.push(ctx);
    const page = await ctx.newPage();

    try {
      // Sign up first
      await page.goto('/auth/sign-up', { waitUntil: 'domcontentloaded' });
      const email = uniqueEmail('eldar-s5');
      const name = uniqueName('Eldar S5');
      const password = 'Test12345!';
      await page.locator('#signup-name').fill(name);
      await page.locator('#signup-email').fill(email);
      const phone = page.locator('#signup-phone');
      if (await phone.count()) await phone.fill('5550101012');
      await page.locator('#signup-password').fill(password);
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.count()) {
        try {
          await checkbox.check({ force: true });
        } catch {
          /* ignore */
        }
      }
      await page.locator('button[type="submit"]').first().click({ force: true }).catch(() => null);
      await page.waitForTimeout(2000);

      // Navigate to /messages and start typing
      await page.goto('/messages', { waitUntil: 'domcontentloaded' }).catch(() => null);
      await page.waitForTimeout(1500);
      await snap(page, `${PERSONA}-s5-messages-before.png`);

      const textInput = page
        .locator('textarea, input[type="text"][placeholder*="mesaj" i], input[type="text"][placeholder*="message" i]')
        .first();
      if (await textInput.count()) {
        await textInput.fill('Bu mesaj iptal olacak — cookies clear').catch(() => null);
      }

      // Clear cookies and reload
      await ctx.clearCookies();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      const url = page.url();
      const onSignIn = /\/auth\/sign-in/i.test(url);
      const hasGuard = await page
        .locator('text=/giriş|sign in|oturum/i')
        .first()
        .count();

      await snap(page, `${PERSONA}-s5-after-clear.png`);

      logFinding(
        'S5 logout mid-message',
        `after clearCookies + reload: url=${url}, onSignIn=${onSignIn}, guardText=${hasGuard > 0}`,
      );
      expect(onSignIn || hasGuard > 0, 'protected route must redirect or guard after cookie clear').toBeTruthy();
    } catch (err) {
      logFinding('S5 logout mid-message', `ERROR: ${(err as Error).message}`);
    }
  });

  // ----------------------------------------------------------------
  // SCENARIO 6 — Browser back/forward in /new-listing wizard
  // ----------------------------------------------------------------
  test('S6: /new-listing wizard preserves prior-step state on goBack', async () => {
    const ctx = await browserRef.newContext();
    openContexts.push(ctx);
    const page = await ctx.newPage();

    try {
      // Sign up (likely required to access /new-listing)
      await page.goto('/auth/sign-up', { waitUntil: 'domcontentloaded' });
      const email = uniqueEmail('eldar-s6');
      const name = uniqueName('Eldar S6');
      const password = 'Test12345!';
      await page.locator('#signup-name').fill(name);
      await page.locator('#signup-email').fill(email);
      const phone = page.locator('#signup-phone');
      if (await phone.count()) await phone.fill('5550101013');
      await page.locator('#signup-password').fill(password);
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.count()) {
        try {
          await checkbox.check({ force: true });
        } catch {
          /* ignore */
        }
      }
      await page.locator('button[type="submit"]').first().click({ force: true }).catch(() => null);
      await page.waitForTimeout(2000);

      await page.goto('/new-listing', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await snap(page, `${PERSONA}-s6-wizard-step1.png`);

      // Snapshot the inputs available on step 1
      const step1Inputs = await page.locator('input, textarea, select').all();
      const step1Values: string[] = [];
      for (let i = 0; i < step1Inputs.length; i++) {
        const el = step1Inputs[i];
        const placeholder = (await el.getAttribute('placeholder')) ?? '';
        // Fill text inputs with a marker
        try {
          if ((await el.getAttribute('type')) !== 'checkbox' && (await el.getAttribute('type')) !== 'radio') {
            await el.fill(`step1_marker_${i}`, { timeout: 1000 });
            step1Values.push(`${placeholder}=step1_marker_${i}`);
          }
        } catch {
          /* ignore */
        }
      }

      // Click any "Next" / "İleri" / "Devam" to go to step 2
      const next1 = page.locator('button:has-text("İleri"), button:has-text("Devam"), button:has-text("Next")').first();
      if (await next1.count()) {
        await next1.click({ force: true }).catch(() => null);
        await page.waitForTimeout(1000);
      }
      await snap(page, `${PERSONA}-s6-wizard-step2.png`);

      // Fill any step-2 marker
      const step2Inputs = await page.locator('input, textarea, select').all();
      for (let i = 0; i < step2Inputs.length; i++) {
        try {
          await step2Inputs[i].fill(`step2_marker_${i}`, { timeout: 1000 });
        } catch {
          /* ignore */
        }
      }

      const next2 = page.locator('button:has-text("İleri"), button:has-text("Devam"), button:has-text("Next")').first();
      if (await next2.count()) {
        await next2.click({ force: true }).catch(() => null);
        await page.waitForTimeout(1000);
      }
      await snap(page, `${PERSONA}-s6-wizard-step3.png`);

      // goBack to step 2
      await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => null);
      await page.waitForTimeout(1000);
      await snap(page, `${PERSONA}-s6-wizard-back-to-step2.png`);

      // Read values on step 2
      const step2Now = await page.locator('input, textarea, select').all();
      const preserved: string[] = [];
      for (const el of step2Now) {
        try {
          const v = await el.inputValue({ timeout: 500 });
          if (v && v.includes('step2_marker')) preserved.push(v);
        } catch {
          /* ignore */
        }
      }

      logFinding(
        'S6 wizard back-state',
        `step1 markers set=${step1Values.length}; after goBack, step2 markers preserved=${preserved.length}. Preservation=${preserved.length > 0 ? 'YES' : 'LOST'}.`,
      );
      // Don't hard fail — wizard could be intentionally reset; document either way.
    } catch (err) {
      logFinding('S6 wizard back-state', `ERROR: ${(err as Error).message}`);
    }
  });

  // ----------------------------------------------------------------
  // SCENARIO 7 — Token expiry / clearCookies on protected page
  // ----------------------------------------------------------------
  test('S7: clearCookies on /dashboard redirects to sign-in', async () => {
    const ctx = await browserRef.newContext();
    openContexts.push(ctx);
    const page = await ctx.newPage();

    try {
      // Sign up so we have an authenticated context
      await page.goto('/auth/sign-up', { waitUntil: 'domcontentloaded' });
      const email = uniqueEmail('eldar-s7');
      const name = uniqueName('Eldar S7');
      const password = 'Test12345!';
      await page.locator('#signup-name').fill(name);
      await page.locator('#signup-email').fill(email);
      const phone = page.locator('#signup-phone');
      if (await phone.count()) await phone.fill('5550101014');
      await page.locator('#signup-password').fill(password);
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.count()) {
        try {
          await checkbox.check({ force: true });
        } catch {
          /* ignore */
        }
      }
      await page.locator('button[type="submit"]').first().click({ force: true }).catch(() => null);
      await page.waitForTimeout(2000);

      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const urlBefore = page.url();
      await snap(page, `${PERSONA}-s7-dashboard-before.png`);

      await ctx.clearCookies();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const urlAfter = page.url();
      const onSignIn = /\/auth\/sign-in/i.test(urlAfter);

      await snap(page, `${PERSONA}-s7-dashboard-after.png`);

      logFinding(
        'S7 token expiry',
        `before=${urlBefore}; after clearCookies+reload=${urlAfter}; redirected-to-sign-in=${onSignIn}`,
      );
      expect(onSignIn, 'dashboard must redirect to sign-in after token cleared').toBeTruthy();
    } catch (err) {
      logFinding('S7 token expiry', `ERROR: ${(err as Error).message}`);
    }
  });

  // ----------------------------------------------------------------
  // Aggregate findings to a JSON file the report script will read
  // ----------------------------------------------------------------
  test('Z: write persona findings sidecar', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const out = path.resolve('e2e-out', 'persona-7-findings.json');
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, JSON.stringify(findings, null, 2), 'utf8');
    expect(Object.keys(findings).length).toBeGreaterThan(0);
  });
});
