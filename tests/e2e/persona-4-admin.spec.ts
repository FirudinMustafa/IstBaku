import { test, expect, Page } from '@playwright/test';
import { attachDiagnostics, snap } from './helpers';

/**
 * Persona 4 — ADMIN (super-admin moderation)
 *
 * Walks the /admin console:
 *  - unauthenticated gating
 *  - login form
 *  - seeded-cred login attempt (env: SUPER_ADMIN_EMAIL/PASSWORD, fallback admin@istbaku.test / Admin2026!QA)
 *  - admin route tour with snapshots
 *  - approvals first-row "Approve" attempt
 *  - analytics Recharts SVG render check
 *  - logout + post-logout gating
 *
 * All findings are accumulated in `findings[]` and the spec asserts only that
 * snapshots/login states are captured — auth-blocked scenarios are recorded,
 * not failed. The companion report writer is the agent (see 04-admin-report.md).
 */

const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'admin@istbaku.test';
const ADMIN_PASS = process.env.SUPER_ADMIN_PASSWORD ?? 'Admin2026!QA';

const ADMIN_ROUTES: Array<{ path: string; slug: string; label: string }> = [
  { path: '/admin', slug: 'dashboard', label: 'Dashboard / Genel Bakış' },
  { path: '/admin/approvals', slug: 'approvals', label: 'İlan Onayları' },
  { path: '/admin/users', slug: 'users', label: 'Kullanıcılar' },
  { path: '/admin/agents', slug: 'agents', label: 'Ofisler & Ajanlar' },
  { path: '/admin/kyc', slug: 'kyc', label: 'KYC İnceleme' },
  { path: '/admin/payments', slug: 'payments', label: 'Ödemeler & Gelir' },
  { path: '/admin/analytics', slug: 'analytics', label: 'Analitik' },
  { path: '/admin/reports', slug: 'reports', label: 'Şikayetler' },
  { path: '/admin/audit', slug: 'audit', label: 'Denetim Logu' },
  { path: '/admin/country-guides', slug: 'country-guides', label: 'Ülke Rehberleri' },
];

interface Finding {
  scenario: string;
  status: 'pass' | 'fail' | 'blocked' | 'info';
  detail: string;
}

const findings: Finding[] = [];

function record(scenario: string, status: Finding['status'], detail: string) {
  findings.push({ scenario, status, detail });
  // eslint-disable-next-line no-console
  console.log(`[persona-4][${status.toUpperCase()}] ${scenario}: ${detail}`);
}

async function isOnAdminLogin(page: Page): Promise<boolean> {
  return /\/admin\/login/i.test(page.url());
}

async function tryAdminLogin(page: Page): Promise<{ ok: boolean; reason?: string }> {
  await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
  const emailInput = page.locator('input#admin-email, input[type="email"]').first();
  const pwdInput = page.locator('input#admin-password, input[type="password"]').first();
  if (!(await emailInput.count()) || !(await pwdInput.count())) {
    return { ok: false, reason: 'Login form not visible' };
  }
  await emailInput.fill(ADMIN_EMAIL);
  await pwdInput.fill(ADMIN_PASS);
  await snap(page, 'persona-4-login-filled.png');

  const submit = page.locator('button[type="submit"]').first();
  await submit.click();

  // Wait up to 8s for either redirect to /admin or an error alert
  try {
    await Promise.race([
      page.waitForURL(/\/admin(?!\/login)/, { timeout: 8000 }),
      page.locator('[role="alert"]').first().waitFor({ timeout: 8000 }),
    ]);
  } catch {
    // ignore — we'll inspect state below
  }

  const alert = page.locator('[role="alert"]').first();
  if (await alert.count()) {
    const txt = (await alert.textContent())?.trim() ?? '';
    if (txt) return { ok: false, reason: `Login alert: "${txt}"` };
  }
  if (/\/admin\/login/i.test(page.url())) {
    return { ok: false, reason: `Still on /admin/login after submit (url=${page.url()})` };
  }
  return { ok: true };
}

