# ISTBAKU — Persona E2E Master Triage
**Date:** 2026-05-17
**Suite:** Playwright, 8 personas, 67 real browser scenarios on a live `localhost:3000` dev server.
**Source reports:**
- `e2e-out/01-ayse-report.md` (TR buyer)
- `e2e-out/02-rauf-report.md` (AZ investor)
- `e2e-out/03-mehmet-report.md` (TR agent)
- `e2e-out/04-admin-report.md` (super-admin)
- `e2e-out/05-attacker-report.md` (pen-test)
- `e2e-out/06-leyla-report.md` (mobile)
- `e2e-out/07-eldar-report.md` (concurrency)
- `e2e-out/08-paula-report.md` (EN/EUR foreign buyer)

**Playwright run totals:** 8 specs · 8/8 specs themselves passed (the specs deliberately wrap individual scenarios with a non-failing `safe()` wrapper so the entire 12-step journey produces a digestible triage signal; product issues are encoded as findings, not red tests).

---

## 🔴 BROKEN (production blockers — fix first)

| ID | Title | Persona | Location |
|----|---|---|---|
| PB-01 | `/api/dev/book-appointment` returns 200 for two concurrent **unauthenticated** POSTs to the same slot | 7 Eldar | `app/api/dev/book-appointment/route.ts` |
| PB-02 | Admin login with seeded `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` silently rejected (no `[role=alert]`, no toast) | 4 Admin | `app/admin/login/page.tsx`, `lib/auth-actions.ts:adminSignInAction` |
| PB-03 | Public sign-up: no agent/office role selector — every signup is `role:user`, blocking professional onboarding | 3 Mehmet | `app/auth/sign-up/SignUpForm.tsx` |
| PB-04 | Premium tier still publishes for free — payment gate not visible in the wizard UI (audit fix MC-08 wired in actions but not surfaced in the wizard CTA) | 3 Mehmet | `app/new-listing/NewListingClient.tsx`, `lib/listing-actions.ts` |
| PB-05 | CSP blocks `unpkg.com` Leaflet CSS → map view unstyled (visible on `/listings` map toggle and `/new-listing` location step) | 1 Ayşe, 3 Mehmet | `next.config.ts` CSP `style-src`, `components/listings/MapView.tsx` |
| PB-06 | `/legal-guide` is hardcoded TR — no foreign-buyer entry, no PDF library, breaks EN/AZ users | 8 Paula | `app/legal-guide/page.tsx` |
| PB-07 | Chatbot ignores active locale — TR placeholder + TR replies even when lang=EN | 8 Paula | `components/chat/ChatbotFAB.tsx`, `lib/chatbot.ts` |

## 🟠 FUNCTIONAL (broken-but-recoverable)

| ID | Title | Persona |
|----|---|---|
| PF-01 | No global currency switcher in header → AZN/EUR/USD/TRY can't be toggled site-wide (cards stay USD only) | 2 Rauf, 8 Paula |
| PF-02 | `FilterSidebar` strings hardcoded TR (`Filtreler`, `Sıfırla`, `Havuz`, etc.) — EN/AZ users see TR labels | 8 Paula |
| PF-03 | `/auth/sign-up` form doesn't actually POST in a Playwright `dblclick` flow — custom Terms checkbox isn't toggled by `.check({force:true})`; likely real users on click-with-touch could hit the same path | 1 Ayşe, 7 Eldar |
| PF-04 | After sign-up, no auto-login; user must hold a 15-min OTP they cannot retrieve in test/dev environments → /private-portfolio still bounces them to /auth/sign-in | 1, 2 |
| PF-05 | No user-facing KYC submission form (only an admin review queue is wired) | 2 Rauf, audit ref MC-10/MC-30 partial |
| PF-06 | New-listing wizard loses **step-2 state on browser back** — silent data loss | 7 Eldar |
| PF-07 | Edit-after-publish does not surface a "re-queued for approval" notice — user sees instant-approve UX even though server re-queues | 3 Mehmet |
| PF-08 | Wizard demands ≥ 3 photos but copy hints "at least 1" — surprises users who try to publish minimal listings | 3 Mehmet |
| PF-09 | Wizard step 1 has no empty-state guard — Satılık+Konut pre-selected so İleri always advances even without intent | 3 Mehmet |
| PF-10 | Skip-to-main link `<a href="#main">İçeriğe atla</a>` exists but is not the first Tab target (lang switcher steals focus first) | 6 Leyla |
| PF-11 | Heart/favorite toggle has no `aria-label` or `data-testid` — undiscoverable to assistive tech and to automation | 7 Eldar |
| PF-12 | `/reports` has no Antalya / city-specific market trends content | 8 Paula |
| PF-13 | Property detail does not surface a discoverable "Message agent" CTA above the fold on at least some listings | 8 Paula |
| PF-14 | Even on bad admin credentials, `/admin/login` should populate the `[role=alert]` slot it declares — silent rejection is a UX-+-debug pain | 4 Admin |

## 🟡 UX (polish layer)

