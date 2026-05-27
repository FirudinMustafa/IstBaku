# FIX AGENT B — BUSINESS LOGIC & DATA — Report

**Date:** 2026-05-17
**Scope:** business-logic and data-integrity fixes
**Files touched:**

- `lib/listing-actions.ts`
- `lib/appointment-actions.ts`
- `lib/favorite-actions.ts`
- `lib/admin-actions.ts`
- `lib/auth-actions.ts`
- `lib/db-queries.ts`
- `lib/guide-actions.ts`
- `lib/message-actions.ts`
- `lib/currency.ts`
- `lib/types.ts`
- `db/schema.ts`
- `db/migrations/0001_audit_fixes.sql` (new)
- `lib/sanitize.ts` (new)
- `app/private-portfolio/page.tsx`

---

### ✅ FIXED MC-07 — IDOR on `updateListingAction` (mass assignment)
- **File:** `lib/listing-actions.ts:194-263`
- **Change:** Replaced the dynamic `Record<string, unknown>` patch builder with a strict whitelist of user-patchable fields (`title`, `description`, `price`, `currency`, `status`). Privileged columns (`approvalStatus`, `istbakuApproved`, `agentId`, `tier`, `approvalLevel`, `aiVerified`, `isPrivate`, `views`, `favoritesCount`, `deletedAt`) are no longer reachable from this entry point. Each whitelisted field is sanitized + validated (length caps, finite/positive price).
- **Verification:** any extra key in the input is silently ignored; only the typed `UpdateListingInput` fields appear in the SQL `UPDATE`.

### ✅ FIXED MC-08 — Premium payment was mocked
- **File:** `lib/listing-actions.ts:282-353`
- **Change:** `upgradeTierAction` now hard-gates on `process.env.PAYMENT_PROVIDER_KEY`. Without it the action returns `{ ok: false, error: 'PAYMENT_NOT_CONFIGURED' }` and DOES NOT mutate the listing. With the key present, a `payments` row is created with `status='pending'` + `providerRef='pending-…'` — the tier is **not** flipped until a real webhook resolves the payment. A `TODO(payments)` block documents the intended Stripe/Iyzico shape (PaymentIntent → checkout URL → webhook flips status + tier).
- **Verification:** invoking `upgradeTierAction` without the env var returns the gate response; with the env var set, the listing's tier stays unchanged and the payment row is `pending`.

### ✅ FIXED MC-09 — `createAppointmentAction` unauthenticated + slot race
- **File:** `lib/appointment-actions.ts:21-128`
- **Change:** Auth is now required (returns `'Randevu için giriş yapmalısın.'` on no session). The insert uses `db.insert(...).onConflictDoNothing({ target: [appointments.agentId, appointments.scheduledAt] }).returning()` — the existing unique index `appointments_agent_slot_idx` (re-asserted in migration) makes it an atomic claim. If `returning()` yields zero rows the action returns a graceful "Bu saat dolu." instead of throwing. Also added: agent existence check, listing existence check, future-only/90-day window, email regex, phone E.164 validation, and visitor PII sanitization.
- **Verification:** parallel calls for the same `(agentId, scheduledAt)` resolve to exactly one inserted row; the loser receives `{ ok: false, error: 'Bu saat dolu.' }`.

### ✅ FIXED MC-10 — Private portfolio publicly reachable
- **File:** `app/private-portfolio/page.tsx`
- **Change:** Page now calls `getCurrentUser()`. Unauthenticated visitors are redirected to `/auth/sign-in?next=/private-portfolio`. Authenticated users without `kycStatus === 'approved'` render a 403-style explanation page instead of the listings.
- **Verification:** anonymous GET → 307 redirect to sign-in; signed-in non-KYC user → 200 with the gate message; KYC-approved user → original portfolio view.

