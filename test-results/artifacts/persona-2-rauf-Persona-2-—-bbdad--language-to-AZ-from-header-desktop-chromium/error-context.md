# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: persona-2-rauf.spec.ts >> Persona 2 — Rauf >> S1: Switch language to AZ from header
- Location: tests\e2e\persona-2-rauf.spec.ts:32:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { attachDiagnostics, snap, uniqueEmail, uniqueName } from './helpers';
  3   | 
  4   | /**
  5   |  * PERSONA 2 — "RAUF"
  6   |  * 45-yo Bakı investor. AZN currency, AZ language. Looking for TR investment props.
  7   |  *
  8   |  * Findings are captured into the global findings array (writable by tests) and
  9   |  * persisted by an afterAll hook into e2e-out/02-rauf-report.md.
  10  |  */
  11  | 
  12  | type Severity = 'BROKEN' | 'FUNCTIONAL' | 'UX' | 'POLISH' | 'PASSED';
  13  | interface Finding {
  14  |   scenario: string;
  15  |   severity: Severity;
  16  |   note: string;
  17  | }
  18  | const findings: Finding[] = [];
  19  | const record = (scenario: string, severity: Severity, note: string) => {
  20  |   findings.push({ scenario, severity, note });
  21  | };
  22  | 
  23  | test.describe('Persona 2 — Rauf', () => {
  24  |   let signupEmail = '';
  25  |   const password = 'Test12345!';
  26  |   const fullName = uniqueName('Rauf');
  27  | 
  28  |   test.beforeEach(async ({ page }) => {
  29  |     attachDiagnostics(page);
  30  |   });
  31  | 
  32  |   test('S1: Switch language to AZ from header', async ({ page }) => {
  33  |     const diag = attachDiagnostics(page);
  34  |     await page.goto('/');
  35  |     await page.waitForLoadState('domcontentloaded');
  36  |     await snap(page, 'persona-2-s1-home-initial.png');
  37  | 
  38  |     // Locate the language switcher (button with aria-label "Dil değiştir")
  39  |     const langButton = page.locator('button[aria-label="Dil değiştir"]').first();
  40  |     const langButtonCount = await langButton.count();
  41  |     if (langButtonCount === 0) {
  42  |       record('S1 Language switcher', 'BROKEN', 'Could not find header language switcher (aria-label="Dil değiştir").');
  43  |       await snap(page, 'persona-2-s1-no-lang-switcher.png');
> 44  |       expect(langButtonCount).toBeGreaterThan(0);
      |                               ^ Error: expect(received).toBeGreaterThan(expected)
  45  |       return;
  46  |     }
  47  | 
  48  |     await langButton.click();
  49  |     await page.waitForTimeout(200);
  50  |     await snap(page, 'persona-2-s1-lang-open.png');
  51  | 
  52  |     // Click the AZ option ("Azərbaycan")
  53  |     const azOption = page.getByRole('button', { name: /Azərbaycan/i }).first();
  54  |     const azCount = await azOption.count();
  55  |     if (azCount === 0) {
  56  |       record('S1 Language switcher', 'BROKEN', 'AZ option ("Azərbaycan") not present in language dropdown.');
  57  |       expect(azCount).toBeGreaterThan(0);
  58  |       return;
  59  |     }
  60  |     await azOption.click();
  61  |     await page.waitForTimeout(500);
  62  |     await snap(page, 'persona-2-s1-lang-az.png');
  63  | 
  64  |     // Verify some AZ string in nav — e.g. "Elanlar" (Listings in AZ)
  65  |     const nav = page.locator('nav[aria-label="Ana gezinme"]').first();
  66  |     const navText = await nav.textContent().catch(() => '');
  67  |     const hasAzString = /Elanlar|Portfel|Hüquqi|Hesabatlar|Uyğunlaşma/i.test(navText ?? '');
  68  |     if (!hasAzString) {
  69  |       record('S1 Language switcher', 'FUNCTIONAL', `Language toggle did not propagate to nav: got "${(navText ?? '').slice(0, 200)}".`);
  70  |     } else {
  71  |       record('S1 Language switcher', 'PASSED', `Nav contains AZ string. Text sample: "${(navText ?? '').slice(0, 80)}".`);
  72  |     }
  73  |     if (diag.consoleErrors.length || diag.pageErrors.length) {
  74  |       record('S1 Language switcher', 'POLISH', `Console errors: ${diag.consoleErrors.length}, page errors: ${diag.pageErrors.length}.`);
  75  |     }
  76  |     expect(hasAzString).toBeTruthy();
  77  |   });
  78  | 
  79  |   test('S2: Currency switcher to AZN + price displays ₼/AZN', async ({ page }) => {
  80  |     await page.goto('/');
  81  |     await page.waitForLoadState('domcontentloaded');
  82  | 
  83  |     // Look for currency switcher — could be a button/dropdown labelled USD/EUR/TRY/AZN.
  84  |     const possibleSelectors = [
  85  |       'button[aria-label*="Para birimi" i]',
  86  |       'button[aria-label*="Currency" i]',
  87  |       'button[aria-label*="Valyuta" i]',
  88  |       'button:has-text("USD")',
  89  |       'button:has-text("AZN")',
  90  |       'select[name="currency"]',
  91  |     ];
  92  | 
  93  |     let foundCurrencySwitcher = false;
  94  |     for (const sel of possibleSelectors) {
  95  |       if (await page.locator(sel).count()) {
  96  |         foundCurrencySwitcher = true;
  97  |         break;
  98  |       }
  99  |     }
  100 | 
  101 |     await snap(page, 'persona-2-s2-home-currency-search.png');
  102 | 
  103 |     if (!foundCurrencySwitcher) {
  104 |       record(
  105 |         'S2 Currency switcher',
  106 |         'BROKEN',
  107 |         'No header currency switcher found. App appears to render listing prices in each listing\'s native currency only; no global currency selector.',
  108 |       );
  109 |     } else {
  110 |       record('S2 Currency switcher', 'FUNCTIONAL', 'Currency switcher located but switching/verification flow needs UI inspection.');
  111 |     }
  112 | 
  113 |     // Independent check: navigate to /listings and verify if a price card shows ₼/AZN naturally
  114 |     await page.goto('/listings');
  115 |     await page.waitForLoadState('domcontentloaded');
  116 |     await page.waitForTimeout(800);
  117 |     await snap(page, 'persona-2-s2-listings.png');
  118 |     const bodyText = (await page.locator('body').textContent()) ?? '';
  119 |     const hasAznSymbol = bodyText.includes('₼') || /\bAZN\b/.test(bodyText);
  120 |     if (hasAznSymbol) {
  121 |       record('S2 Currency display', 'PASSED', 'Some listing card on /listings is denominated in AZN (₼ or "AZN" found).');
  122 |     } else {
  123 |       record(
  124 |         'S2 Currency display',
  125 |         'UX',
  126 |         'No ₼/AZN found in listings — prices appear in USD/EUR/TRY only. AZ investor needs AZN view.',
  127 |       );
  128 |     }
  129 |     // Soft assertion — record finding regardless
  130 |     expect(typeof bodyText).toBe('string');
  131 |   });
  132 | 
  133 |   test('S3: Country switcher in header', async ({ page }) => {
  134 |     await page.goto('/');
  135 |     await page.waitForLoadState('domcontentloaded');
  136 | 
  137 |     const candidates = [
  138 |       'button[aria-label*="Ülke" i]',
  139 |       'button[aria-label*="Country" i]',
  140 |       'button[aria-label*="Ölkə" i]',
  141 |       'select[name="country"]',
  142 |       'button:has-text("🇹🇷")',
  143 |       'button:has-text("🇦🇿")',
  144 |     ];
```