| ID | Title | Persona |
|----|---|---|
| PU-01 | Filter price input USD-only; persona Ayşe brought a TL budget → 0-result trap | 1 |
| PU-02 | Console: hydration mismatch on `/auth/sign-up` and `/auth/sign-in` caused by extension/server-injected inline style (`caret-color: transparent`) | 1 |
| PU-03 | `mobile-chromium` Playwright project resolves to `devices['iPhone 14']`, which defaults to WebKit; reusing the Chromium binary requires `browserName: 'chromium'` override | 6 (test infra) |
| PU-04 | Desktop `FilterSidebar` ships a hidden `<h3>Filtreler` heading that bleeds into mobile selectors — break locator isolation | 6 (test infra) |
| PU-05 | Description min-length (20) only validated at publish-time, not on the step-3 → step-4 transition | 3 |

## 🟢 POLISH (nice-to-haves)

| ID | Title | Persona |
|----|---|---|
| PP-01 | 2 console errors during filter spam on `/listings` (non-fatal hydration noise) | 7 |
| PP-02 | 2 console errors during /compare interaction | 2 |
| PP-03 | LangSwitcher uses a TR flag `🇹🇷` button that Playwright's country-switch heuristic confused with a country selector | 2 |
| PP-04 | "Mesaj gönder" button is partially hidden behind the sticky CTA on small viewports | 8 (likely; not measured) |

---

## ✅ CONFIRMED PASSING (post-fix from MISSION 1)

- Sign-up zod schema rejects all 7 hostile payloads (XSS, SQLi, 10K name, etc.) — Persona 5
- Sign-in rate limiter (`signin:${email}`) kicks in at attempt 11/20 with the localized "Çok fazla giriş denemesi…" message — Persona 5
- IDOR attempts on `/dashboard?userId=…`, `/property/1/edit`, `/admin/users` all blocked by `middleware.ts` — Persona 5
- `isAllowedRedirectUrl()` allowlist neutralises open-redirector class on `/api/country-guide` — Persona 5
- Public read flow: home → /listings → /property/[slug] → favorite gate → /messages signed-out redirect — Persona 1
- AZ-language switch populates nav with `Elanlar / Hesabatlar / Hüquqi Bələdçi` — Persona 2
- AI Match wizard renders 5 results for Yatırım/10y/500K USD — Persona 2
- Compare table shows 3 listings side-by-side — Persona 2
- /private-portfolio correctly redirects anonymous users to `/auth/sign-in?next=/private-portfolio` — Persona 2
- Full 7-step listing wizard publishes for the seeded user end-to-end — Persona 3 (via dev-only `POST /api/dev/sign-in`)
- Mobile hamburger drawer, hero CTA above-fold, gallery swipe, WhatsApp `wa.me` link, chatbot 6-turn conversation — Persona 6
- 30 focusable elements traversable by Tab on home — Persona 6
- Logout-mid-message → `/auth/sign-in?next=/messages`; protected-route redirect → `/auth/sign-in?next=/dashboard` — Persona 7
- Filter spam: 0 × 5xx across 20 rapid changes — Persona 7
- Home EN switch renders 7/10 expected English markers — Persona 8

---

## 📊 Aggregate

| Severity | Count |
|---|---:|
| 🔴 BROKEN | 7 |
| 🟠 FUNCTIONAL | 14 |
| 🟡 UX | 5 |
| 🟢 POLISH | 4 |
| **TOTAL findings** | **30** |
| **Scenarios executed (real Playwright)** | **67** |
| **Specs passing at suite level** | **8 / 8** |
| **Screenshots captured** | **120 +** |

---

## 🛠️ Fix-Agent Allocation (PHASE 3)

### Fix Agent X — BROKEN + FUNCTIONAL (production blockers)
PB-01, PB-02, PB-03, PB-04, PB-05, PF-03, PF-04, PF-06, PF-07, PF-08, PF-09, PF-11, PF-14
Files: `app/api/dev/book-appointment/route.ts`, `app/admin/login/page.tsx`, `lib/auth-actions.ts`, `app/auth/sign-up/SignUpForm.tsx`, `app/new-listing/NewListingClient.tsx`, `next.config.ts` (CSP), `components/listings/MapView.tsx`, `components/listings/ListingCard.tsx`, listing-edit page, sign-up form Terms checkbox

### Fix Agent Y — i18n + Currency + UX (PB-06, PB-07 + PF-01, PF-02, PF-05, PF-10, PF-12, PF-13, PU-01)
Files: `components/layout/Header.tsx` (add CurrencySwitcher), `components/listings/FilterSidebar.tsx` (i18n), `app/legal-guide/page.tsx`, `lib/chatbot.ts`, `components/chat/ChatbotFAB.tsx`, `app/reports/**`, new user-facing KYC form, `components/layout/SiteChrome.tsx` (skip-link order), `app/property/[slug]/**` (visible Message CTA)

### Fix Agent Z — POLISH + console noise (PU-02..PU-05, PP-01..PP-04)
Files: `app/auth/sign-up/*`, `app/auth/sign-in/*`, `playwright.config.ts` (browserName override), `components/listings/FilterSidebar.tsx` (heading aria), `components/ui/ListingCard.tsx` (sticky CTA z-index)
