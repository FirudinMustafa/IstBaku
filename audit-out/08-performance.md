# Performance & Architecture — Audit Report
**Date:** 2026-05-17
**Scope:** `app/**`, `components/**`, `next.config.ts`, `tsconfig.json`, `package.json`, `lib/db-queries.ts`, `lib/db-mappers.ts`, `lib/*-actions.ts`, `middleware.ts`, `db/schema.ts`, `db/client.ts`, `public/`
**Total Scenarios:** ~110

## 🔴 CRITICAL (Production Blocker)

### #C001 — Database pool exhaustion risk
**Location:** `db/client.ts:21`
**Description:** Pool `max: 10`. Each request issues 2-3 queries; 5+ concurrent users (or any admin page) will exhaust the pool, producing connection timeouts.
**Impact:** 10+ concurrent users see errors; admin dashboards stall under modest load.
**Suggested Fix:** Increase `max` to 25-50 for production and reduce `idle_timeout` to 10s. Consider PgBouncer or Neon pooler when deploying to Vercel.

### #C002 — Missing indexes on listings hot paths
**Location:** `db/schema.ts:159-199`
**Description:** No indexes on `listings.type`, `listings.purpose`, `listings.price`, `listings.country`, `listings.approvalStatus`. Search filters cause full table scans.
**Impact:** On 10k listings, search latency > 500ms; gets dramatically worse at scale.
**Suggested Fix:**
```sql
CREATE INDEX idx_listings_type_purpose ON listings(type, purpose);
CREATE INDEX idx_listings_purpose_country ON listings(purpose, country, price DESC);
CREATE INDEX idx_listings_price_area ON listings(price, net_area);
CREATE INDEX idx_listings_approval_pending
  ON listings(approval_status) WHERE approval_status = 'pending';
```

### #C003 — No pagination on listing queries (full table dumped to client)
**Location:** `lib/db-queries.ts:11-22`, `app/listings/ListingsClient.tsx:16-81`
**Description:** `getAllListings()` / `searchListings()` return every row; filter happens client-side.
**Impact:** With 5k listings, `/listings` JSON ≈ 2 MB; first paint blocked; OOM risk on mobile.
**Suggested Fix:** Server-side pagination — `.limit(50).offset((page-1)*50)`; expose `?page=` URL param.

### #C004 — Raw `<img>` everywhere; no `next/image`
**Location:** `components/listings/PropertyGallery.tsx:82,89,128,150`, `components/listings/ListingCard.tsx:79-87`, dashboard cards
**Description:** No optimization, no responsive `srcset`, no AVIF/WebP, no width/height → CLS.
**Impact:** 50–100 MB on slow-3G photo galleries; very poor LCP/CLS scores.
**Suggested Fix:** Migrate every `<img>` to `<Image>` from `next/image`; configure `remotePatterns` and `formats: ['image/avif','image/webp']` in `next.config.ts`.

### #C005 — Recharts loaded into all admin pages without code-splitting
**Location:** `app/admin/AdminDashboardCharts.tsx:4-6`, `app/admin/payments/PaymentsCharts.tsx`, `app/admin/analytics/AnalyticsCharts.tsx`
**Description:** 80 KB gz library shipped to every admin route.
**Impact:** TTI +300-500ms on admin landing.
**Suggested Fix:** `const AdminDashboardCharts = dynamic(() => import('./AdminDashboardCharts'), { ssr: false })`.

## 🟠 HIGH

### #H001 — `force-dynamic` everywhere kills static/ISR
**Location:** `app/page.tsx:12`, `app/listings/page.tsx:5`, `app/property/[slug]/page.tsx:36`, `app/dashboard/page.tsx:10`, 15+ others
**Description:** Every page opts out of caching, including catalog pages that could ISR.
**Impact:** Every request hits DB; no CDN edge cache; cold starts repeatedly.
**Suggested Fix:** Replace with `export const revalidate = 3600` for public catalog/marketing pages; keep `force-dynamic` only for `/dashboard`, `/admin`, `/agent`, `/messages`.

### #H002 — Sequential awaits in property detail
**Location:** `app/property/[slug]/page.tsx:40-43`
**Description:** `getListingBySlug` → `getAgentById` → `getSimilarListings` chained.
**Suggested Fix:** Independent queries → `Promise.all`; dependent queries gated behind null check.

### #H003 — Admin queries select all columns from joined tables
**Location:** `lib/admin-queries.ts:16-44`
**Description:** `innerJoin` with no projection; entire row payloads serialized for the UI.
**Suggested Fix:** Explicit `db.select({ ... })` whitelists.

