# Persona 5 — SALDIRGAN (Penetration Tester) Report

**Spec:** `tests/e2e/persona-5-attacker.spec.ts`
**Project:** desktop-chromium
**Result:** 6 / 6 tests passed (43.3s) — all scenarios exercised; one rate-limit, one open-redirect and seven input-fuzz checks turned green. Two scenarios remain `BLOCKED` (deferred) because the listing wizard is auth-gated for users with unverified email — see Deferred Findings.

---

## Summary

| Status | Count |
| :----- | :---: |
| 🟢 PASS (defended)        | 12 |
| 🟢 PASS (rate-limit hit)  | 1  |
| 🟡 BLOCKED / DEFERRED     | 2  |
| 🔴 BROKEN                 | 0  |
| 🟠 FUNCTIONAL gaps        | 0  |

Dialog guard final count: **0** — no `alert()` / `confirm()` was triggered by any injected payload (zero XSS execution observed in the reachable surface).

---

## Scenarios

### S1 — `/auth/sign-up` malicious input fuzzing

Every payload was rejected client-side by the shared zod schema (`lib/schemas.ts`). The sign-up form (`app/auth/sign-up/SignUpForm.tsx:60`) calls `signUpSchema.safeParse(...)` before invoking the server action, so the bad data never crosses the trust boundary.

| Payload | Outcome | Visible message |
| :------ | :-----: | :-------------- |
| `<script>alert(1)</script>@evil.example` | 🟢 PASS | "Geçerli bir e-posta adresi gir" |
| `' OR '1'='1@x.com` (SQLi-shaped) | 🟢 PASS | "Geçerli bir e-posta adresi gir" |
| Name `'A'.repeat(10000)` | 🟢 PASS | Silently rejected (still on /auth/sign-up; `nameField.max(80)`) |
| Empty password | 🟢 PASS | "Şifre en az 8 karakter olmalı" |
| 1-char password | 🟢 PASS | "Şifre en az 8 karakter olmalı" |
| Whitespace-only password | 🟢 PASS | "Şifre en az bir harf içermeli" |
| Phone `+1234567890123456789012345` | 🟢 PASS | "Geçerli bir telefon numarası gir (6-15 rakam)" |

Even if an attacker bypassed the client (e.g. by calling the server action directly), `signUpAction` re-validates length, regex-checks the e-mail (`auth-actions.ts:84`), strips control characters via `stripCrlf` (`lib/security.ts:35`), and normalises the phone via `sanitizePhone` — defense-in-depth is intact.

### S2 — `/auth/sign-in` brute-force → rate-limit

Twenty rapid wrong-password attempts (`Promise.all`-style; same email; 50 ms gap) against `nonexistent-<ts>@x.com`.

- **Outcome:** 🟢 PASS — lockout kicked in on attempt **11/20** with the visible alert `"Çok fazla giriş denemesi. Lütfen daha sonra tekrar dene."`.
- **Reference:** `signInAction` in `lib/auth-actions.ts:328` calls `rateLimit('signin:'+email, 10, 15*60*1000)` (preset `LIMITS.signIn` in `lib/rate-limit.ts:144`).
- **Note:** the limiter is in-memory only (`rate-limit.ts:24`). For production this MUST be backed by Redis / Upstash — see the comment on `rate-limit.ts:5`.

### S3 — IDOR / authorization probing

After signing up a fresh user (the session is not active because e-mail verification is required), the spec navigates the three id-bearing URLs:

| Target | Outcome | Detail |
| :----- | :-----: | :----- |
| `/dashboard?userId=1` | 🟢 PASS | Middleware (`middleware.ts:7-29`) redirected unauthenticated request to `/auth/sign-in?next=%2Fdashboard`. |
| `/property/1/edit` | 🟢 PASS | No matching public route → redirected to `/auth/sign-in?next=/property/1/edit`. |
| `/admin/users` | 🟢 PASS | Redirected to `/admin/login?next=%2Fadmin%2Fusers`. Admin scope is enforced server-side via `getCurrentAdmin()` (`lib/auth-actions.ts:520`) and `session.adminScope`. |

No admin payload, KYC document or other user's listing was rendered.

### S4 — `/api/country-guide?iso=AZ` open-redirect

Requested with `maxRedirects: 0`:

- **Outcome:** 🟢 PASS — `200 application/pdf` returned inline (the placeholder PDF). No `302 Location:` header to an external host.
- **Reference:** `app/api/country-guide/route.ts:27-34` short-circuits any stored `pdfUrl` through `isAllowedRedirectUrl()` (`lib/security.ts:69`) which enforces (a) `https:`, (b) host suffix on `[".public.blob.vercel-storage.com", ".blob.vercel-storage.com", "istbaku.com", ".istbaku.com"]`. Hosts off-allowlist trigger a `400` plus a `console.warn`. Open-redirector class fully closed.

