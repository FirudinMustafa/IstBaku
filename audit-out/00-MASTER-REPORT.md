# ISTBAKU — Master Audit Report (Chief Auditor Triage)
**Date:** 2026-05-17
**Scan agents:** 8 parallel (Auth, API, DB, UI/UX, Forms, Business Logic, AI/Integrations, Performance)
**Total scenarios executed:** ~1,560
**Sources:**
- `audit-out/01-auth-security.md`
- `audit-out/02-api-security.md`
- `audit-out/03-database-integrity.md`
- `audit-out/04-ui-ux-a11y.md`
- `audit-out/05-forms-validation.md`
- `audit-out/06-business-logic.md`
- `audit-out/07-ai-integrations.md`
- `audit-out/08-performance.md`

---

## 🔴 CRITICAL — Production Blockers (must fix before launch)

| # | Title | Source | Location |
|---|---|---|---|
| MC-01 | Hardcoded admin credentials in source + rendered on admin login page | 01, 06 | `lib/admin-auth.ts:15-19`, `app/admin/login/page.tsx:14-119` |
| MC-02 | Iron-session uses fallback dev secret when env missing | 06 | `lib/session.ts:13-17` |
| MC-03 | Middleware enforces NO auth — every gate is per-page | 01, 06 | `middleware.ts:3-12` |
| MC-04 | `/api/dev/**` exposes all server actions unauthenticated when `NODE_ENV !== 'production'` | 02, 06 | `app/api/dev/**` |
| MC-05 | No rate limiting anywhere (sign-in/up, verify, forgot-pwd, send-message, appointment, AI) | 01, 02, 06, 07 | All auth + msg actions |
| MC-06 | 6-digit OTP brute-forceable; no attempt limiter; old codes not invalidated | 01, 06, 07 | `lib/auth-actions.ts:89-91, 121` |
| MC-07 | IDOR on `updateListingAction` — dynamic patch lets clients set `approvalStatus`, `agentId`, `istbakuApproved` | 02 | `lib/listing-actions.ts` |
| MC-08 | Premium tier upgrade writes `providerRef:'mock-…'` — no real payment integration | 06 | `lib/listing-actions.ts:235-291` |
| MC-09 | `createAppointmentAction` accepts unauthenticated booking + slot race (SELECT-then-INSERT) | 02, 06 | `lib/appointment-actions.ts:19-43` |
| MC-10 | `getPrivateListings()` reachable with no auth / no KYC gate | 06 | `app/private-portfolio/page.tsx:6-14` |
| MC-11 | Vercel Blob bucket is unconditionally `access:'public'` — KYC docs world-readable | 07 | `lib/storage.ts:16` |
| MC-12 | Blob upload: no MIME whitelist, no magic-byte sniff, no size cap | 02, 05, 07 | `lib/storage.ts`, `next.config.ts:8` |
| MC-13 | `/api/country-guide?iso=…` is open redirector to admin-controlled `pdfUrl` | 07 | `app/api/country-guide/route.ts:25` |
| MC-14 | No zod / runtime schema validation on any server action | 02, 05 | All `lib/*-actions.ts` |
| MC-15 | Appointments unique-slot race condition | 03, 06 | `lib/appointment-actions.ts:28-31` |
| MC-16 | Favorite double-click corrupts counter (ON CONFLICT swallowed but counter still ++) | 03 | `lib/favorite-actions.ts:14-16` |
| MC-17 | Notification type enum drift between schema and migration | 03 | `db/schema.ts` vs `db/migrations/0000_keen_unicorn.sql` |
| MC-18 | Cascade delete on listings wipes message threads (data loss) | 03, 06 | `db/schema.ts` FK definitions |
| MC-19 | Auto-approval bypass for non-premium listings | 06 | `lib/listing-actions.ts:130` |
| MC-20 | Listings table missing indexes on hot WHERE/ORDER BY columns | 03, 08 | `db/schema.ts:159-199` |
| MC-21 | No pagination on `getAllListings/searchListings`; full table dumped client-side | 02, 08 | `lib/db-queries.ts:11-22` |
| MC-22 | DB pool `max:10` will exhaust under modest load | 08 | `db/client.ts:21` |
| MC-23 | Raw `<img>` everywhere — no `next/image`, no width/height → LCP/CLS regression | 04, 08 | All listing/property components |
| MC-24 | No form labels (`htmlFor`) / `aria-invalid` / `aria-live` — screen readers cannot use the app | 04 | `components/ui/Input.tsx:59-64`, `Toast.tsx:33-58` |
| MC-25 | No focus traps / focus return on Modal, BottomSheet, drawer, chatbot, lightbox | 04 | `components/ui/Modal*`, `Header*`, `ChatBot*` |
| MC-26 | Stored XSS vector: user-supplied content rendered in HTML email templates | 05, 07 | `lib/email.ts:50-55` |
| MC-27 | `signUpAction` TOCTOU on duplicate email | 05 | `lib/auth-actions.ts:67-73` |
| MC-28 | Country-guide `pdfUrl` accepts `javascript:` URI (admin-XSS) | 05 | `lib/guide-actions.ts` + render path |
| MC-29 | Session not rotated on login (session fixation) | 01 | `lib/auth-actions.ts` (signInAction) |
| MC-30 | Hard delete of users/listings — no soft-delete, GDPR / audit trail gaps | 02, 03 | `lib/listing-actions.ts:deleteListingAction` |

