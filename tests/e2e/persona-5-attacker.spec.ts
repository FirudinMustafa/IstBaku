import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { attachDiagnostics, snap } from './helpers';

/**
 * Persona 5 — SALDIRGAN (Attacker / Pen Tester)
 *
 * Surfaces input-validation, rate-limit, IDOR, open-redirect, XSS and
 * file-upload abuse weaknesses through real Playwright-driven payloads.
 *
 * Notes:
 *  - Every test installs a dialog guard that DISMISSES alerts and records
 *    them. At test end we assert zero dialogs were raised (XSS would alert).
 *  - "Blocked" findings indicate the wizard / page could not be exercised
 *    far enough — they are surfaced rather than failed.
 *  - We never actually exploit a discovered vulnerability — we confirm
 *    presence and report.
 */

interface Finding {
  scenario: string;
  status: 'pass' | 'fail' | 'blocked' | 'info';
  detail: string;
}

const findings: Finding[] = [];

function record(scenario: string, status: Finding['status'], detail: string) {
  findings.push({ scenario, status, detail });
  // eslint-disable-next-line no-console
  console.log(`[persona-5][${status.toUpperCase()}] ${scenario}: ${detail}`);
}

let dialogCount = 0;

function installDialogGuard(page: Page) {
  page.on('dialog', async (d) => {
    dialogCount += 1;
    record('xss-dialog-guard', 'fail', `Dialog raised: type=${d.type()} message="${d.message()}"`);
    try {
      await d.dismiss();
    } catch {
      // ignore
    }
  });
}

async function safeGoto(page: Page, url: string) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  } catch (err) {
    record('navigation', 'info', `goto ${url} failed: ${(err as Error).message}`);
  }
}

