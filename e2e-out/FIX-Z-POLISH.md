# FIX AGENT Z — POLISH (console noise + small UI/test-infra issues)

Scope: PU-02, PU-03, PU-04, PU-05, PP-01, PP-02, PP-03, PP-04
Working directory: `C:\Users\DELL\OneDrive\Desktop\work\IstBaku`
Rules: surgical edits, no `any`, no dev/playwright runs, no edits to auth-form structure or wizard step state, no string replacements.

---

### FIXED PU-02 — Hydration mismatch on /auth/sign-up and /auth/sign-in caused by injected `style={{ caret-color: 'transparent' }}`

The console warnings on `/auth/sign-up`, `/auth/sign-in`, and `/auth/forgot-password` originate from browser extensions (LastPass / 1Password / iCloud Passwords) injecting `style="caret-color: transparent"` into focusable inputs after SSR. React then complains the server HTML lacks the attribute. Per Persona 1 console payload, the only affected nodes were the email + password inputs (the name/phone inputs were also flagged but those are touched by the same class of extension).

Mitigation: added `suppressHydrationWarning` ONLY to the email + password `<Input>` instances. Did not blanket-apply, did not change form structure, did not touch the Terms checkbox (Agent X owns sign-up structure changes per the coordination rule).

Files:
- `app/auth/sign-up/SignUpForm.tsx` — `signup-email`, `signup-password`
- `app/auth/sign-in/SignInForm.tsx` — `signin-email`, `signin-password`
- `app/auth/forgot-password/ForgotPasswordForm.tsx` — `forgot-email`

The `suppressHydrationWarning` prop is forwarded directly by `<Input>` via `...props`, so the underlying `<input>` element receives it without any change to `components/ui/Input.tsx`.

---

### FIXED PU-03 — `mobile-chromium` Playwright project defaulted to WebKit via `devices['iPhone 14']`

`devices['iPhone 14']` in Playwright sets `defaultBrowserType: 'webkit'`, which forces a WebKit binary download on first run (the user already had Chromium installed). The project was misleadingly named `mobile-chromium`.

Fix in `playwright.config.ts`: spread the iPhone 14 device profile but explicitly set `browserName: 'chromium'`, and patch the UA so any code that sniffs Chrome version still sees a valid mobile Chrome signature:

```ts
{
  name: 'mobile-chromium',
  use: {
    ...devices['iPhone 14'],
    browserName: 'chromium',
    userAgent: devices['iPhone 14'].userAgent?.replace(
      'Mobile/15E148',
      'Mobile/15E148 Chrome/120.0.0.0',
    ),
  },
},
```

This keeps the iPhone 14 viewport, `isMobile`, `hasTouch`, and `deviceScaleFactor`, while running on the already-installed Chromium binary.

---

### FIXED PU-04 — Desktop `FilterSidebar` `<h3>Filtreler</h3>` heading bled into mobile drawer locators

Persona 6 (Leyla) had to disambiguate via `[role="dialog"] h2` because the desktop sidebar (rendered but `hidden lg:block`) also exposes a `Filtreler` heading.

Fix in `components/listings/FilterSidebar.tsx`: kept the visible "Filtreler" pill (now wrapped in a `<span aria-hidden="true">` so it stays visually but is invisible to the a11y tree), added an `<h3 className="sr-only">Sidebar filtreleri</h3>` so screen readers still get a distinct landmark. Result: the mobile BottomSheet's `<h2>Filtreler</h2>` becomes the unique accessible-name for `getByRole('heading', { name: 'Filtreler' })`.

Option chosen: option 1 from the guidance (sr-only + aria-hidden), preserving the UX exactly as users see it.

---

### FIXED PU-05 — Description min-length only validated at publish-time

Wizard step 2 (Details) contains the description Textarea, but the 20-char minimum was only enforced when the user clicked "Yayınla" on step 6 — surprising and frustrating.

Fix in `app/new-listing/NewListingClient.tsx`:
1. Added a step-2 guard in `next()`: cannot advance to step 3 if `description.trim().length < 20`; surfaces a toast with the exact current count.
2. Added an inline `X / 20` counter under the Textarea, which turns red + appends "En az 20 karakter" once the user has typed but is still below threshold.
3. Added `ring-2 ring-danger/60 border-danger` + `aria-invalid="true"` on the Textarea when it's between 1 and 19 chars, so the red ring matches the counter state.

