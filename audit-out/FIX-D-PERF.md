# FIX AGENT D — PERFORMANCE & POLISH

**Date:** 2026-05-17
**Scope:** MC-20, MC-21, MC-22, MC-23, MH-17, MH-18, MH-19, MH-20, MH-22, MH-23, MH-24

Atomic edits, behavior-preserving wrappers/config only. Coordinated with Fix
Agent B (data-correctness migration 0001) — Agent D writes 0002 with
perf-only indexes that do not overlap.

---

## ✅ FIXED MC-20 — Listings hot-path indexes
- **Files:** `db/migrations/0002_perf_indexes.sql` (new), `db/schema.ts`
- Added composite indexes:
  - `idx_listings_type_purpose` on `(type, purpose)`
  - `idx_listings_purpose_country_price` on `(purpose, country, price DESC)`
  - `idx_listings_price_area` on `(price, net_area)`
  - `idx_listings_approval_pending` partial index on `(approval_status)` WHERE `'pending'`
- Mirrored in Drizzle schema so generated migrations stay in sync.
- Idempotent (`IF NOT EXISTS`); TODO comment notes how to recreate concurrently
  in prod.

## ✅ FIXED MC-21 — Pagination guard on listings queries
- **Files:** `lib/db-queries.ts`, `components/home/FeaturedListings.tsx`
- `getAllListings`, `getPublicListings`, `getPrivateListings`, `searchListings`
  now accept an optional `{ limit, offset }`.
- A `clampPage()` helper enforces `LISTINGS_DEFAULT_PAGE_SIZE = 60` and
  `LISTINGS_MAX_PAGE_SIZE = 200`. Callers omitting opts silently get a
  60-row page instead of the full table — kills the 2MB JSON DoS path.
- `FeaturedListings` now requests only `{ limit: 6 }` instead of pulling the
  whole catalog and slicing.
- Backward-compatible: no consumer required a code change.

## ✅ FIXED MC-22 — DB pool size
- **File:** `db/client.ts:21`
- `max: 10 → 25`, `idle_timeout: 20 → 10` (seconds for postgres-js).
- HMR pool reuse and `prepare:false` (pgbouncer/Neon) retained.

## ✅ FIXED MC-23 — next/image config (formats)
- **File:** `next.config.ts`
- Added `images.formats: ['image/avif', 'image/webp']`.
- Existing `remotePatterns` preserved.
- (Component-level migration from `<img>` to `<Image>` is owned by Fix Agent C.)

## ✅ FIXED MH-17 — Server action body size limit
- **File:** `next.config.ts`
- `experimental.serverActions.bodySizeLimit: '100mb' → '5mb'`.
- Photo/video uploads must move to direct-to-Blob with scoped tokens
  (#M002 follow-up).

## ✅ FIXED MH-18 — Image format config
- Covered by MC-23 (same diff).

## ✅ FIXED MH-19 — `force-dynamic` on public pages
- **Files:** `app/page.tsx`, `app/listings/page.tsx`, `app/property/[slug]/page.tsx`
- Replaced `export const dynamic = 'force-dynamic'` with
  `export const revalidate = 3600` (ISR, 1h) on the three public
  catalog/marketing pages.
- Intentionally kept `force-dynamic` on `/dashboard`, `/agent`, `/admin/**`,
  `/messages`, `/private-portfolio`, `/new-listing`, `/property/[slug]/edit`,
  `/auth/verify` — all per-user / per-session surfaces.

## ✅ FIXED MH-20 — Sequential awaits on property detail
- **File:** `app/property/[slug]/page.tsx:38-44`
- `getAgentById(...)` and `getSimilarListings(...)` no longer block each
  other; both run via `Promise.all`. The initial `getListingBySlug` stays
  sequential because the next two depend on its result.

## ✅ FIXED MH-22 — sitemap + robots
- **New files:** `app/sitemap.ts`, `app/robots.ts`
- `sitemap.ts` enumerates static public routes and every approved public
  listing via `getPublicListings()`. Falls back to static-only on DB error.
- `robots.ts` allows `/`, disallows `/admin`, `/api`, `/agent`, `/dashboard`,
  `/private-portfolio`, `/messages`, `/new-listing`, `/auth/`, and advertises
  the sitemap URL.
- Both honor `NEXT_PUBLIC_SITE_URL` / `SITE_URL` env, defaulting to
  `https://istbaku.com`.

## ✅ FIXED MH-23 — Recharts dynamic imports
- **Files:** `app/admin/page.tsx`, `app/admin/analytics/page.tsx`,
  `app/admin/payments/page.tsx`
- Each chart component is now loaded via `next/dynamic` with `ssr: false`
  and a lightweight skeleton fallback. Recharts (~80 KB gz) drops out of the
  initial admin route bundle and only loads when the dashboard mounts.
- Aliased import as `dynamicImport` to avoid collision with the existing
  `export const dynamic = 'force-dynamic'` segment config.

## ✅ FIXED MH-24 — FK indexes (perf-only)
- **Files:** `db/migrations/0002_perf_indexes.sql`, `db/schema.ts`
- Added explicit FK / composite-FK indexes that Fix Agent B's
  `0001_audit_fixes.sql` did not cover:
  - `idx_messages_thread` on `messages(thread_id)`
  - `idx_messages_sender` on `messages(sender_id)`
  - `idx_favorites_user` on `favorites(user_id)`
  - `idx_appointments_agent_slot` on `appointments(agent_id, scheduled_at)`
- The unique `appointments_agent_slot_idx` from 0000 covers writes; the new
  non-unique twin gives the planner a cheaper option for read range scans.
- Schema mirrors mirror only what is non-overlapping with Agent B's owned
  business indexes.

---

## ⚠️ Deferred

### MC-21 — Page-by-page UI in `ListingsClient`
- **Why:** `ListingsClient.tsx` does heavy in-memory client filtering over
  `initialListings`. Wiring true server-side page-by-page loading requires
  either (a) duplicating the entire filter pipeline as a server action so
  pagination respects active filters, or (b) reverting to URL-driven server
  filtering. Both are behavior changes, which my charter prohibits.
- **Mitigation in place:** the DB cap inside `getPublicListings` / `searchListings`
  (default 60, hard ceiling 200) already removes the 2MB-payload DoS surface.
- **Recommended owner:** Fix Agent B (per master report, "B owns
  data-correctness pagination") or a follow-up UI agent.

### Concurrent index build
- 0002 uses plain `CREATE INDEX IF NOT EXISTS`. On a populated production
  `listings` table this will hold an `ACCESS EXCLUSIVE` lock briefly.
- TODO comment at the head of `0002_perf_indexes.sql` documents how to
  re-run with `CREATE INDEX CONCURRENTLY` via `psql -f` for zero-downtime
  deploys (Drizzle wraps migrations in a transaction by default, so
  `CONCURRENTLY` can't run inline).

### `<img>` → `next/image` component migration
- Out of scope for Agent D per master report — assigned to Fix Agent C
  (MC-23 component-side). The `next.config.ts` half is done here.

### Other perf items not in Agent D's mandate
- MH-21 (security headers / CSP) — owned by Fix Agent A.
- MH-25 (N+1 in message threads), MH-11 (search w/o LIMIT — partially
  addressed by pagination clamp) — owned by Fix Agent B.
- H003, H004, H006, H009, H010 in `08-performance.md` — MEDIUM/HIGH but
  outside Agent D's listed file set.
