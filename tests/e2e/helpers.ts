import { Page, expect } from '@playwright/test';

export const BASE_URL = 'http://localhost:3000';

export function uniqueEmail(prefix: string): string {
  const ts = Date.now();
  return `${prefix}-${ts}@istbaku-test.example`;
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}`;
}

/** Attach console/page-error/response-error listeners and return collectors. */
export function attachDiagnostics(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const networkErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('response', (resp) => {
    if (resp.status() >= 500) networkErrors.push(`${resp.status()} ${resp.url()}`);
  });

  return { consoleErrors, pageErrors, networkErrors };
}

/** Sign up via the public form; returns the created email. */
export async function signUp(page: Page, prefix: string, opts?: { name?: string; password?: string; phone?: string }) {
  const email = uniqueEmail(prefix);
  const name = opts?.name ?? uniqueName(prefix);
  const password = opts?.password ?? 'Test12345!';
  const phone = opts?.phone ?? '+905551112233';

  await page.goto('/auth/sign-up');
  await page.waitForLoadState('domcontentloaded');

  const fillIfPresent = async (selector: string, value: string) => {
    const el = page.locator(selector).first();
    if (await el.count()) await el.fill(value);
  };

  await fillIfPresent('input[name="name"], input#name', name);
  await fillIfPresent('input[name="email"], input[type="email"]', email);
  await fillIfPresent('input[name="phone"]', phone);
  await fillIfPresent('input[name="password"], input[type="password"]', password);
  await fillIfPresent('input[name="confirmPassword"], input[name="passwordConfirm"]', password);

  return { email, name, password };
}

export async function snap(page: Page, file: string) {
  await page.screenshot({ path: `e2e-out/screenshots/${file}`, fullPage: false });
}