## 🟠 HIGH — Major bugs / missing controls

| # | Title | Source | Location |
|---|---|---|---|
| MH-01 | CSRF/Origin not verified on `/api/dev/**` JSON endpoints | 02 | `app/api/dev/**` |
| MH-02 | Account enumeration via timing on sign-in / forgot-pwd | 01, 02, 07 | `auth-actions.ts` |
| MH-03 | bcrypt cost 10 (recommend 12+) | 01 | `lib/auth-actions.ts` |
| MH-04 | Session timeout 30 days; not invalidated on password reset / suspend | 01, 06 | `lib/session.ts` |
| MH-05 | `requireAdmin()` does not distinguish moderator vs super_admin | 06 | `lib/admin-actions.ts:13-17` |
| MH-06 | Moderator can suspend admins, approve KYC, delete guides | 06 | admin actions |
| MH-07 | `updateListingAction` doesn't re-queue approval after edits | 06 | `lib/listing-actions.ts:193-215` |
| MH-08 | `getAgentAppointments`/`getBookedSlotsAction` leak visitor PII | 06 | `lib/appointment-actions.ts` |
| MH-09 | Stored XSS: message body and listing description not sanitized | 02 | render paths |
| MH-10 | `verifyEmailWithToken` SELECT-then-UPDATE race | 06 | `lib/auth-actions.ts` |
| MH-11 | Search w/o LIMIT → DoS | 02, 08 | `lib/db-queries.ts` |
| MH-12 | Email header injection via display name / subject | 07 | `lib/email.ts:50-55` |
| MH-13 | KYC documents rendered via `<a href={d.url}>` with no protocol check | 05 | KYC review UI |
| MH-14 | Phone validation only `length>=2` | 02, 05 | `signUpAction`, profile updates |
| MH-15 | Lat/lng accept NaN/Infinity | 05 | `createListingAction` |
| MH-16 | Floats used for money; hardcoded stale FX rates | 07 | `lib/currency.ts` |
| MH-17 | `bodySizeLimit:'100mb'` in `next.config.ts` is way too high | 02, 07 | `next.config.ts:8` |
| MH-18 | No `next/image`; no `formats: ['image/avif','image/webp']` | 08 | `next.config.ts:11-19` |
| MH-19 | `force-dynamic` on every page kills ISR | 08 | 15+ pages |
| MH-20 | Sequential awaits on property detail | 08 | `app/property/[slug]/page.tsx:40-43` |
| MH-21 | No CSP / X-Frame-Options / nosniff / Referrer-Policy | 08, 07 | `next.config.ts` |
| MH-22 | No sitemap.ts / robots.ts / generateMetadata | 08 | `app/` |
| MH-23 | Recharts in every admin route bundle | 08 | `app/admin/**/*Charts.tsx` |
| MH-24 | FK columns lack indexes | 03, 08 | `db/schema.ts` |
| MH-25 | N+1 in message threads | 03 | `lib/db-queries.ts` |
| MH-26 | No unique email constraint exception handling at sign-up | 03 | `signUpAction` |
| MH-27 | Empty/whitespace-only strings accepted in many text fields | 05 | All forms |
| MH-28 | Stacked sticky bars consume >75% of mobile viewport on property page | 04 | layout components |
| MH-29 | Below-44px touch targets on ListingCard heart/compare, Toast close | 04 | `components/listings/ListingCard.tsx`, `Toast.tsx` |
| MH-30 | Toast auto-dismiss 4.5 s violates WCAG 2.2.1 | 04 | `components/ui/Toast.tsx` |
| MH-31 | Footer dead `href="#"` links incl. KVKK / legal | 04 | `components/layout/Footer.tsx` |
| MH-32 | Nested interactive elements (`<Link>` wrapping `<button>` in ListingCard) | 04 | ListingCard |
| MH-33 | Auth pages entirely client-rendered | 04, 08 | `app/auth/**` |
| MH-34 | `display:none` color contrast failures on `--fg-faint` | 04 | tokens |
| MH-35 | No `prefers-reduced-motion` handling | 04 | global |

