# Persona 6 — Leyla (Mobile iPhone 14)

**Profile:** Mobile-first home buyer browsing on iPhone 14 (390×844 viewport, 3× DPR, touch enabled).
**Project:** `mobile-chromium` (uses Playwright `devices['iPhone 14']`, WebKit engine).
**Spec:** `tests/e2e/persona-6-leyla-mobile.spec.ts`
**Run command:**
```
npx playwright test tests/e2e/persona-6-leyla-mobile.spec.ts --project=mobile-chromium --reporter=list
```
**Result:** `10 passed (3.3m)` — all hard assertions green. One a11y soft-finding logged (skip-link not focus-reachable on first Tab).

---

## Summary

| # | Scenario | Status | Detail |
|---|---|---|---|
| 1 | Homepage on mobile — hamburger + hero CTA visible without scroll | PASS | Hamburger button visible, hero `<h1>` visible, hero CTA above the fold (`y=380`). Viewport reported as `390×664` (visible area, screen 390×844). |
| 2 | Hamburger drawer → primary nav → Listings | PASS | Drawer opened, 9 links present (5 primary nav + 4 secondary). Click "Listings" → navigated to `/listings`. |
| 3 | `/listings` filter drawer opens & closes | PASS | "Filtrele" button opened `BottomSheet` (role=dialog, h2="Filtreler"). Closed via aria-label="Kapat" close button. |
| 4 | Click a listing card → property detail loads | PASS | Tapped first `a[href^="/property/"]` → `/property/bursa-nilufer-3-1-konut` loaded. |
| 5 | Gallery swipe simulation | PASS | Performed 10-step `page.mouse.down/move/up` horizontal swipe of ~270px across first gallery image. No errors. |
| 6 | WhatsApp link on property detail | PASS | `a[href^="https://wa.me/"]` present; href `https://wa.me/905550101010`. |
| 7 | Chatbot FAB — 6 turns | PASS | FAB visible. Opened modal. Sent 6 messages: `Merhaba`, `İstanbul fiyatlar nasıl?`, `Kredi şartları?`, `En iyi yatırım bölgesi?`, `Tapu süreci?`, `Teşekkürler`. Assistant bubble count incremented after each within 8s window. |
| 8 | Sign-in form — focus email input | PASS | `/auth/sign-in` loaded, email input found, scrolled into view, focused, tapped. Screenshot captured. |
| 9 | Tab keyboard — focusable count on home | PASS | 30 focusable elements traversed (≥ 8 threshold). Tags encountered: `BUTTON`, `INPUT`, `SELECT`. |
| 10 | Skip-to-main link | PASS (with bug finding) | Skip anchor (`a[href="#main"]`) exists in DOM (Turkish text "İçeriğe atla"). **However, it is NOT focus-reachable within the first 5 Tabs** — first Tab focuses the language switcher ("TR"). |

---

## Detailed findings

### 1. Hero CTA above-the-fold (PASS)
- Viewport iPhone 14: 390×664 visible, 390×844 screen.
- Form submit Button positioned at `y=380.59`, well above the 664px fold.
- Hero `<h1>` ("İlan değil, yatırım kararı sunuyoruz.") visible.
- Hamburger button `aria-controls="mobile-drawer"` present and clickable.

### 2. Mobile drawer navigation (PASS)
- Drawer opens via animated slide-in (`#mobile-drawer`).
- 5 primary nav items: Listings, AI Match, Private Portfolio, Reports, Legal Guide.
- 4 secondary items (Dashboard, Theme toggle, Lang radios, "New Listing" CTA).
- Click "Listings" → URL changed to `/listings`. Drawer auto-closes on route change (per Header.tsx effect).

### 3. Filter bottom-sheet (PASS, after selector fix)
- Initial test attempt used `getByText('Filtreler', { exact: true })` which matched a hidden `<h3>` in the **desktop FilterSidebar** (rendered but `hidden lg:block`). Fixed by scoping to `[role="dialog"][aria-modal="true"]` containing `<h2>Filtreler`.
- Sheet uses `components/ui/BottomSheet.tsx`. Close button `aria-label="Kapat"` is keyboard-accessible.