async function fillIf(page: Page, selector: string, value: string) {
  const el = page.locator(selector).first();
  if (await el.count()) {
    try {
      await el.fill(value, { timeout: 3_000 });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function clickIf(page: Page, selector: string) {
  const el = page.locator(selector).first();
  if (await el.count()) {
    try {
      await el.click({ timeout: 3_000 });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function collectErrorText(page: Page): Promise<string> {
  const alert = page.locator('[role="alert"]');
  const count = await alert.count();
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = (await alert.nth(i).innerText().catch(() => '')).trim();
    if (t) parts.push(t);
  }
  return parts.join(' | ');
}

test.describe.serial('Persona 5 — SALDIRGAN', () => {
  test.beforeEach(({ page }) => {
    installDialogGuard(page);
    attachDiagnostics(page);
  });

  test('S1 — /auth/sign-up malicious input validation', async ({ page }) => {
    const payloads: Array<{ key: string; name?: string; email: string; phone?: string; password?: string; note: string }> = [
      { key: 'xss-email', email: '<script>alert(1)</script>@evil.example', name: 'XSS User', phone: '5551112233', password: 'Aa345678', note: 'XSS in email' },
      { key: 'sqli-email', email: "' OR '1'='1@x.com", name: 'SQLi User', phone: '5551112233', password: 'Aa345678', note: 'SQLi in email' },
      { key: 'huge-name', email: `huge-${Date.now()}@x.example`, name: 'A'.repeat(10000), phone: '5551112233', password: 'Aa345678', note: '10000-char name' },
      { key: 'empty-pwd', email: `empty-${Date.now()}@x.example`, name: 'Empty Pwd', phone: '5551112233', password: '', note: 'empty password' },
      { key: 'short-pwd', email: `short-${Date.now()}@x.example`, name: 'Short Pwd', phone: '5551112233', password: '1', note: '1-char password' },
      { key: 'space-pwd', email: `space-${Date.now()}@x.example`, name: 'Space Pwd', phone: '5551112233', password: '        ', note: 'whitespace-only password' },
      { key: 'huge-phone', email: `phone-${Date.now()}@x.example`, name: 'Big Phone', phone: '1234567890123456789012345', password: 'Aa345678', note: 'oversized phone' },
    ];

    for (const p of payloads) {
      await safeGoto(page, '/auth/sign-up');
      await page.locator('input#signup-email').first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => { /* ignore */ });
      await page.waitForTimeout(300);

      const fillReact = async (sel: string, val: string) => {
        const el = page.locator(sel).first();
        if (!(await el.count())) return false;
        await el.click().catch(() => { /* ignore */ });
        await el.fill(val).catch(() => { /* ignore */ });
        return true;
      };

      await fillReact('input#signup-name', p.name ?? '');
      await fillReact('input#signup-email', p.email);
      if (p.phone !== undefined) await fillReact('input#signup-phone', p.phone);
      if (p.password !== undefined) await fillReact('input#signup-password', p.password);

      // Tick accept box if present
      const accept = page.locator('input[type="checkbox"]').first();
      if (await accept.count()) {
        try { await accept.check({ timeout: 2_000 }); } catch { /* ignore */ }
      }

      await snap(page, `persona-5-signup-${p.key}-filled.png`);

      // Submit
      await clickIf(page, 'button[type="submit"]');
      await page.waitForTimeout(500);

      const errText = await collectErrorText(page);
      const stillOnSignup = /\/auth\/sign-up/.test(page.url());

      if (errText) {
        record(`signup-${p.key}`, 'pass', `validation rejected (${p.note}): ${errText.slice(0, 160)}`);
      } else if (stillOnSignup) {
        record(`signup-${p.key}`, 'pass', `still on /auth/sign-up — submission silently rejected (${p.note})`);
      } else {
        record(`signup-${p.key}`, 'fail', `payload "${p.note}" was accepted — page moved to ${page.url()}`);
      }

      await snap(page, `persona-5-signup-${p.key}-after.png`);
    }

    expect(dialogCount, 'XSS dialog must not appear during sign-up fuzzing').toBe(0);
  });

  test('S2 — /auth/sign-in 20 rapid wrong-password attempts → rate-limit', async ({ page }) => {
    test.setTimeout(120_000);
    const targetEmail = `nonexistent-${Date.now()}@x.com`;
    const responses: Array<{ idx: number; bodySnippet: string; url: string; status: number | null }> = [];

    let blocked = false;
    let blockedAt = -1;

    // Load the page once and resubmit in-place to stay under 30s budget.
    await safeGoto(page, '/auth/sign-in');
    // Wait for hydration so React picks up onChange events.
    await page.locator('input#signin-email').first().waitFor({ state: 'visible', timeout: 8_000 });
    await page.waitForTimeout(400);
    await page.locator('input#signin-email').first().click();
    await page.locator('input#signin-email').first().fill(targetEmail);

    for (let i = 0; i < 20; i++) {
      const pwdInput = page.locator('input#signin-password').first();
      if (!(await pwdInput.count())) break;
      // Re-assert email each iter — sign-in form keeps state but be defensive.
      const emailInput = page.locator('input#signin-email').first();
      const cur = await emailInput.inputValue().catch(() => '');
      if (cur !== targetEmail) {
        await emailInput.click();
        await emailInput.fill(targetEmail);
      }
      await pwdInput.click();
      await pwdInput.fill(`WrongPass${i}!`);

      const submit = page.locator('button[type="submit"]').first();
      if (!(await submit.count())) break;

      const respPromise = page.waitForResponse(
        (r) => r.request().method() === 'POST' && /\/auth\/sign-in/.test(r.url()),
        { timeout: 5_000 },
      ).catch(() => null);

      await submit.click({ timeout: 5_000 }).catch(() => { /* ignore */ });
      const resp = await respPromise;

      // Wait for the role=alert (server error) OR a navigation away.
      await page
        .locator('[role="alert"]')
        .first()
        .waitFor({ state: 'visible', timeout: 4_000 })
        .catch(() => { /* may not appear if request swallowed */ });

      const errText = await collectErrorText(page);
      const lower = errText.toLowerCase();
      const status = resp?.status() ?? null;

      responses.push({ idx: i, bodySnippet: errText.slice(0, 160), url: page.url(), status });

      if (
        status === 429 ||
        lower.includes('çok fazla') ||
        lower.includes('too many') ||
        lower.includes('rate') ||
        lower.includes('15')
      ) {
        blocked = true;
        blockedAt = i + 1;
        break;
      }

      await page.waitForTimeout(50);
    }

    await snap(page, 'persona-5-signin-ratelimit-final.png');

    if (blocked) {
      record('signin-rate-limit', 'pass', `Rate limit / lockout triggered at attempt ${blockedAt}/20. Snippet: "${responses.at(-1)?.bodySnippet ?? ''}"`);
    } else {
      const sample = responses.slice(0, 3).map((r) => `[${r.idx}]"${r.bodySnippet}"`).join(' ');
      record(
        'signin-rate-limit',
        'fail',
        `Completed ${responses.length} wrong-pwd attempts without rate-limit signal. Last error: "${responses.at(-1)?.bodySnippet ?? '(none)'}". Sample: ${sample}`,
      );
    }
    expect(dialogCount, 'no dialogs during rate-limit attack').toBe(0);
  });

  test('S3 — IDOR: signed-in user attempting other-id URLs', async ({ page }) => {
    // Create a normal user first via the sign-up form. We can't verify email
    // here (no inbox), so /dashboard may still gate us. Either way, we then
    // attempt id-bearing URLs and assert that admin and other-user resources
    // are NOT served.
    const email = `attacker-${Date.now()}@istbaku-test.example`;
    await safeGoto(page, '/auth/sign-up');
    await fillIf(page, 'input#signup-name', 'Attacker Q');
    await fillIf(page, 'input#signup-email', email);
    await fillIf(page, 'input#signup-phone', '5550001122');
    await fillIf(page, 'input#signup-password', 'Aa345678');
    const accept = page.locator('input[type="checkbox"]').first();
    if (await accept.count()) {
      try { await accept.check({ timeout: 2_000 }); } catch { /* ignore */ }
    }
    await clickIf(page, 'button[type="submit"]');
    await page.waitForTimeout(800);

    const targets = [
      { path: '/dashboard?userId=1', label: 'dashboard-userId-1' },
      { path: '/property/1/edit', label: 'property-1-edit' },
      { path: '/admin/users', label: 'admin-users' },
    ];

    for (const t of targets) {
      await safeGoto(page, t.path);
      await page.waitForTimeout(400);
      const url = page.url();
      const status = await page
        .evaluate(() => document.title)
        .then((title) => ({ title, url: location.href }))
        .catch(() => ({ title: '', url }));

      const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 600).toLowerCase();
      const onAdminLogin = /\/admin\/login/.test(url);
      const onSignIn = /\/auth\/sign-in/.test(url);
      const looks403 = bodyText.includes('forbidden') || bodyText.includes('yetkisiz') || bodyText.includes('403') || bodyText.includes('giriş yap');
      const looks404 = bodyText.includes('404') || bodyText.includes('bulunamadı');

      await snap(page, `persona-5-idor-${t.label}.png`);

      if (onAdminLogin && t.path.startsWith('/admin')) {
        record(`idor-${t.label}`, 'pass', `admin route redirected to /admin/login (${url})`);
      } else if (onSignIn) {
        record(`idor-${t.label}`, 'pass', `auth-gated → redirected to /auth/sign-in (${url})`);
      } else if (looks403 || looks404) {
        record(`idor-${t.label}`, 'pass', `denied (title="${status.title}") body hint matched 403/404/auth`);
      } else if (/\/admin\/users/.test(url)) {
        // Reached admin page directly while not authenticated as admin
        record(`idor-${t.label}`, 'fail', `reached ${url} as non-admin user — admin content rendered`);
      } else {
        record(`idor-${t.label}`, 'info', `landed at ${url}; body="${bodyText.slice(0, 120)}"`);
      }
    }

    expect(dialogCount, 'no dialogs during IDOR probing').toBe(0);
  });

  test('S4 — /api/country-guide?iso=AZ open-redirect check', async ({ page }) => {
    const r = await page.request.get('/api/country-guide?iso=AZ', { maxRedirects: 0 });
    const status = r.status();
    const location = r.headers()['location'] ?? '';
    const ct = r.headers()['content-type'] ?? '';

    if (status >= 300 && status < 400 && location) {
      let host = '';
      try { host = new URL(location).hostname; } catch { host = '<unparsable>'; }
      const safeSuffixes = ['.public.blob.vercel-storage.com', '.blob.vercel-storage.com', 'istbaku.com'];
      const safe = safeSuffixes.some((s) => s.startsWith('.') ? host.endsWith(s) : host === s);
      if (safe) {
        record('country-guide-redirect', 'pass', `${status} → ${location} (host on allowlist)`);
      } else {
        record('country-guide-redirect', 'fail', `${status} → ${location} (host "${host}" NOT in allowlist)`);
      }
    } else if (status === 200 && ct.includes('pdf')) {
      record('country-guide-redirect', 'pass', `200 PDF inline — no redirect, no open-redirector exposure`);
    } else if (status === 400) {
      record('country-guide-redirect', 'pass', `400 — server refused an unsafe stored URL (defense-in-depth)`);
    } else {
      record('country-guide-redirect', 'info', `status=${status} location="${location}" content-type="${ct}"`);
    }

    expect(dialogCount, 'no dialogs during open-redirect probe').toBe(0);
  });

  test('S5 — /new-listing description XSS injection (deferred-aware)', async ({ page }) => {
    // Attempt to reach the wizard. Middleware will redirect unauthenticated
    // requests to /auth/sign-in. We use a fresh sign-up; since email
    // verification is required for /dashboard, the wizard may still be gated.
    const email = `xss-${Date.now()}@istbaku-test.example`;
    await safeGoto(page, '/auth/sign-up');
    await fillIf(page, 'input#signup-name', 'XSS Tester');
    await fillIf(page, 'input#signup-email', email);
    await fillIf(page, 'input#signup-phone', '5550003344');
    await fillIf(page, 'input#signup-password', 'Aa345678');
    const accept = page.locator('input[type="checkbox"]').first();
    if (await accept.count()) {
      try { await accept.check({ timeout: 2_000 }); } catch { /* ignore */ }
    }
    await clickIf(page, 'button[type="submit"]');
    await page.waitForTimeout(700);

    await safeGoto(page, '/new-listing');
    await page.waitForTimeout(500);

    if (/\/auth\/sign-in/.test(page.url())) {
      record('listing-xss', 'blocked', `Wizard not reachable without authenticated session (redirected to ${page.url()})`);
      await snap(page, 'persona-5-listing-xss-blocked.png');
      expect(dialogCount, 'no dialogs while blocked').toBe(0);
      return;
    }

    // Try to find a description textarea anywhere in the wizard and inject.
    const descSelector = 'textarea[name="description"], textarea#description, textarea[placeholder*="açıklama" i], textarea';
    const desc = page.locator(descSelector).first();
    if (!(await desc.count())) {
      record('listing-xss', 'blocked', 'No description textarea reachable on /new-listing entry step');
      await snap(page, 'persona-5-listing-xss-no-textarea.png');
      expect(dialogCount).toBe(0);
      return;
    }

    const payload = '<img src=x onerror="window.__pwned=1">';
    try {
      await desc.fill(payload, { timeout: 4_000 });
    } catch {
      record('listing-xss', 'blocked', 'Could not fill description textarea');
      expect(dialogCount).toBe(0);
      return;
    }

    await snap(page, 'persona-5-listing-xss-filled.png');

    // Attempt to submit final step; if the wizard requires earlier steps the
    // submit button will be missing — that's fine, we record as "deferred".
    const submit = page.locator('button[type="submit"]').first();
    if (await submit.count()) {
      await submit.click({ timeout: 3_000 }).catch(() => { /* ignore */ });
      await page.waitForTimeout(1000);
    }

    const pwned = await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned);
    if (pwned === undefined) {
      record('listing-xss', 'pass', 'description payload did NOT execute (window.__pwned undefined)');
    } else {
      record('listing-xss', 'fail', `XSS executed — window.__pwned=${pwned}`);
    }

    record('listing-xss', 'info', 'Final submission may have been deferred — wizard requires earlier steps.');
    expect(dialogCount, 'no XSS dialogs').toBe(0);
  });

  test('S6 — file upload abuse on listing wizard (best-effort)', async ({ page }) => {
    const email = `upload-${Date.now()}@istbaku-test.example`;
    await safeGoto(page, '/auth/sign-up');
    await fillIf(page, 'input#signup-name', 'Upload Abuser');
    await fillIf(page, 'input#signup-email', email);
    await fillIf(page, 'input#signup-phone', '5550005566');
    await fillIf(page, 'input#signup-password', 'Aa345678');
    const accept = page.locator('input[type="checkbox"]').first();
    if (await accept.count()) {
      try { await accept.check({ timeout: 2_000 }); } catch { /* ignore */ }
    }
    await clickIf(page, 'button[type="submit"]');
    await page.waitForTimeout(700);

    await safeGoto(page, '/new-listing');
    await page.waitForTimeout(500);

    if (/\/auth\/sign-in/.test(page.url())) {
      record('upload-abuse', 'blocked', 'New-listing wizard not reachable without verified session (deferred)');
      await snap(page, 'persona-5-upload-blocked.png');
      expect(dialogCount).toBe(0);
      return;
    }

    const fileInput = page.locator('input[type="file"]').first();
    if (!(await fileInput.count())) {
      record('upload-abuse', 'blocked', 'No file input reachable in initial wizard step (deferred)');
      await snap(page, 'persona-5-upload-no-input.png');
      expect(dialogCount).toBe(0);
      return;
    }

    const fixtures = [
      { file: 'oversize.jpg', label: 'oversize-jpg' },
      { file: 'malware.exe', label: 'exe-extension' },
      { file: 'xss.svg', label: 'svg-with-script' },
    ];

    for (const f of fixtures) {
      const fullPath = path.resolve(__dirname, '..', 'fixtures', f.file);
      try {
        await fileInput.setInputFiles(fullPath, { timeout: 4_000 });
      } catch (err) {
        record(`upload-${f.label}`, 'pass', `setInputFiles rejected: ${(err as Error).message.slice(0, 120)}`);
        continue;
      }
      await page.waitForTimeout(500);

      const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
      const previewExists = await page.locator('img[src^="data:image"], img[alt*="cover" i], [data-testid*="preview" i]').count();
      const rejectedHints = [
        bodyText.includes('hata'),
        bodyText.includes('izin'),
        bodyText.includes('boyut'),
        bodyText.includes('format'),
        bodyText.includes('desteklenmiyor'),
        bodyText.includes('reddedildi'),
        bodyText.includes('5 mb'),
        bodyText.includes('image/'),
        bodyText.includes('error'),
      ];
      const rejected = rejectedHints.some(Boolean);

      if (rejected || previewExists === 0) {
        record(`upload-${f.label}`, 'pass', `${f.file}: rejected (preview=${previewExists}, rejectedHint=${rejected})`);
      } else {
        record(`upload-${f.label}`, 'fail', `${f.file}: appears accepted — ${previewExists} preview(s) rendered`);
      }
      await snap(page, `persona-5-upload-${f.label}.png`);
    }

    expect(dialogCount, 'no upload-abuse dialogs').toBe(0);
  });

  test.afterAll(async () => {
    // eslint-disable-next-line no-console
    console.log('\n[persona-5] FINDINGS SUMMARY');
    for (const f of findings) {
      // eslint-disable-next-line no-console
      console.log(`  - [${f.status}] ${f.scenario} — ${f.detail}`);
    }
  });
});