## 🟡 MEDIUM (~70+ across reports)
Highlights:
- Soft-delete schema missing across entities (03)
- `approvalLevel` missing CHECK constraint (03)
- Price column ambiguous (cents vs major-unit) (03)
- Static admin "Bekleyen Onaylar" hardcoded to 4 items (08)
- Theme inline script causes FOUC (08)
- Saved-search filters accept arbitrary JSON (03)
- Notifications no real-time channel (06)
- Chatbot is client-side; intents fully public (07)
- No SPF/DKIM/DMARC startup checks (07)
- No KVKK consent capture at signup (07)
- RTL drawer slides from right always (04)
- Custom checkbox in FilterSidebar breaks focus management (04)
- Phone country picker has zero keyboard support (04)
- Inline scripts breach future CSP (08)

## 🟢 LOW (~80+)
- Dep pinning style (`^`)
- bcryptjs (pure JS) on Node
- Recharts replaceable
- Unused appointment enum value
- Logs print recipient email + subject
- Picsum / unsplash hosts still allowlisted in `next.config.ts`
- ZWS / emoji handling in slug generation
- HTTP cache hints absent

---

## 📈 Aggregate Statistics

| Severity | Count |
|---|---|
| 🔴 CRITICAL | 30 (master) / ~50 unique across 8 reports |
| 🟠 HIGH | 35 (master) / ~110 unique |
| 🟡 MEDIUM | ~80 |
| 🟢 LOW | ~120 |
| **Total findings (deduped)** | **~340** |
| **Total test scenarios run** | **~1,560** |

---

## 🛠️ Fix-Agent Allocation (PHASE 3)

### Fix Agent A — SECURITY
Handles: MC-01..06, MC-11..14, MC-26, MC-28, MC-29, MH-01..04, MH-12, MH-13, MH-21
Files: `lib/session.ts`, `lib/auth-actions.ts`, `lib/admin-auth.ts`, `app/admin/login/page.tsx`, `middleware.ts`, `app/api/dev/**`, `app/api/country-guide/route.ts`, `lib/email.ts`, `lib/storage.ts`, `next.config.ts`

### Fix Agent B — BUSINESS LOGIC & DATA
Handles: MC-07..10, MC-15..19, MC-30, MH-05..11, MH-14..16, MH-25, MH-26
Files: `lib/listing-actions.ts`, `lib/appointment-actions.ts`, `lib/favorite-actions.ts`, `lib/admin-actions.ts`, `lib/auth-actions.ts`, `db/schema.ts` + new migration, `lib/guide-actions.ts`

### Fix Agent C — UI/UX & FORM VALIDATION
Handles: MC-14 (zod adoption), MC-23..25, MH-27..35
Files: `components/ui/**`, `components/listings/**`, `app/auth/**`, `app/new-listing/**`, all form pages

### Fix Agent D — PERFORMANCE / POLISH
Handles: MC-20..23, MH-17..23, MH-28-29 (size-related), plus MEDIUM/LOW perf items
Files: `db/schema.ts` (indexes), `db/client.ts`, `next.config.ts`, `app/sitemap.ts` (new), `app/robots.ts` (new), all page-level `force-dynamic` removals, `app/property/[slug]/page.tsx`, admin chart imports

---

## ✅ Production-Readiness Gate Criteria
1. Zero 🔴 CRITICAL remaining
2. ≥ 80% of 🟠 HIGH addressed
3. `npm run typecheck` → 0 errors
4. `npm run lint` → 0 errors
5. `npm run build` → success
6. CSP + security headers shipped
7. Real rate limiter active
8. Migration adds indexes + soft-delete columns + soft delete on listings
9. Blob bucket private for KYC; size + MIME enforced
10. Admin login no longer shipping credentials in source