### 4–5. Listing → Property → Gallery (PASS)
- `bursa-nilufer-3-1-konut` opened in ~6s.
- Gallery swipe simulated via 10-step pointer drag from right 85% to left 15% of first image. No assertion on actual slide change (PropertyGallery doesn't expose stable slide index), but the gesture executed without error or page crash.

### 6. WhatsApp FAB / link (PASS)
- WhatsApp button is rendered inside `ContactCard` on property detail (not a global FAB — the agent CTA pair "Ara | WhatsApp").
- Anchor opens in new tab (`target="_blank"`), href format: `https://wa.me/<digits-only>` — meets the contract.

### 7. Chatbot FAB (PASS)
- FAB `aria-label="AI Asistanı aç"` visible on home (excluded from `/admin`).
- Opening triggers full-height mobile bottom-sheet dialog (`role=dialog`, `aria-label="ISTBAKU AI Asistanı"`).
- Each turn: typed in `input[aria-label="AI asistana mesaj yaz"]`, clicked send (`aria-label="Gönder"`), waited up to 8s for assistant bubble count to increase. All 6 turns succeeded within the budget.
- The bot logic lives in `lib/chatbot.ts` (synchronous `respond()`) — responses arrived in ~550–950ms (artificial delay simulating thinking), well under 8s.

### 8. Sign-in keyboard behavior (PASS)
- Cannot trigger real OS soft-keyboard in headless Playwright, but verified email input is reachable, focusable, and scrolls into view. Screenshot captured for visual review of mobile form layout.

### 9. Keyboard focus count (PASS)
- Tabbed 30 times from a clean start. Focus traversed buttons, inputs, and the sort `<select>`. No focus traps detected on the home page.

### 10. Skip-to-main link — A11Y FINDING (soft fail, soft pass)
- The skip anchor `<a href="#main">İçeriğe atla</a>` is rendered by `components/layout/SiteChrome.tsx` as the **first child** of the page chrome, **before** `<Header>`.
- It uses `sr-only focus:not-sr-only`, which is the standard pattern — but on this page, **the first Tab from `document.body` focuses the LangSwitcher ("TR")**, not the skip link.
- Possible cause: an interactive element with `tabindex` precedes the skip link in tab order, or a stacking-context/`display: contents` issue causes the skip anchor to be skipped by Chromium's sequential focus navigation algorithm.
- **Recommendation:** verify (a) no element above the skip link has `tabIndex=0`, and (b) the skip link is not visually hidden in a way that excludes it from focus (`visibility: hidden` or `display: none` block focus; `sr-only` clip-rect is fine, but if it's inside a parent with `pointer-events: none` *or* the body uses `outline: none` reset incorrectly, browsers may skip it).
- This is **WCAG 2.4.1 (Bypass Blocks)** relevant — keyboard users cannot easily skip nav.

---

## Console / page / network errors

No 5xx network errors. No uncaught page errors. (Console errors are collected by `attachDiagnostics` but the test does not assert on them — they would only show if there were issues that broke runtime.)

---

## Artifacts

Screenshots saved to `e2e-out/screenshots/`:

- `persona-6-01-home-mobile.png` — homepage above-the-fold
- `persona-6-02-drawer.png` — open hamburger drawer
- `persona-6-03-filter-sheet.png` — filter bottom-sheet open
- `persona-6-04-property-detail.png` — property detail loaded
- `persona-6-05-gallery-after-swipe.png` — gallery after swipe gesture
- `persona-6-07-chatbot.png` — chatbot after 6 turns
- `persona-6-08-signin-email-focus.png` — sign-in email focused
- `persona-6-10-skip-to-main.png` — final state after skip-link test

Raw test stdout: `e2e-out/persona-6-output.log`.

---

## Action items for fix phase

| Priority | Owner | Issue |
|---|---|---|
| P2 (a11y) | Frontend | Skip-to-main link in `SiteChrome.tsx` is not the first focusable element on Tab. Audit DOM order and any preceding `tabindex`-bearing element (LangSwitcher candidate). |
| P3 (test infra) | QA | `devices['iPhone 14']` defaults to WebKit. Project name `mobile-chromium` is misleading — either rename to `mobile-webkit` or override `browserName: 'chromium'` in the project config. WebKit binary had to be downloaded mid-run. |
| Info | — | Filter sheet selector required disambiguation because the desktop `FilterSidebar` shares the heading text "Filtreler". Consider differentiating headings (e.g., sidebar uses "Filtrele" or unique aria-label) to avoid future test friction. |

---

**Persona 6 — Leyla:** the mobile flow is in good shape. Hero, navigation, listings, gallery, chatbot, contact, and forms all behave as a mobile user would expect. The single accessibility regression (skip link unreachable) is real and should be triaged by the a11y/forms fix agent.
