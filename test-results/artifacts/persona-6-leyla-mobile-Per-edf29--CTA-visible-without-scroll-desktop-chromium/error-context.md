# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: persona-6-leyla-mobile.spec.ts >> Persona 6 — Leyla (mobile iPhone 14) >> 1. Homepage on mobile — hamburger + hero CTA visible without scroll
- Location: tests\e2e\persona-6-leyla-mobile.spec.ts:35:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | import { attachDiagnostics, snap } from './helpers';
  3   | 
  4   | /**
  5   |  * Persona 6 — LEYLA (mobile iPhone 14 user on 3G)
  6   |  *
  7   |  * Validates the mobile UX:
  8   |  *   1. Homepage mobile hamburger + hero CTA visible w/o scroll
  9   |  *   2. Mobile drawer nav links → Listings
  10  |  *   3. /listings filter drawer open/close
  11  |  *   4. Click listing card → detail
  12  |  *   5. Gallery swipe simulation
  13  |  *   6. WhatsApp FAB / link presence
  14  |  *   7. Chatbot FAB — open + 6 turn conversation
  15  |  *   8. Auth/sign-in email-focused screenshot
  16  |  *   9. Tab-keyboard count of focusable elements on home
  17  |  *  10. Skip-to-main link via initial Tab
  18  |  */
  19  | 
  20  | test.describe.configure({ mode: 'serial' });
  21  | 
  22  | interface Finding { scenario: string; status: 'pass' | 'fail' | 'blocked' | 'info'; detail: string; }
  23  | const findings: Finding[] = [];
  24  | function record(scenario: string, status: Finding['status'], detail: string) {
  25  |   findings.push({ scenario, status, detail });
  26  |   // eslint-disable-next-line no-console
  27  |   console.log(`[persona-6][${status.toUpperCase()}] ${scenario}: ${detail}`);
  28  | }
  29  | 
  30  | test.describe('Persona 6 — Leyla (mobile iPhone 14)', () => {
  31  |   test.beforeEach(async ({ page }) => {
  32  |     attachDiagnostics(page);
  33  |   });
  34  | 
  35  |   test('1. Homepage on mobile — hamburger + hero CTA visible without scroll', async ({ page }) => {
  36  |     try {
  37  |       await page.goto('/', { waitUntil: 'domcontentloaded' });
  38  |       // Wait for layout
  39  |       await page.waitForLoadState('networkidle').catch(() => {});
  40  | 
  41  |       const vp = page.viewportSize();
  42  |       record('viewport', 'info', `viewport=${vp?.width}x${vp?.height}`);
  43  | 
  44  |       const hamburger = page.locator('button[aria-label="Menüyü aç"], button[aria-controls="mobile-drawer"]').first();
  45  |       const hamburgerVisible = await hamburger.isVisible().catch(() => false);
> 46  |       expect(hamburgerVisible).toBeTruthy();
      |                                ^ Error: expect(received).toBeTruthy()
  47  |       record('hamburger', hamburgerVisible ? 'pass' : 'fail', `visible=${hamburgerVisible}`);
  48  | 
  49  |       // Hero CTA: any Button with text inside hero section, take first one above the fold
  50  |       const heroH1 = page.locator('h1').first();
  51  |       const h1Visible = await heroH1.isVisible().catch(() => false);
  52  |       record('hero h1', h1Visible ? 'pass' : 'fail', `visible=${h1Visible}`);
  53  | 
  54  |       // Hero search/CTA button - should be within viewport height (no scroll)
  55  |       const cta = page.locator('form button[type="submit"]').first();
  56  |       const ctaBox = await cta.boundingBox().catch(() => null);
  57  |       const ctaWithinFold = !!(ctaBox && ctaBox.y < (vp?.height ?? 844));
  58  |       record('hero cta above-fold', ctaWithinFold ? 'pass' : 'info', `ctaBox.y=${ctaBox?.y}`);
  59  | 
  60  |       await snap(page, 'persona-6-01-home-mobile.png');
  61  |     } catch (e) {
  62  |       record('homepage', 'fail', String((e as Error).message));
  63  |       throw e;
  64  |     }
  65  |   });
  66  | 
  67  |   test('2. Hamburger drawer — nav links → Listings', async ({ page }) => {
  68  |     await page.goto('/', { waitUntil: 'domcontentloaded' });
  69  |     const hamburger = page.locator('button[aria-label="Menüyü aç"], button[aria-controls="mobile-drawer"]').first();
  70  |     await hamburger.click();
  71  |     const drawer = page.locator('#mobile-drawer');
  72  |     await expect(drawer).toBeVisible({ timeout: 5000 });
  73  | 
  74  |     // Primary nav links inside drawer
  75  |     const drawerLinks = drawer.locator('nav a, a[href^="/"]');
  76  |     const count = await drawerLinks.count();
  77  |     record('drawer nav link count', count >= 4 ? 'pass' : 'fail', `count=${count}`);
  78  | 
  79  |     await snap(page, 'persona-6-02-drawer.png');
  80  | 
  81  |     const listingsLink = drawer.locator('a[href="/listings"]').first();
  82  |     await expect(listingsLink).toBeVisible();
  83  |     await Promise.all([
  84  |       page.waitForURL(/\/listings/, { timeout: 10_000 }).catch(() => {}),
  85  |       listingsLink.click(),
  86  |     ]);
  87  |     const url = page.url();
  88  |     record('navigated to listings', /\/listings/.test(url) ? 'pass' : 'fail', `url=${url}`);
  89  |     expect(url).toMatch(/\/listings/);
  90  |   });
  91  | 
  92  |   test('3. /listings filter drawer opens and closes', async ({ page }) => {
  93  |     await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  94  |     await page.waitForLoadState('networkidle').catch(() => {});
  95  | 
  96  |     // The mobile filter button — text "Filtrele"
  97  |     const filterBtn = page.getByRole('button', { name: /Filtrele/i }).first();
  98  |     const found = await filterBtn.count();
  99  |     if (!found) {
  100 |       record('filter button', 'fail', 'not found');
  101 |       expect(found).toBeGreaterThan(0);
  102 |     }
  103 |     await filterBtn.click();
  104 | 
  105 |     // Bottom sheet — locate the modal dialog (role=dialog) that contains an h2 "Filtreler"
  106 |     const sheet = page.locator('[role="dialog"][aria-modal="true"]').filter({ has: page.locator('h2', { hasText: /^Filtreler$/ }) }).first();
  107 |     await expect(sheet).toBeVisible({ timeout: 5000 });
  108 |     record('filter sheet open', 'pass', 'sheet visible');
  109 |     await snap(page, 'persona-6-03-filter-sheet.png');
  110 | 
  111 |     // Close via close button (X) or ESC
  112 |     const closeBtn = sheet.locator('button[aria-label="Kapat"]').first();
  113 |     if (await closeBtn.count()) {
  114 |       await closeBtn.click();
  115 |     } else {
  116 |       await page.keyboard.press('Escape');
  117 |     }
  118 |     await page.waitForTimeout(600);
  119 |     const closed = !(await sheet.isVisible().catch(() => false));
  120 |     record('filter sheet closed', closed ? 'pass' : 'info', `closed=${closed}`);
  121 |   });
  122 | 
  123 |   test('4. Click a listing card → detail loads', async ({ page }) => {
  124 |     await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  125 |     await page.waitForLoadState('networkidle').catch(() => {});
  126 | 
  127 |     const propertyLink = page.locator('a[href^="/property/"]').first();
  128 |     const has = await propertyLink.count();
  129 |     if (!has) {
  130 |       record('listing card', 'blocked', 'no listing cards rendered');
  131 |       test.skip();
  132 |       return;
  133 |     }
  134 |     const href = await propertyLink.getAttribute('href');
  135 |     await Promise.all([
  136 |       page.waitForURL(/\/property\//, { timeout: 15_000 }).catch(() => {}),
  137 |       propertyLink.click(),
  138 |     ]);
  139 |     const url = page.url();
  140 |     record('property detail loaded', /\/property\//.test(url) ? 'pass' : 'fail', `url=${url} from href=${href}`);
  141 |     expect(url).toMatch(/\/property\//);
  142 |     await snap(page, 'persona-6-04-property-detail.png');
  143 |   });
  144 | 
  145 |   test('5. Gallery swipe — simulate horizontal swipe', async ({ page }) => {
  146 |     await page.goto('/listings', { waitUntil: 'domcontentloaded' });
```