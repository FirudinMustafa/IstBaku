# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: persona-8-paula.spec.ts >> Scenario 1 — language switch EN + visible English strings + i18n leak scan
- Location: tests\e2e\persona-8-paula.spec.ts:140:5

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  73  |     // Filter out things like "www.x", "co.uk", file extensions, etc.
  74  |     if (m.endsWith('.com') || m.endsWith('.tr') || m.endsWith('.az')) return false;
  75  |     if (m.endsWith('.png') || m.endsWith('.jpg') || m.endsWith('.svg')) return false;
  76  |     if (m.endsWith('.ts') || m.endsWith('.tsx') || m.endsWith('.js')) return false;
  77  |     if (/^\d/.test(m)) return false;
  78  |     // Heuristic: i18n keys typically have a known namespace prefix
  79  |     const prefixes = [
  80  |       'nav.', 'hero.', 'common.', 'home.', 'cta.', 'features.', 'badges.',
  81  |       'footer.', 'reports.', 'legal.', 'calc.', 'bridge.', 'whatsapp.',
  82  |       'filter.', 'listing.', 'agent.', 'property.', 'auth.', 'dashboard.',
  83  |       'compare.', 'message.', 'notification.',
  84  |     ];
  85  |     return prefixes.some((p) => m.startsWith(p));
  86  |   });
  87  |   return filtered;
  88  | }
  89  | 
  90  | test.describe.configure({ mode: 'serial' });
  91  | 
  92  | test.beforeAll(() => {
  93  |   // Ensure output dirs exist
  94  |   fs.mkdirSync('e2e-out', { recursive: true });
  95  |   fs.mkdirSync('e2e-out/screenshots', { recursive: true });
  96  | });
  97  | 
  98  | test.afterAll(async () => {
  99  |   // Write Markdown report
  100 |   const lines: string[] = [];
  101 |   lines.push('# PERSONA 8 — PAULA (German foreign buyer · EN · EUR)');
  102 |   lines.push('');
  103 |   lines.push(`Generated: ${new Date().toISOString()}`);
  104 |   lines.push('');
  105 |   lines.push('## Summary');
  106 |   lines.push('');
  107 |   const counts = { pass: 0, fail: 0, partial: 0, info: 0 };
  108 |   for (const f of findings) counts[f.status]++;
  109 |   lines.push(`- PASS: ${counts.pass}`);
  110 |   lines.push(`- PARTIAL: ${counts.partial}`);
  111 |   lines.push(`- FAIL: ${counts.fail}`);
  112 |   lines.push(`- INFO: ${counts.info}`);
  113 |   lines.push('');
  114 |   lines.push('## Scenarios');
  115 |   lines.push('');
  116 |   for (const f of findings) {
  117 |     lines.push(`### ${f.scenario}`);
  118 |     lines.push('');
  119 |     lines.push(`Status: **${f.status.toUpperCase()}**`);
  120 |     lines.push('');
  121 |     for (const d of f.details) lines.push(`- ${d}`);
  122 |     lines.push('');
  123 |   }
  124 |   lines.push('## i18n Key Leaks Detected');
  125 |   lines.push('');
  126 |   if (i18nLeaks.size === 0) {
  127 |     lines.push('_None detected via heuristic pattern match._');
  128 |   } else {
  129 |     for (const k of [...i18nLeaks].sort()) lines.push(`- \`${k}\``);
  130 |   }
  131 |   lines.push('');
  132 |   lines.push('## Screenshots');
  133 |   lines.push('');
  134 |   for (const s of screenshotsTaken) lines.push(`- ${s}`);
  135 |   lines.push('');
  136 |   fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  137 |   fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
  138 | });
  139 | 
  140 | test('Scenario 1 — language switch EN + visible English strings + i18n leak scan', async ({ page }) => {
  141 |   const diag = attachDiagnostics(page);
  142 |   await page.goto('/');
  143 |   await page.waitForLoadState('domcontentloaded');
  144 |   await takeShot(page, '01-home-before-lang');
  145 | 
  146 |   const switched = await switchLanguageToEN(page);
  147 |   await page.waitForTimeout(700);
  148 |   await takeShot(page, '01-home-after-lang-en');
  149 | 
  150 |   const body = await page.locator('body').innerText().catch(() => '');
  151 |   const englishMarkers = [
  152 |     'Listings', 'Sign in', 'Reports', 'Legal', 'AI Match',
  153 |     'Private', 'Home', 'Search', 'Discover', 'Sign up',
  154 |   ];
  155 |   const found = englishMarkers.filter((m) => body.includes(m));
  156 | 
  157 |   // Harvest leaks
  158 |   const leaks = harvestI18nKeysFromText(body);
  159 |   leaks.forEach((k) => i18nLeaks.add(k));
  160 | 
  161 |   const details: string[] = [];
  162 |   details.push(`Language switcher trigger ${switched ? 'clicked successfully' : 'NOT FOUND'}.`);
  163 |   details.push(`Visible English strings found (out of ${englishMarkers.length}): ${found.length} → [${found.join(', ')}]`);
  164 |   details.push(`i18n key leaks on home (sample, max 10): ${leaks.slice(0, 10).join(', ') || 'none'}`);
  165 |   if (diag.consoleErrors.length) details.push(`Console errors: ${diag.consoleErrors.length}`);
  166 |   if (diag.pageErrors.length) details.push(`Page errors: ${diag.pageErrors.length}`);
  167 | 
  168 |   const status: FindingBucket['status'] = found.length >= 5 ? 'pass' : (found.length > 0 ? 'partial' : 'fail');
  169 |   if (found.length < 5) details.push('FUNCTIONAL GAP: fewer than 5 visible English markers on home after switching lang to EN.');
  170 | 
  171 |   record({ scenario: 'S1 — Language switch to EN', status, details });
  172 |   // Don't fail hard — we want all scenarios to run
> 173 |   expect(switched || found.length > 0).toBeTruthy();
      |                                        ^ Error: expect(received).toBeTruthy()
  174 | });
  175 | 
  176 | test('Scenario 2 — currency switcher to EUR + EUR symbol on listing card', async ({ page }) => {
  177 |   await page.goto('/');
  178 |   await switchLanguageToEN(page);
  179 |   await page.waitForTimeout(400);
  180 | 
  181 |   // Try to find any global currency switcher
  182 |   const candidates = [
  183 |     page.getByRole('button', { name: /eur|currency|para birimi/i }),
  184 |     page.locator('[data-currency-switcher]'),
  185 |     page.locator('select[name="currency"]'),
  186 |     page.getByRole('combobox', { name: /currency|para/i }),
  187 |   ];
  188 | 
  189 |   let foundSwitcher = false;
  190 |   for (const c of candidates) {
  191 |     if (await c.count()) {
  192 |       foundSwitcher = true;
  193 |       break;
  194 |     }
  195 |   }
  196 | 
  197 |   await page.goto('/listings');
  198 |   await page.waitForLoadState('networkidle').catch(() => {});
  199 |   await takeShot(page, '02-listings-card-currency');
  200 | 
  201 |   const body = await page.locator('body').innerText().catch(() => '');
  202 |   const hasEUR = body.includes('€') || /\bEUR\b/.test(body);
  203 |   const hasUSD = body.includes('$') || /\bUSD\b/.test(body);
  204 |   const hasTRY = body.includes('₺') || /\bTRY\b/.test(body);
  205 |   const hasAZN = body.includes('₼') || /\bAZN\b/.test(body);
  206 | 
  207 |   const details: string[] = [];
  208 |   details.push(`Global currency switcher detected: ${foundSwitcher}`);
  209 |   details.push(`Listing page currencies visible — EUR: ${hasEUR}, USD: ${hasUSD}, TRY: ${hasTRY}, AZN: ${hasAZN}`);
  210 |   if (!foundSwitcher) {
  211 |     details.push('FUNCTIONAL GAP: No global currency switcher in the header — currency appears to be per-listing (each listing has its own native currency).');
  212 |   }
  213 |   const status: FindingBucket['status'] = hasEUR ? 'pass' : (foundSwitcher ? 'partial' : 'fail');
  214 |   if (!hasEUR) details.push('FUNCTIONAL GAP: No EUR-priced listings visible on /listings landing.');
  215 | 
  216 |   record({ scenario: 'S2 — Currency to EUR', status, details });
  217 | });
  218 | 
  219 | test('Scenario 3 — /listings filters Antalya + villa + 3+1 + pool + 300-800k', async ({ page }) => {
  220 |   const diag = attachDiagnostics(page);
  221 |   await page.goto('/listings');
  222 |   await page.waitForLoadState('domcontentloaded');
  223 |   await switchLanguageToEN(page).catch(() => {});
  224 |   await page.waitForTimeout(400);
  225 | 
  226 |   const details: string[] = [];
  227 | 
  228 |   // Country = Türkiye (TR) — click chip if present
  229 |   const trChip = page.getByRole('button', { name: /türkiye|turkey|🇹🇷/i }).first();
  230 |   if (await trChip.count()) {
  231 |     await trChip.click().catch(() => {});
  232 |     details.push('Clicked Türkiye country chip.');
  233 |   } else {
  234 |     details.push('Türkiye country chip not found.');
  235 |   }
  236 |   await page.waitForTimeout(300);
  237 | 
  238 |   // City select → Antalya
  239 |   const citySelect = page.locator('select').filter({ hasText: /tüm şehirler|all cities|antalya/i }).first();
  240 |   if (await citySelect.count()) {
  241 |     await citySelect.selectOption({ label: 'Antalya' }).catch(async () => {
  242 |       await citySelect.selectOption('Antalya').catch(() => {});
  243 |     });
  244 |     details.push('Selected Antalya in city select.');
  245 |   } else {
  246 |     // Fallback: try any select on page that includes Antalya
  247 |     const allSelects = page.locator('select');
  248 |     const n = await allSelects.count();
  249 |     let picked = false;
  250 |     for (let i = 0; i < n; i++) {
  251 |       const opts = await allSelects.nth(i).locator('option').allInnerTexts();
  252 |       if (opts.some((o) => /antalya/i.test(o))) {
  253 |         await allSelects.nth(i).selectOption({ label: 'Antalya' }).catch(() => {});
  254 |         picked = true;
  255 |         details.push(`Selected Antalya in select index ${i}.`);
  256 |         break;
  257 |       }
  258 |     }
  259 |     if (!picked) details.push('City select with Antalya not found.');
  260 |   }
  261 |   await page.waitForTimeout(400);
  262 | 
  263 |   // Villa chip
  264 |   const villaChip = page.getByRole('button', { name: /^villa$/i }).first();
  265 |   if (await villaChip.count()) {
  266 |     await villaChip.click().catch(() => {});
  267 |     details.push('Clicked Villa property-type chip.');
  268 |   } else {
  269 |     details.push('FUNCTIONAL GAP: Villa chip not found (or not localized in EN).');
  270 |   }
  271 | 
  272 |   // 3+1 chip
  273 |   const r31 = page.getByRole('button', { name: /^3\+1$/ }).first();
```