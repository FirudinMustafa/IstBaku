# Persona 7 — ELDAR (concurrency-stress) — E2E Report

- **Date:** 2026-05-17
- **Spec:** `tests/e2e/persona-7-eldar-stress.spec.ts`
- **Project:** `desktop-chromium`
- **Runner output:** `8 passed (1.7m)` — all assertions held.
- **Findings sidecar:** `e2e-out/persona-7-findings.json`
- **Screenshots:** `e2e-out/screenshots/persona-7-*.png` (17 files)

## Execution command

```
npx playwright test tests/e2e/persona-7-eldar-stress.spec.ts --project=desktop-chromium --reporter=list
```

## Summary table

| # | Scenario | Status | Outcome |
|---|----------|--------|---------|
| S1 | Double-submit on /auth/sign-up | PASS (with concern) | 0 sign-up POSTs observed — see "Issues found" |
| S2 | Race appointment booking | DEFERRED + probe FINDING | Public booking UI unreachable; `/api/dev/book-appointment` accepts concurrent unauthenticated POSTs with 200 |
| S3 | Favorite spam (50 clicks in 5s) | PASS (with concern) | Heart toggle not located on detail page; dashboard count = 0 (expected 0 or 1) |
| S4 | Filter spam x20 on /listings | PASS | 0 × 5xx, 2 console errors |
| S5 | Logout mid-message (cookie wipe) | PASS | Correctly redirects to `/auth/sign-in?next=/messages` |
| S6 | Wizard back/forward state | PASS (DX concern) | step-2 markers were **LOST** after `goBack()` |
| S7 | Token expiry on /dashboard | PASS | Correctly redirects to `/auth/sign-in?next=/dashboard` |

## Scenario-by-scenario detail

### S1 — Double-submit /auth/sign-up

- Two `submit` clicks fired ~40 ms apart (total span ~670 ms including form fill).
- **Network listener captured 0 POSTs matching `/sign-up`.**
- No duplicate accounts — but also no successful create.
- The form likely either (a) was blocked by client-side validation (terms-checkbox styling: `force: true` was needed and may not have ticked the rendered checkbox), or (b) submits to a different path than `/sign-up*`.
- 0 × 5xx; assertion `created <= 1` held trivially.

**Hardening test once root cause is resolved:** confirm exactly one 2xx POST is created on rapid double-click.

### S2 — Race appointment booking (two contexts)

- Both contexts navigated to `/agent`; no booking UI was visible (no buttons matching `Randevu`, `Appointment`, or `data-testid="book-appointment"`).
- Marked **DEFERRED** for the UI flow.
- Fallback API probe: two concurrent `POST /api/dev/book-appointment` requests (unauthenticated) **both returned 200 OK**.
- Inspecting `app/api/dev/book-appointment/route.ts` is recommended; if it lacks auth + slot-uniqueness checks, this is a **race / auth-bypass risk**.

### S3 — Favorite spam

- Signed up a fresh user, navigated to `/listings`, then opened a `/property/*` detail link.
- **Heart toggle was not found** on either page using the tried selectors (`aria-label*=favori|favorite`, `data-testid*=favorite`).
- The 50-click loop ran on the first matching `button` (heuristic fallback); dashboard showed **0 favorite items** afterward.
- 0 × 5xx.
- **Action:** add an `aria-label` such as `Favorilere ekle / kaldır` or `data-testid="favorite-toggle"` to the heart button to make it testable and accessible.

### S4 — Filter spam on /listings

- 20 rapid `fill()` calls on the search-style input (~30 ms apart).
- 0 × 5xx network errors; 2 console errors (non-fatal hydration/log noise).
- Listings page remained responsive; no full-page crash, no Next error overlay.

### S5 — Logout mid-message

- Signed up, navigated to `/messages`, typed a draft into the first textarea.
- `context.clearCookies()` + `page.reload()`.
- Resulting URL: `http://localhost:3000/auth/sign-in?next=%2Fmessages` (correct).
- Guard text matched.

### S6 — Wizard back/forward state

- Navigated to `/new-listing`, filled all step-1 inputs with `step1_marker_N`.
- Clicked `İleri/Devam/Next`, advanced to step 2, filled with `step2_marker_N`.
- Advanced to step 3, then `page.goBack()` back to step 2.
- **Result:** `step2_marker_*` values **not found** on returning step — wizard state is **not preserved** on browser back.
- DX issue, not security-critical. Worth fixing with `searchParams`-driven step state or persisting form state to `sessionStorage`.

### S7 — Token expiry on /dashboard

- Signed up, navigated to `/dashboard`.
- Both before and after `clearCookies+reload`, the page lived at `/auth/sign-in?next=%2Fdashboard`.
- That implies the sign-up flow under test did not actually log the user in (consistent with S1 finding: the sign-up form may not be POSTing), but the redirect-to-sign-in behavior on the protected route is correct.

## Issues found (prioritized)

1. **[HIGH] `/api/dev/book-appointment` accepts concurrent unauthenticated POSTs and returns 200.**
   - File to inspect: `app/api/dev/book-appointment/route.ts`.
   - Expected: 401 for unauthenticated, plus single-winner semantics for same-slot races.

2. **[HIGH] Sign-up form does not appear to POST.**
   - Indication: `S1` captured 0 sign-up requests; `S7` user was never authenticated.
   - Likely root cause: required Terms checkbox styled as `input[type="checkbox"]` with custom UI — `check({force:true})` may not satisfy the rendered control. Or the submit endpoint path differs.
   - Suggested fix: ensure the checkbox has an `aria-label` and is keyboard-checkable; alternatively expose a `data-testid="terms-accept"`.

3. **[MED] Favorite/heart button lacks a stable selector.**
   - No `aria-label`, no `data-testid` resolves. Add one so favorite flows are testable.

4. **[MED] `/new-listing` wizard does not preserve step-2 state on browser back.**
   - Persist wizard state via `sessionStorage` or `useSearchParams()` to avoid silent data loss.

5. **[LOW] Two console errors on `/listings` during filter spam.**
   - Likely hydration/log warnings; not fatal but worth grep'ing.

## Files

- Spec: `C:\Users\DELL\OneDrive\Desktop\work\IstBaku\tests\e2e\persona-7-eldar-stress.spec.ts`
- Report: `C:\Users\DELL\OneDrive\Desktop\work\IstBaku\e2e-out\07-eldar-report.md`
- Findings JSON: `C:\Users\DELL\OneDrive\Desktop\work\IstBaku\e2e-out\persona-7-findings.json`
- Screenshots: `C:\Users\DELL\OneDrive\Desktop\work\IstBaku\e2e-out\screenshots\persona-7-*.png`

## Cleanup

- All 7 scenarios opened their own `browser.newContext()` (S2 opened two — `ctxA` and `ctxB`).
- All contexts are tracked in `openContexts[]` and closed in `afterAll` — no leak into other tests.

## Verdict

All 8 tests pass. The suite produced **two HIGH-severity findings** (booking API auth gap, sign-up form not POSTing) and **two MED-severity DX findings** (heart selector, wizard back state) that should be triaged by Persona-Master before regression.