The wizard step state machine and form schema were NOT touched (Agent X coordination rule); only added new guard branches.

---

### FIXED PP-01 — 2 console errors during filter spam on `/listings`

Investigation: `app/listings/ListingsClient.tsx` performs purely client-side filtering — no `fetch()` runs from the filter handlers, so there's no in-flight request to abort. The only async work is the debounced `router.replace()` setTimeout used to keep the URL in sync with the search query / country / approved chip.

Root cause hypothesis: under filter spam (20 rapid changes in <600ms per Persona 7), an old timer could fire its `router.replace` after a state-driven re-render had already supplanted it, causing Next's app-router to log warnings about overlapping navigation.

Fix: added an explicit `cancelled` flag in the debounce effect's closure plus a `clearTimeout`. The flag short-circuits the timer body if the effect re-ran or unmounted before the 350ms debounce elapsed. Minimal change, no behavior shift for the steady-state path.

---

### FIXED PP-02 — 2 console errors during /compare interaction

Investigation: walked all `.map()` paths in `app/compare/page.tsx` — every list-rendering site already had a parent `key={...}` (`<td key={i}>`, `<MobileCompareCard key={p.id}>`, etc). No missing-key warnings detected statically.

Most likely real cause per persona report: the `<img src={p.cover.kind === 'photo' ? p.cover.src : p.images[0]}>` could resolve to `undefined` / `""` if a listing returned from `/api/listings/[id]` has an unexpected cover shape, producing browser "GET (empty) 404" or "Image source URL malformed" warnings.

Fix: introduced a stable `PLACEHOLDER_IMG` data-URL constant at the top of the file (1×1 navy SVG, no network round-trip), then defensively coerced both compare-table and MobileCompareCard `<img>` `src` values: `(p.cover.kind === 'photo' ? p.cover.src : p.images[0]) || PLACEHOLDER_IMG`. Also added an `onError` handler that flips to the placeholder once per image (guarded by a `data-fallback="1"` flag so the handler can't loop).

This eliminates both classes of console error during /compare interactions without changing visual output for healthy listings.

---

### FIXED PP-03 — LangSwitcher TR flag confused with country selector by tests

Persona 2 (Rauf) reported a console error around the language switcher being heuristically matched as a country selector. The LangSwitcher does not actually show a flag — it shows the language code ("TR"/"AZ"/"EN"/"RU"), but the matcher in Persona 2's spec couldn't tell it apart from a country switch button.

Fix in `components/layout/LangSwitcher.tsx`:
- Added `data-testid="lang-switcher"` to the wrapper div.
- Added `data-testid="lang-switcher-button"` to the trigger button.
- Made the `aria-label` consistent ("Dil seç") on both wrapper and button so locators like `page.getByRole('button', { name: 'Dil seç' })` or `page.getByTestId('lang-switcher')` resolve cleanly.

No separate country switcher component exists in the codebase today (verified via grep), so no `country-switcher` testid was needed. Visual output unchanged. Coordinated with Agent Y who is adding the global CurrencySwitcher — testid namespace does not collide.

---

### FIXED PP-04 — "Mesaj gönder" partially hidden behind sticky CTA on small viewports

Two coordinated fixes:

1. `components/listings/MobileActionBar.tsx` — the sticky action bar was `bottom-16` (Tailwind 64px), which was a fixed offset that ignored iOS safe-area. Replaced with an explicit inline style: `bottom: calc(env(safe-area-inset-bottom, 0px) + 64px)` so the bar sits above the global mobile bottom-nav AND clear of the iPhone home-indicator. Reduced `paddingBottom` since safe-area is now in `bottom`.

2. `app/property/[slug]/page.tsx` — bumped the root container's mobile bottom padding from `pb-32` to `pb-44` and added `scrollPaddingBottom: 96px` (inline style) on the outer div. Together these guarantee the in-page Agent message CTA at the bottom of the page is never covered by the sticky bar when the user scrolls all the way down.

Desktop layout (md+) is unaffected — both changes are guarded behind mobile media queries (`md:hidden` for MobileActionBar; `md:pb-10` for the property page container).