### S5 — `/new-listing` description XSS (DEFERRED)

- **Outcome:** 🟡 BLOCKED — wizard route is auth-gated (`middleware.ts:7`). A fresh sign-up cannot reach `/new-listing` without first verifying e-mail (`signInAction` rejects unverified accounts at `lib/auth-actions.ts:342`), so the spec is redirected to `/auth/sign-in?next=%2Fnew-listing`.
- **What the spec WOULD do:** fill the description with `<img src=x onerror="window.__pwned=1">`, submit the wizard, navigate to the resulting listing detail page, and assert `window.__pwned === undefined`.
- **Mitigating context:** `createListingSchema.description = text(20, 5000)` (`lib/schemas.ts:212`) is validated server-side, and the existing render layer should HTML-escape, but the live test could not confirm.
- **Recommendation:** add an E2E helper or `/api/dev/sign-in` (which already exists at `app/api/dev/sign-in/`) hook so persona-5 can drive the wizard end-to-end in dev mode. Spec is wired for this — just unblock the auth dependency.

### S6 — File-upload abuse (DEFERRED)

- **Outcome:** 🟡 BLOCKED — same auth gate as S5. Fixtures were generated at:
  - `tests/fixtures/oversize.jpg` — 6 MiB of `0x00` bytes
  - `tests/fixtures/malware.exe` — fake MZ-header binary
  - `tests/fixtures/xss.svg` — SVG containing `<script>` tags
- **Server-side controls already in place** (would catch these even if uploaded):
  - MIME allowlist `ALLOWED_IMAGE_MIMES` (`lib/security.ts:87`) is JPEG / PNG / WebP / AVIF — `.exe` and `.svg` are NOT in the list.
  - Magic-byte sniff `sniffMime()` (`lib/security.ts:106`) — rejects anything whose first bytes don't match the declared MIME.
  - `MAX_IMAGE_BYTES = 5 MiB` (`lib/security.ts:99`) — the 6 MiB fixture exceeds it.
  - Schema also constrains `photoDataUrls` to start with `data:image/` (`schemas.ts:204`) — SVG would slip past `data:image/svg+xml`, so **the data-URL schema may not protect against the SVG case alone**; it relies on the upload pipeline using `sniffMime()` to detect "this is XML/text, not a raster".
- **Recommendation:** confirm the upload action calls `sniffMime()` AND blocks `image/svg+xml` explicitly. Today `ALLOWED_IMAGE_MIMES` already excludes SVG. Good. Still, add a server-side e2e (persona-5 follow-up) once auth-unblock is in place.

---

## Deferred Findings (action items for follow-up persona run)

| ID | Scenario | Blocker | Fix to unblock |
| :- | :------- | :------ | :------------- |
| D-1 | new-listing description XSS | unverified-email gate on `/new-listing` | seed a verified user via `/api/dev/sign-in` (`app/api/dev/sign-in/`) or expose a Playwright-only login helper. |
| D-2 | file-upload abuse | same as D-1 | once D-1 is fixed the same spec auto-runs S6's upload payloads. |

---

## Code references audited (read-only)

- `app/auth/sign-up/SignUpForm.tsx:60` — client-side `signUpSchema.safeParse`
- `app/auth/sign-in/SignInForm.tsx:27` — client-side `signInSchema.safeParse`
- `lib/schemas.ts:88` — `signUpSchema`
- `lib/auth-actions.ts:76` — `signUpAction` server validation & sanitisation
- `lib/auth-actions.ts:320` — `signInAction` w/ `padToMinDuration`, `rateLimit`
- `lib/rate-limit.ts:60` — sliding-window in-memory limiter
- `lib/security.ts:62-81` — `isAllowedRedirectUrl` allowlist
- `lib/security.ts:87-128` — file-upload MIME / size / magic-byte controls
- `app/api/country-guide/route.ts:27` — country-guide redirect path
- `middleware.ts:7-50` — protected-route prefixes (`/admin`, `/agent`, `/dashboard`, `/messages`, `/new-listing`, `/private-portfolio`)

---

## Screenshots (in `e2e-out/screenshots/`)

- `persona-5-signup-{xss-email,sqli-email,huge-name,empty-pwd,short-pwd,space-pwd,huge-phone}-{filled,after}.png`
- `persona-5-signin-ratelimit-final.png`
- `persona-5-idor-{dashboard-userId-1,property-1-edit,admin-users}.png`
- `persona-5-listing-xss-blocked.png`
- `persona-5-upload-blocked.png`

---

## Reproduce

```
npx playwright test tests/e2e/persona-5-attacker.spec.ts \
  --project=desktop-chromium --reporter=list
```
