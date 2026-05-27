# Persona 4 — ADMIN (super-admin moderation) E2E Report

- **Spec:** `tests/e2e/persona-4-admin.spec.ts`
- **Project:** `desktop-chromium` (viewport 1280×800)
- **Base URL:** `http://localhost:3000`
- **Run command:**
  `npx playwright test tests/e2e/persona-4-admin.spec.ts --project=desktop-chromium --reporter=list`
- **Result:** `1 passed (15.9s)` — spec self-assertions met; functional findings logged below.
- **Date:** 2026-05-17

## Executive Summary

The unauthenticated gating and login form rendering both work correctly. However, **logging in with the seeded admin credentials failed**, which blocks every authenticated scenario (4–7). This matches the briefing's prediction: the dev server was not restarted after `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` were added to `.env.local`, OR the seeded admin user simply does not exist in the database. The failing login left the user on `/admin/login` with no `[role="alert"]` toast surfaced — the form silently rejected the credentials.

Scenarios 4–7 are marked **BLOCKED** (not FAIL): they cannot be executed without an admin session and should be re-run after the dev server is restarted (or after an admin user is seeded/promoted). The spec is designed to be safely re-runnable end-to-end as soon as auth works.

## Scenario Matrix

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Unauth `/admin` redirects to `/admin/login` | PASS | Redirected to `/admin/login?next=%2Fadmin` |
| 2 | `/admin/login` form visible | PASS | Email + password inputs rendered |
| 3 | Login with `admin@istbaku.test` / `Admin2026!QA` | FAIL | Submit stayed on `/admin/login`; no `[role="alert"]` toast surfaced |
| 4.dashboard | `/admin` snapshot | BLOCKED | No admin session |
| 4.approvals | `/admin/approvals` snapshot | BLOCKED | No admin session |
| 4.users | `/admin/users` snapshot | BLOCKED | No admin session |
| 4.agents | `/admin/agents` snapshot | BLOCKED | No admin session |
| 4.kyc | `/admin/kyc` snapshot | BLOCKED | No admin session |
| 4.payments | `/admin/payments` snapshot | BLOCKED | No admin session |
| 4.analytics | `/admin/analytics` snapshot | BLOCKED | No admin session |
| 4.reports | `/admin/reports` snapshot | BLOCKED | No admin session |
| 4.audit | `/admin/audit` snapshot | BLOCKED | No admin session |
| 4.country-guides | `/admin/country-guides` snapshot | BLOCKED | No admin session |
| 5 | Click first "Approve" on `/admin/approvals` | BLOCKED | No admin session |
| 6 | `/admin/analytics` Recharts SVGs render | BLOCKED | No admin session |
| 7 | Logout via header/sidebar → `/admin/users` gated | BLOCKED | No admin session |

## Findings — Detail

### F-04-01 (FUNCTIONAL, blocker for persona 4) — Seeded admin credentials cannot log in
- **Where:** `/admin/login`
- **Repro:** Visit `/admin/login`, enter `admin@istbaku.test` + `Admin2026!QA`, submit.
- **Observed:**
  - URL after submit: `http://localhost:3000/admin/login` (no redirect).
  - No visible error alert in `[role="alert"]` after 8s wait → the failure surface is either silent or the toast is rendered outside the expected role.
  - No 5xx network errors recorded; no browser console errors.
- **Most likely cause (per persona briefing):** The dev server was not restarted after the new `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` env vars were added to `.env.local`, so `adminSignInAction` is still seeing the pre-update env. Secondary possibility: the seeded admin user was never inserted into the DB.
- **UX sub-finding:** Even when credentials are wrong, the form should surface an error in the `[role="alert"]` slot that the component already declares (it's wired in `app/admin/login/page.tsx` via `setErr`). A silent rejection is a poor experience.
- **Recommended next steps for the fix phase:**
  1. Restart the dev server and rerun the spec.
  2. If still failing, verify the admin user exists (`select id, email, role from users where role = 'super_admin'` against the linked Postgres).
  3. Inspect `adminSignInAction` (`@/lib/auth-actions`) for an early `return { ok: false }` path that does not populate `error`.

### F-04-02 (INFO) — Unauthenticated gating is correct
- `/admin` → 302 to `/admin/login?next=%2Fadmin`. The `next` query param is preserved, so post-login redirect should work once F-04-01 is resolved.

### F-04-03 (INFO) — Login form rendering is correct
- The form is server-rendered with proper `<label>` + `<input>` pairing, `autocomplete="username"` / `autocomplete="current-password"`, and a `loading` state on the submit button. No accessibility issues spotted in the snapshot.

## Diagnostics

- Browser console errors: none
- Page errors: none
- 5xx network errors: none

The clean diagnostic surface is itself a clue — `adminSignInAction` is a server action that likely returned `{ ok: false }` without raising. The lack of an alert text rendered in `[role="alert"]` suggests either `res.error` was null/empty or the toast portal isn't being scoped to the expected element.

## Artifacts

Screenshots (under `e2e-out/screenshots/`):

- `persona-4-01-unauth-admin.png` — redirect to `/admin/login` from unauth `/admin`
- `persona-4-02-login-form.png` — login form before any input
- `persona-4-login-filled.png` — form populated with seeded creds, pre-submit
- `persona-4-03-after-login.png` — post-submit state (still on `/admin/login`)

(Scenarios 4–7 produce no screenshots because they are blocked.)

Raw run log: `e2e-out/persona-4-run.log`

## Re-run Plan (once F-04-01 is fixed)

The spec is idempotent. After restarting the dev server (or seeding/promoting an admin), re-run:

```
npx playwright test tests/e2e/persona-4-admin.spec.ts --project=desktop-chromium --reporter=list
```

Expected additional screenshots once authenticated:
`persona-4-04-{dashboard,approvals,users,agents,kyc,payments,analytics,reports,audit,country-guides}.png`,
`persona-4-05-approvals-{before,after}.png`,
`persona-4-06-analytics.png`,
`persona-4-07-{after-logout,users-postlogout}.png`.