test.describe('Persona 4 — ADMIN moderation walk-through', () => {
  test('admin console end-to-end', async ({ page }) => {
    test.setTimeout(180_000);
    const diag = attachDiagnostics(page);

    // Scenario 1: unauthenticated /admin should redirect/gate
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await snap(page, 'persona-4-01-unauth-admin.png');
    if (await isOnAdminLogin(page)) {
      record('1. /admin unauthenticated redirect', 'pass', `Redirected to ${page.url()}`);
    } else {
      // Might be a server-side 401/forbidden page rendered in place — check body
      const body = (await page.locator('body').textContent())?.toLowerCase() ?? '';
      if (body.includes('giriş') || body.includes('login') || body.includes('yetki')) {
        record('1. /admin unauthenticated redirect', 'pass', `Gated in-place (url=${page.url()})`);
      } else {
        record('1. /admin unauthenticated redirect', 'fail',
          `Unauthenticated visitor landed on ${page.url()} without obvious gating`);
      }
    }

    // Scenario 2: /admin/login form visible
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await snap(page, 'persona-4-02-login-form.png');
    const emailExists = await page.locator('input#admin-email, input[type="email"]').first().count();
    const pwdExists = await page.locator('input#admin-password, input[type="password"]').first().count();
    if (emailExists && pwdExists) {
      record('2. /admin/login form visible', 'pass', 'Email + password inputs rendered');
    } else {
      record('2. /admin/login form visible', 'fail',
        `Inputs missing (email=${emailExists}, password=${pwdExists})`);
    }

    // Scenario 3: attempt seeded admin login
    const login = await tryAdminLogin(page);
    await snap(page, 'persona-4-03-after-login.png');
    if (login.ok) {
      record('3. Admin login w/ seeded creds', 'pass',
        `Logged in as ${ADMIN_EMAIL}; landed at ${page.url()}`);
    } else {
      record('3. Admin login w/ seeded creds', 'fail',
        `Could not log in with ${ADMIN_EMAIL} — ${login.reason}. ` +
        `Dev server likely not restarted after .env.local update, OR seeded admin user does not exist.`);
    }

    if (!login.ok) {
      // Scenarios 4-7 are blocked
      for (const r of ADMIN_ROUTES) {
        record(`4.${r.slug} route snapshot`, 'blocked',
          `Cannot snapshot ${r.path} — admin session unavailable`);
      }
      record('5. Approve first pending row', 'blocked', 'No admin session');
      record('6. Analytics Recharts SVG render', 'blocked', 'No admin session');
      record('7. Logout + post-logout gating', 'blocked', 'No admin session');

      // Soft pass — we still want the test to complete and write findings.
      // eslint-disable-next-line no-console
      console.log('[persona-4] Console errors so far:', diag.consoleErrors.slice(0, 10));
      // eslint-disable-next-line no-console
      console.log('[persona-4] 5xx network errors so far:', diag.networkErrors.slice(0, 10));
      // Attach a final summary to the test
      // eslint-disable-next-line no-console
      console.log('[persona-4] FINDINGS:', JSON.stringify(findings, null, 2));
      return;
    }

    // Scenario 4: tour admin routes
    for (const r of ADMIN_ROUTES) {
      try {
        const resp = await page.goto(r.path, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await page.waitForTimeout(400); // tiny settle for charts/lists
        await snap(page, `persona-4-04-${r.slug}.png`);
        const status = resp?.status() ?? 0;
        if (status >= 400) {
          record(`4.${r.slug} route snapshot`, 'fail',
            `HTTP ${status} on ${r.path}`);
        } else if (/\/admin\/login/i.test(page.url())) {
          record(`4.${r.slug} route snapshot`, 'fail',
            `Bounced to /admin/login while visiting ${r.path}`);
        } else {
          record(`4.${r.slug} route snapshot`, 'pass',
            `${r.label} rendered at ${page.url()} (HTTP ${status})`);
        }
      } catch (e) {
        record(`4.${r.slug} route snapshot`, 'fail',
          `Exception navigating to ${r.path}: ${(e as Error).message}`);
      }
    }

    // Scenario 5: approvals — click first "Approve" if present
    try {
      await page.goto('/admin/approvals', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      // Look for an Approve button. The client uses Turkish labels — match common variants.
      const approveBtn = page
        .getByRole('button', { name: /onayla|approve/i })
        .first();
      const cnt = await approveBtn.count();
      if (!cnt) {
        record('5. Approve first pending row', 'info',
          'No Approve button found — queue may be empty or labels differ');
      } else {
        await snap(page, 'persona-4-05-approvals-before.png');
        await approveBtn.click({ trial: false }).catch(() => undefined);
        // Wait for toast or list change
        await page.waitForTimeout(1500);
        await snap(page, 'persona-4-05-approvals-after.png');
        // Look for a success toast
        const toast = page.locator('text=/onayland|approved/i').first();
        if (await toast.count()) {
          record('5. Approve first pending row', 'pass',
            `Click succeeded — saw confirmation text "${(await toast.textContent())?.trim()}"`);
        } else {
          record('5. Approve first pending row', 'info',
            'Approve clicked; no confirmation toast detected (may have refreshed)');
        }
      }
    } catch (e) {
      record('5. Approve first pending row', 'fail',
        `Exception during approve flow: ${(e as Error).message}`);
    }

    // Scenario 6: /admin/analytics — Recharts SVGs
    try {
      await page.goto('/admin/analytics', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      // Recharts wraps charts in .recharts-wrapper / .recharts-surface
      const wrappers = await page.locator('.recharts-wrapper, .recharts-surface').count();
      const svgs = await page.locator('svg').count();
      await snap(page, 'persona-4-06-analytics.png');
      if (wrappers > 0) {
        record('6. Analytics Recharts SVG render', 'pass',
          `Found ${wrappers} recharts wrapper(s) and ${svgs} svg(s)`);
      } else if (svgs >= 2) {
        record('6. Analytics Recharts SVG render', 'info',
          `No .recharts-wrapper class detected but ${svgs} SVGs present`);
      } else {
        record('6. Analytics Recharts SVG render', 'fail',
          `No Recharts wrappers and only ${svgs} SVG(s) on /admin/analytics`);
      }
    } catch (e) {
      record('6. Analytics Recharts SVG render', 'fail',
        `Exception loading analytics: ${(e as Error).message}`);
    }

    // Scenario 7: logout via header/sidebar form and verify gating
    try {
      // Two logout entry points in AdminShell: sidebar "Çıkış yap" submit + header (mobile).
      // Click the visible one. On desktop viewport (1280x800) the sidebar one is visible.
      const logoutBtn = page
        .getByRole('button', { name: /çıkış|logout|log out/i })
        .first();
      if (!(await logoutBtn.count())) {
        record('7. Logout + post-logout gating', 'fail', 'No logout button found in AdminShell');
      } else {
        await logoutBtn.click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await snap(page, 'persona-4-07-after-logout.png');
        // Now try /admin/users
        await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
        await snap(page, 'persona-4-07-users-postlogout.png');
        if (await isOnAdminLogin(page)) {
          record('7. Logout + post-logout gating', 'pass',
            `/admin/users redirected to ${page.url()} after logout`);
        } else {
          const body = (await page.locator('body').textContent())?.toLowerCase() ?? '';
          if (body.includes('giriş') || body.includes('login') || body.includes('yetki')) {
            record('7. Logout + post-logout gating', 'pass',
              'Gated in-place after logout');
          } else {
            record('7. Logout + post-logout gating', 'fail',
              `Still able to view /admin/users after logout (url=${page.url()})`);
          }
        }
      }
    } catch (e) {
      record('7. Logout + post-logout gating', 'fail',
        `Exception during logout flow: ${(e as Error).message}`);
    }

    // Dump diagnostics summary into stdout for the agent to harvest
    // eslint-disable-next-line no-console
    console.log('[persona-4] console errors:', JSON.stringify(diag.consoleErrors.slice(0, 20)));
    // eslint-disable-next-line no-console
    console.log('[persona-4] page errors:', JSON.stringify(diag.pageErrors.slice(0, 20)));
    // eslint-disable-next-line no-console
    console.log('[persona-4] 5xx errors:', JSON.stringify(diag.networkErrors.slice(0, 20)));
    // eslint-disable-next-line no-console
    console.log('[persona-4] FINDINGS:', JSON.stringify(findings, null, 2));

    // The spec only "fails" if scenario 2 (login form) is broken — everything
    // else is non-blocking and reported.
    expect.soft(findings.find((f) => f.scenario.startsWith('2.'))?.status, 'login form visible').toBe('pass');
  });
});