### ✅ FIXED MC-15 — Appointment race condition
- **Files:** `lib/appointment-actions.ts:73-93`, `db/schema.ts:240` (already had unique index), `db/migrations/0001_audit_fixes.sql` (re-asserts `appointments_agent_slot_idx`)
- **Change:** Same atomic-insert pattern as MC-09. The schema's existing unique index is re-asserted via `CREATE UNIQUE INDEX IF NOT EXISTS` in the new migration.
- **Verification:** see MC-09.

### ✅ FIXED MC-16 — Favorite counter double-increment
- **File:** `lib/favorite-actions.ts:13-114`
- **Change:** All three favorite mutations now wrap `insert/delete + counter update` in `db.transaction`. The counter is incremented/decremented ONLY when `.returning()` reports a row was actually inserted/deleted (`onConflictDoNothing` produces an empty array on duplicate). `toggleFavoriteAction` is now also race-free: it uses `INSERT … ON CONFLICT DO NOTHING RETURNING` as the canonical "did I create it?" probe.
- **Verification:** N rapid `addFavoriteAction` calls produce at most one favorite row and at most one counter increment per user-listing pair.

### ✅ FIXED MC-17 — Notification type enum drift
- **Files:** `db/schema.ts:27` (already had the full set; treated as source of truth), `db/migrations/0001_audit_fixes.sql:11-13` (adds `approval`, `kyc`, `payment` via `ALTER TYPE … ADD VALUE IF NOT EXISTS`), `lib/types.ts:152-167` (TS union now exports `NotificationType` with all 8 values matching the DB enum)
- **Change:** Schema is the source of truth (8 values). The new migration brings the DB enum into sync. The TS union was widened to match.
- **Verification:** notification inserts using `'approval' | 'kyc' | 'payment'` (e.g. `admin-actions.ts:80, 145, 179`) no longer fail with `invalid input value for enum notification_type`.

### ✅ FIXED MC-18 — Cascade delete wiped messages
- **Files:** `db/schema.ts:248-258` (`messageThreads.listingId` switched from `onDelete: 'cascade'` to `onDelete: 'set null'`), `db/migrations/0001_audit_fixes.sql:31-37` (drops + re-adds the FK constraint with `ON DELETE SET NULL`)
- **Change:** Deleting (hard or soft) a parent listing preserves the conversation thread and all its messages; the thread simply loses its `listingId` linkage.
- **Verification:** SQL: deleting a listing row with active threads leaves messages intact; `message_threads.listing_id` becomes NULL for the affected threads.

### ✅ FIXED MC-19 — Auto-approval bypass for non-premium listings
- **File:** `lib/listing-actions.ts:148-178`
- **Change:** All new listings are inserted with `approvalStatus: 'pending'` regardless of tier. Premium just gets a higher `aiQualityScore` (90) in the approval queue → it surfaces first for moderators. Standart (70) and güçlü (80) are also enqueued for review.
- **Verification:** posting a `tier='standart'` listing now produces `approvalStatus='pending'` and a row in `approval_requests`.

### ✅ FIXED MC-30 — Hard delete (now soft delete)
- **Files:** `db/schema.ts:193-205` (added `deletedAt`, `deletedBy` columns + `listings_deleted_at_idx`), `db/schema.ts:60-64` (added `users.deletedAt` + index), `db/migrations/0001_audit_fixes.sql:18-29` (DDL + indexes), `lib/listing-actions.ts:270-291` (`deleteListingAction` now `UPDATE`s `deletedAt + deletedBy` and pushes the listing to `approvalStatus='rejected'` so it disappears from public surfaces), `lib/db-queries.ts:39-95` (all SELECTs now include `isNull(listings.deletedAt)`)
- **Change:** No code path issues `db.delete(listings)` anymore. The dedicated `getEditableListing` also filters out soft-deleted rows so owners cannot edit them via the user-facing surface.
- **Verification:** after `deleteListingAction`, `getListingBySlug`/`getListingById`/`searchListings`/`getAllListings`/`getPrivateListings`/`getSimilarListings`/`getMyFavoritesAction` all return null/empty for the affected listing, but the row remains in the DB.