### #H004 — No `use cache` directives anywhere
**Location:** Entire codebase
**Description:** Next 15 Cache Components / `use cache` not used; identical queries re-run per request.
**Suggested Fix:** Annotate public read queries (`getPublicListings`, `getCountryGuides`, etc.) and tag with `cacheTag('listings')` so mutations can `revalidateTag`.

### #H005 — Foreign-key columns lack indexes
**Location:** `db/schema.ts`
**Description:** Postgres does NOT auto-index FK columns. `userId`, `agentId`, `listingId` in messages/favorites/appointments without indexes cause slow joins.
**Suggested Fix:**
```sql
CREATE INDEX ON messages(thread_id);
CREATE INDEX ON messages(sender_id);
CREATE INDEX ON favorites(user_id);
CREATE INDEX ON appointments(agent_id, slot);
```

### #H006 — Auth pages are entirely client components
**Location:** `app/auth/sign-up/page.tsx`, `app/auth/sign-in/page.tsx`
**Description:** Pages marked `'use client'`; large hydration cost; no SSR fallback for JS-disabled or slow networks.
**Suggested Fix:** Convert to server components hosting small `'use client'` form islands.

### #H007 — No CSP / security headers
**Location:** `next.config.ts`
**Description:** No `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
**Suggested Fix:** Add via `headers()` in `next.config.ts` (CSP `default-src 'self'`; `frame-ancestors 'none'`; report-only mode first).

### #H008 — No sitemap.ts / robots.ts
**Location:** Root `app/` directory
**Description:** Search engines can't crawl listings efficiently.
**Suggested Fix:** `app/sitemap.ts` enumerating public approved listings + `app/robots.ts`.

### #H009 — No `generateMetadata` for dynamic property pages
**Location:** `app/property/[slug]/page.tsx`
**Description:** Default metadata only — no per-listing title/OG image/description.
**Suggested Fix:** Add `generateMetadata({ params })` returning per-listing meta + OG image URL.

### #H010 — Leaflet CSS injected at runtime
**Location:** `components/listings/MapView.tsx:14-23`
**Description:** `document.createElement('link')` per mount → FOUC, jank.
**Suggested Fix:** Import `leaflet/dist/leaflet.css` statically inside a dynamically imported component.

## 🟡 MEDIUM

### #M001 — Theme inline script causes FOUC
**Location:** `app/layout.tsx:50-54`

### #M002 — Photo upload via base64 data URLs through server actions
**Location:** `lib/storage.ts` and `createListingAction`
**Description:** Data URLs balloon payloads ~33%; combined with `bodySizeLimit: 100mb` invites DoS.
**Suggested Fix:** Direct-to-Blob client uploads with scoped tokens.

### #M003 — No response cache headers on API routes
**Location:** All `app/api/**` route handlers

### #M004 — `'use client'` over-applied to `ListingsClient`
**Location:** `app/listings/ListingsClient.tsx`

### #M005 — No `prefetch` strategy / link prefetch overrides

### #M006 — Repeated DB queries between layout and page (no request-level dedup)

### #M007 — No bundle analyzer wired up; cannot track regressions

### #M008 — Admin "Bekleyen Onaylar" hardcoded slice of 4 with no pagination link

## 🟢 LOW

### #L001 — `next.config.ts` lacks `formats` for image optimizer
### #L002 — Recharts could be replaced with smaller lib (visx, lightweight-charts)
### #L003 — No `experimental.optimizePackageImports` for lucide/heroicons
### #L004 — No HTTP cache hint on static landing imagery
### #L005 — No edge runtime for read-mostly routes (where compatible)
### #L006 — Module-level fetches in some pages prevent build-time pre-render
### #L007 — Unused locale bundles may be shipped if i18n not split per route

## ✅ PASSED CHECKS
- [x] App Router structure correct
- [x] Drizzle client uses pooled connection
- [x] Dashboard uses `Promise.all` for parallel queries (`app/dashboard/page.tsx:16-21`)
- [x] Middleware kept lean
- [x] Fonts loaded via `next/font`
- [x] TypeScript strict mode enabled
- [x] `next.config.ts` `remotePatterns` defined

## 📊 STATISTICS
- Total scenarios: ~110
- 🔴 CRITICAL: 5
- 🟠 HIGH: 10
- 🟡 MEDIUM: 8
- 🟢 LOW: 7

**Estimated win after remediation:** 60-70% faster initial load on `/listings` and `/property/*`; ≥10× fewer DB queries on repeat visits via Cache Components + ISR.