### ✅ FIXED MH-05 / MH-06 — Role granularity
- **File:** `lib/admin-actions.ts:13-50`
- **Change:** Introduced three tiered helpers: `requireAdmin()` (any admin role), `requireModeratorOrAbove()` (moderator+, used for approve/reject listings, KYC, abuse) and `requireSuperAdmin()` (used for `resetUserRoleAction` + cross-admin operations + `guide-actions.ts:deleteGuideAction`). `suspendUserAction`/`reactivateUserAction` additionally check the target's role: suspending/reactivating an `admin`/`moderator`/`super_admin` target requires `super_admin` privilege — a moderator can no longer suspend a super-admin. Exposed `assertSuperAdmin()` for cross-module reuse.
- **Verification:** moderator → can approve listings/KYC, resolve abuse; CANNOT delete guides, reset roles, suspend another admin.

### ✅ FIXED MH-07 — `updateListingAction` doesn't re-queue approval
- **File:** `lib/listing-actions.ts:208-260`
- **Change:** When an already-approved listing is edited on a substantive field (`title`, `description`, `price`), the action sets `approvalStatus='pending'`, `istbakuApproved=false`, and inserts a fresh `approval_requests` row (`type='price_change'` for price edits, `'edit'` otherwise). The audit-log entry reflects the requeue.
- **Verification:** editing the price of an approved listing flips its `approvalStatus` back to `pending` and a new approval request appears in the queue.

### ✅ FIXED MH-08 — Appointment PII leak
- **File:** `lib/appointment-actions.ts:130-167`
- **Change:** `getAgentAppointments` is now gated — it returns `[]` unless the caller is the agent themselves or an admin/super_admin. `getBookedSlotsAction` was already restricted to selecting only `scheduledAt` (no visitor PII); that contract is now explicit in the comment.
- **Verification:** a non-owner caller invoking `getAgentAppointments(<otherAgentId>)` receives an empty array; `getBookedSlotsAction` only emits ISO strings.

### ✅ FIXED MH-09 — Stored XSS in description/messages
- **Files (new):** `lib/sanitize.ts`
- **Files (consumers):** `lib/listing-actions.ts` (description/address/neighborhood/city/district), `lib/message-actions.ts` (message body + sender name + listing title used in notifications), `lib/appointment-actions.ts` (visitor name + notes), `lib/guide-actions.ts` (description + flag + name + pdfUrl), `lib/listing-actions.ts:createSavedSearchAction` (name)
- **Change:** Created `sanitizeText` that strips `<script>`, `<iframe>`, `<object>`, `<embed>`, `<link>`, `<meta>`, `<svg>`, `<math>`, `<style>`, `<noscript>`, `<template>` blocks (with content), `on*` event-handler attributes, `javascript:`/`vbscript:`/`data:text/html` URL schemes, NULL bytes, and most C0 control chars. Also caps length defensively. Applied at every persistence boundary that accepts free text from users. Also added `sanitizeHttpUrl`, `sanitizePhone`, `sanitizeLat`, `sanitizeLng` helpers used elsewhere.
- **Verification:** persisting `'<script>alert(1)</script>hello'` stores `'hello'`. Persisting `'<a href="javascript:alert(1)">x</a>'` stores `'x'` (link stripped, scheme neutralized).

### ✅ FIXED MH-10 — `verifyEmailWithToken` SELECT-then-UPDATE race
- **File:** `lib/auth-actions.ts:218-261` (verifyEmailWithToken), `lib/auth-actions.ts:419-447` (resetPasswordAction)
- **Change:** Both flows now use a single atomic `UPDATE … WHERE token=? AND expiresAt > now AND usedAt IS NULL RETURNING *`. If `returning()` is empty, the action returns an "invalid/expired" error. No more two-step SELECT-then-UPDATE.
- **Verification:** two parallel verify clicks on the same link → only ONE succeeds; the other receives "Bu link süresi dolmuş veya geçersiz."

### ✅ FIXED MH-11 — No pagination/limit on search
- **File:** `lib/db-queries.ts:13-26, 32-67, 117-167`
- **Change:** All list queries now use a hard `LIMIT` capped at `LISTINGS_MAX_PAGE_SIZE = 200` and default to `LISTINGS_DEFAULT_PAGE_SIZE = 60`. Stable secondary ordering (`desc(listings.id)`) added to prevent unstable cursor pagination. The free-text query `q` is truncated to 200 chars before the `ILIKE` to bound per-call latency.
- **Verification:** `searchListings({}, '')` produces a SQL plan with `LIMIT 60 OFFSET 0`.

### ✅ FIXED MH-14 — Phone validation only `length>=2`
- **File:** `lib/auth-actions.ts:87-91` (signup), `lib/appointment-actions.ts:52-54` (visitor phone), `lib/sanitize.ts:sanitizePhone`
- **Change:** Centralized phone validation. Accepts an optional leading `+`, then `[1-9]\d{6,14}` after stripping spaces/dashes/parens. Combines `phoneDial + phone` at signup so single-country inputs still get validated.
- **Verification:** `sanitizePhone('+90 532 123 4567')` → `'+905321234567'`; `sanitizePhone('123')` → `null`; `sanitizePhone('abc')` → `null`.

### ✅ FIXED MH-15 — Lat/lng accept NaN/Infinity
- **File:** `lib/listing-actions.ts:63-77`, `lib/sanitize.ts:sanitizeLat/sanitizeLng`
- **Change:** `createListingAction` runs `sanitizeLat(input.lat)` and `sanitizeLng(input.lng)` — both reject NaN/Infinity and enforce `[-90, 90]` / `[-180, 180]`. NaN/Infinity on price/netArea/grossArea also rejected via explicit `Number.isFinite` checks.
- **Verification:** posting `lat=NaN` → `{ ok: false, error: 'Konumu işaretle.' }`; posting `lat=200` → same.

### ✅ FIXED MH-16 — Float money
- **File:** `lib/currency.ts`
- **Change:** Added `toMinorUnits`/`fromMinorUnits`/`MINOR_UNIT_SCALE` and rewrote `convert` to round through integer minor units via a USD pivot. `formatMinorUnits` is a new convenience for callers that have storage in cents. Schema's `listings.price` is already `integer` (major units) — kept as-is for backward compatibility; the documentation in the module explains the storage convention and the conversion path.
- **Verification:** `convert(100, 'USD', 'EUR')` returns `92`; no float drift across N round-trips because the math happens at integer scale.

### ✅ FIXED MH-25 — N+1 message threads
- **File:** `lib/message-actions.ts:122-185`
- **Change:** `getMyThreads` was 1 + 3N queries (one for thread list, then per-thread: other user, last message, unread count). Replaced with a single SQL pass: thread → `LEFT JOIN listings` → `INNER JOIN users` on a computed `otherId` expression, with correlated subqueries for `lastMessage`, `lastMessageAt`, and `unread` count.
- **Verification:** loading 20 threads now issues 1 query instead of 61.

### ✅ FIXED MH-26 — Sign-up unique email race
- **File:** `lib/auth-actions.ts:97-121`
- **Change:** Removed the pre-check SELECT (it was TOCTOU-racy). Insert is wrapped in its own try/catch; a Postgres unique-violation (`code === '23505'`) is translated to the friendly `'Bu e-posta zaten kayıtlı. Giriş yap.'` message. Any other error rethrows into the outer catch.
- **Verification:** two parallel signups with identical emails: first succeeds, second receives the friendly message (not a generic 500).

---

## Schema & migration deliverables

- **`db/schema.ts`**
  - `users.deletedAt` column + `users_deleted_at_idx`
  - `listings.deletedAt` + `listings.deletedBy` + `listings_deleted_at_idx`
  - `messageThreads.listingId` → `onDelete: 'set null'` (was cascade)
  - `messageThreads` new indexes: `message_threads_participants_idx`, `message_threads_pair_listing_idx` (unique, prevents duplicate thread races)

- **`db/migrations/0001_audit_fixes.sql`** (new)
  - `ALTER TYPE notification_type ADD VALUE IF NOT EXISTS … ('approval', 'kyc', 'payment')` — MC-17
  - `ALTER TABLE listings ADD COLUMN deleted_at, deleted_by` + FK + indexes — MC-30
  - `ALTER TABLE users ADD COLUMN deleted_at` + index — MC-30
  - `ALTER TABLE message_threads DROP/ADD CONSTRAINT listing_id … ON DELETE SET NULL` — MC-18
  - `CREATE UNIQUE INDEX IF NOT EXISTS appointments_agent_slot_idx` — MC-09 / MC-15
  - New supporting indexes: `message_threads_participants_idx`, `message_threads_pair_listing_idx`, `favorites_listing_idx`, `approval_requests_status_idx`, `approval_requests_listing_idx`, `kyc_requests_status_idx`, `abuse_reports_status_idx`, `payments_user_idx`, `messages_unread_idx` — MH-24/MH-25
  - `listings.approval_level CHECK BETWEEN 0 AND 3` — HIGH-005
  - `listings.favorites_count >= 0` and `listings.views >= 0` CHECK constraints — MEDIUM-005

---

## ⚠️ Deferred

- **MH-06 specifics — moderator may approve KYC**
  The audit suggested moderators be limited to listing approval + abuse only. I kept KYC approval at moderator+ (it's a frequent moderation chore in practice), and reserved guide deletion / role resets / cross-admin suspension for super_admin. Final policy is a product decision; downgrading KYC to super_admin-only is a one-line change in `lib/admin-actions.ts`.

- **MC-30 — Hard-delete of users**
  `deletedAt` column on `users` is in place and indexed, but no `deleteUserAction` was implemented (none existed before either — the audit notes this in scenario 167 "No DSAR / data-deletion endpoint"). When that GDPR/KVKK flow is built, it should set `users.deletedAt` and `status='suspended'` rather than `db.delete`.

- **Soft-deleted listing reaper**
  Periodic purge (e.g. after 90 days) is not implemented. Recommended: scheduled job that hard-deletes rows with `deletedAt < now() - interval '90 days'` and writes an audit entry.

- **Payment provider integration (MC-08)**
  The action is now safely gated, but the actual Stripe/Iyzico integration (PaymentIntent creation, checkout URL return, webhook signature verification, payment-to-tier reconciliation) is left as a follow-up. The shape is documented inline.

- **MH-16 — Schema migration of `listings.price` to minor units**
  The runtime helpers now work in integer minor units, but the persisted column is still major-unit `integer` for backward compatibility with existing rows. Migrating the column (and adjusting mapper/forms) is a larger ticket: ALTER + UPDATE × 100 + redeploy. Currency conversions in code now do not suffer float drift regardless.

- **MH-25 — Drizzle TypeScript narrow for the correlated subquery row**
  The new `getMyThreads` query uses `sql<...>` typed expressions. Drizzle infers them as nullable for safety; the runtime mapper handles that. If a future refactor goes through a proper `with` CTE it would be cleaner.

- **Saved-search filter validation (MEDIUM-002)**
  Out of scope for this agent (no zod adoption requested here). `createSavedSearchAction` name is now sanitized; the `filters` JSON is still accepted as-is — Fix Agent C is responsible for zod schemas.

- **Audit-log writes on every state change**
  Added requeue audit entry on `updateListingAction`. The wider gap (no audit on sign-in, sign-out, favorite, mark-read, etc.) is out of this agent's scope.
