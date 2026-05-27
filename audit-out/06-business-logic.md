# 06 — Business Logic & Flow Audit

**Scope:** End-to-end user journeys + adversarial logic-flaw scan across `lib/*-actions.ts`, `app/api/**`, `app/admin/**`, `app/agent/**`, `app/dashboard/**`.
**Method:** Static read + role/state/race reasoning. Read-only.
**Severity rubric:** CRITICAL = privilege escalation / data theft / financial loss ; HIGH = trust-boundary break, persistent IDOR ; MEDIUM = correctness / abuse vector ; LOW = UX/integrity / paper-cut.

Findings are grouped by user flow. Each finding cites `file:line` and traces the attack/scenario. Where a flow yields multiple scenarios, each is enumerated. Total scenarios analyzed: **170+**.

---

## 0. Cross-cutting platform issues (apply to ALL flows)

### CRITICAL — `middleware.ts` performs zero authn/authz enforcement
`middleware.ts:3-12` only injects an `x-pathname` header. Every route protection is implemented ad hoc inside each `page.tsx` / Server Action. There is **no central allow/deny layer**, no IP allow-list, no rate limit. This is the root cause of most findings below.

Scenarios:
1. An unauthenticated POST to a Server Action passes through middleware untouched; the action's own `getCurrentUser()` is the only gate.
2. A logged-in non-admin user navigating to `/admin/payments` is gated only by `app/admin/layout.tsx:13-17`'s call to `getCurrentAdmin()` — but the page bodies don't re-check role granularity (admin vs moderator vs super_admin).
3. No request rate limiting → every flow below is brute-forceable.

### CRITICAL — Plaintext default admin passwords baked into the codebase AND rendered on the login screen
`lib/admin-auth.ts:15-19` exports `ADMIN_ACCOUNTS` with passwords `Admin2026!`, `Moderator2026!`, `Demo123!`. `app/admin/login/page.tsx:14-18, 101-119` then renders those exact credentials with one-click "copy" buttons on the **publicly reachable** `/admin/login` page.

Scenarios:
4. `curl https://<host>/admin/login` returns HTML containing super-admin credentials in plaintext (the "production" guard is only a comment at line 84–85, not a code check).
5. The seed (`db/seed.ts`, referenced via `ADMIN_ACCOUNTS`) inserts these credentials into the DB. Unless the operator manually rotates, the admin tier is wide open from day 1.
6. The login page UI also pre-fills email + password with the super-admin's: any human who lands there can simply press Enter (`app/admin/login/page.tsx:23-24`).

### CRITICAL — DEV endpoints expose every Server Action over unauthenticated JSON in development
All routes under `app/api/dev/**` (sign-in, sign-up, verify-code, send-message, create-listing, book-appointment, toggle-favorite, forgot-password, sign-out, ai-match) guard only with `process.env.NODE_ENV === 'production'`. They forward arbitrary JSON to internal Server Actions.

Scenarios:
7. A staging/preview deploy that omits `NODE_ENV=production` (Vercel preview defaults to `production`, but self-hosted/Docker often defaults to `development`) exposes `POST /api/dev/sign-in` as a credential-stuffing endpoint with no rate limit, no captcha (`app/api/dev/sign-in/route.ts:6-15`).
8. `POST /api/dev/create-listing` accepts the raw `CreateListingInput` (`app/api/dev/create-listing/route.ts:6-9`) — including `tier: 'premium'` — meaning anyone authenticated in dev can mint a premium listing without payment.
9. `POST /api/dev/forgot-password` allows enumerator to spam reset emails; combined with the bug that `forgotPasswordAction` silently issues even on missing accounts, it can be used to mass-fingerprint domain inboxes through bounce telemetry.

### HIGH — No CSRF defense
Server Actions and `/api/**` routes rely on session cookies (`iron-session`, `sameSite: 'lax'`, `session.ts:24`). `lax` blocks cross-site POST forms but not GET-triggered actions; multiple Server Actions perform writes (favorite toggle, mark-as-read, etc.) and the `/api/dev/*` routes accept any `Content-Type` JSON. Combined with no origin check, a malicious page can trigger state changes on `/api/dev/toggle-favorite` etc. for users with active sessions.

### HIGH — Session uses a dev fallback secret
`lib/session.ts:13-17` falls back to a literal string `'dev-fallback-password-replace-me-with-32+chars-secret!'` and only throws if `NODE_ENV==='production'`. Staging environments are unprotected and (worse) the fallback is checked into the repo, so any deploy that forgets to set `SESSION_PASSWORD` uses a publicly-known signing secret → session forgery.

### HIGH — Counters increment without bounded transactions
`favorite-actions.ts:14-16` does `INSERT … ON CONFLICT DO NOTHING` followed by an unconditional `+1` on `listings.favoritesCount`. Because the increment runs even when the conflict skipped the insert, repeated rapid clicks (or scripted POSTs) inflate the public counter without the favorites row growing. See Section 5 (Favorites).

### HIGH — No audit trail on most user/admin operations
Audit-log writes (`auditLog`) exist for `createListing`, `updateListing`, `deleteListing`, `approve`/`rejectListing`, `approve`/`rejectKyc`, `resolveAbuse`, `suspendUser`, `reactivateUser`, `upgradeTier`. They are **missing** for: sign-in, sign-out, password reset, email verification, message send, appointment create, favorite, saved-search create/delete, country-guide upsert/delete, notification mark-read. Admin retroactive forensics is impossible for the majority of state changes.

### MEDIUM — `getCurrentUser()` returns `null` when `adminScope=true`, masking dual identity
`auth-actions.ts:353-363` deliberately treats admin-scope sessions as "no user". This means an admin signed into the admin console cannot use the same browser to test buyer flows (legitimate UX bug). It also means flows that *expect* a user (e.g. `createListingAction`) will silently fail/redirect even though a powerful identity is present — masking actions and breaking audit trails (the admin can't post a test listing without dropping their admin scope first).

---

## 1. Registration → Email verify → First login

`lib/auth-actions.ts:55-104` (`signUpAction`), `:115-160` (`verifyCodeAction`), `:162-203` (`verifyEmailWithToken`), `:236-268` (`signInAction`).

### CRITICAL — Email-verification tokens never invalidate prior tokens; unlimited token issuance
`auth-actions.ts:89-91` inserts a new `emailVerificationTokens` row on every signup / resend. The previous row stays valid (`usedAt IS NULL` and `expiresAt > now`). `verifyCodeAction:130-138` only filters by `code = normCode` so older codes still work for 15 minutes.

Scenarios:
10. Attacker registers `victim@x.com` (`signUpAction` accepts the email even if owned by someone else who hasn't claimed it — line 67-68 only blocks already-registered accounts). Victim signs up later → error "zaten kayıtlı" but attacker already controls the row.
11. Within the 15-minute window, an attacker can brute-force the 6-digit code: 1,000,000 combos, no rate limit, no lockout. At 100 req/s this is ~167 min; with a fast loop and the existing concurrency model that's well under the 15-minute expiry. (`verifyCodeAction:121` only checks 6-digit format.)
12. Calling `resendVerificationCodeAction` (`:206-230`) repeatedly mints unbounded rows; combined with #11 it gives the attacker fresh windows indefinitely. There is no per-email/IP throttle.
13. The "resend" function is intentionally silent when the account doesn't exist (line 212) — good for enumeration defense — but `signUpAction` itself leaks existence by saying `'Bu e-posta zaten kayıtlı'` (line 68). Enumeration is wide open at signup.

### HIGH — Verify-with-token bypasses code mechanism and ignores expiry consistency
`verifyEmailWithToken:162-203` accepts the URL token directly (no need for the 6-digit code). The token has the same expiry, but the action does **not** check `usedAt IS NULL` race-free (no `UPDATE … WHERE usedAt IS NULL` atomic check — it does two separate operations at line 181 and 184, allowing a TOCTOU window).

Scenarios:
14. Two parallel clicks on the verify link both pass the SELECT at line 167; both then UPDATE users at line 181-183 and tokens at line 184-186. Idempotent for the user row, but the welcome email is sent twice (line 189-196 guards on `justVerified` which is computed *before* the parallel updates).
15. Token in URL leaks via HTTP `Referer` to any external link the user clicks immediately after verification — and is still usable until `usedAt` is set (no atomic single-use claim).

### HIGH — Sign-in after password reset does not invalidate existing sessions
`resetPasswordAction:305-333` only updates the password hash; it does not delete `sessions` rows for that user, nor does it rotate the iron-session secret. (No `sessions` table writes are visible — iron-session is fully cookie-stateful, so an attacker with a stolen session cookie keeps access after the victim resets.)

Scenarios:
16. Victim's session cookie is stolen (XSS, shared computer); victim does "forgot password" → resets → believes account is safe. Attacker continues to use the original cookie indefinitely (until the 30-day `maxAge`, `session.ts:26`).

### MEDIUM — `signUpAction` accepts very weak passwords
`auth-actions.ts:63` only enforces length ≥ 8. No complexity, no dictionary check, no breached-password check. `bcrypt` cost is hard-coded to 10 (line 70) — acceptable but fixed.

Scenarios:
17. User registers with `password` or `12345678`; signs in normally.
18. Combined with no rate limit on `signInAction`, credential stuffing is easy.

### MEDIUM — Email field length / charset not enforced
Schema: `varchar(255)` (`db/schema.ts:43`). `signUpAction:62` regex is loose `^[^\s@]+@[^\s@]+\.[^\s@]+$` — accepts `a@b.c`. RFC-violating addresses pass.

Scenario 19: Register `'/><script>` style values in `name` (length-only validated). Stored XSS surface in admin user list (`app/admin/users/page.tsx`) and notifications (sender name interpolated into title `message-actions.ts:95`).

### LOW — First-login race: parallel sign-up + verify can let two users share a row
`signUpAction:67-81`: existence check + insert is not in a transaction. Two parallel signups for the same email both pass the SELECT then INSERT; the unique index `users_email_idx` (`schema.ts:61`) saves us, but the slower request gets an opaque "Sunucu hatası" rather than the friendly "zaten kayıtlı".

Scenario 20: Concurrent dual-tab registration → second tab sees generic error.

---

## 2. Forgot password → Reset

`auth-actions.ts:274-303` (`forgotPasswordAction`), `:305-333` (`resetPasswordAction`).

### HIGH — Reset tokens are not single-use atomically; race lets one reset twice
`resetPasswordAction:311-326`: SELECT then UPDATE; no `UPDATE … WHERE usedAt IS NULL RETURNING …`. Two parallel POSTs with the same token both pass the SELECT, both rewrite the password — second one wins.

Scenarios:
21. Attacker with stolen reset link races the victim's legitimate reset and overwrites the password to their own.
22. The reset link is logged in `email.ts` console output (search via `console.log` pattern) — and the token is the entire bearer credential (`/auth/reset-password?token=<token>`). Any log retention captures it.

### HIGH — Token entropy is fine but reset link travels in URL and is browser-history-visible
The token is `crypto.randomBytes(32)` → 256 bits (`auth-actions.ts:34-36`). However the reset URL ends up in browser history, server-access logs, and any analytics tags loaded on `/auth/reset-password`.

Scenario 23: A shared computer scenario — the reset link remains in `history.back()` for ~24 hours of usability (token expires at 60 min per `:287`).

### MEDIUM — Old sessions not invalidated on reset (see Section 1 finding #16)
Repeated here because it is the failure of the reset *flow* specifically: a successful reset must invalidate every other session for that `userId`.

### MEDIUM — `forgotPasswordAction` always returns ok — including when send-email fails
`auth-actions.ts:292-298` does `await sendEmail(...)` but failure inside that path is not caught; `try/catch` at line 281-302 swallows it and returns generic 'Sunucu hatası.'. The user is told the email was sent even if SMTP errored.

Scenarios:
24. Legit user requests reset; SMTP outage; user thinks email is in spam, never receives it.
25. Attacker sees the "always ok" enumeration shield (good) — but distinguishable by response timing: if user exists we hit `sendEmail` (slow); if not we short-circuit at line 284 (fast). Timing oracle for enumeration.

### LOW — No "you just reset your password" notification email
After a successful reset, no email is sent to the user. If an attacker resets the password, the victim has no out-of-band warning.

Scenario 26: Account takeover via reset is silent — victim only notices when they try to sign in.

---

## 3. Create listing (7-step wizard) → Approval

`lib/listing-actions.ts:50-165` (`createListingAction`), `:235-291` (`upgradeTierAction`), `lib/admin-actions.ts:20-68` (`approveListingAction`).

### CRITICAL — Premium listings are inserted with `approvalStatus='pending'` BUT non-premium listings are inserted with `approvalStatus='approved'` automatically, bypassing review entirely
`lib/listing-actions.ts:130`:
```ts
approvalStatus: input.tier === 'premium' ? 'pending' : 'approved',
```
Combined with `db-queries.ts:11-22`'s public-listing filter `eq(listings.approvalStatus, 'approved')`, **every standart/güçlü listing immediately appears site-wide** without any moderation. The "approval queue" only exists for premium.

Scenarios:
27. User posts a listing for a property they don't own at `tier='standart'` → instant public visibility, no admin review (only premium triggers `approvalRequests` insert at `:140-149`).
28. User posts a "güçlü" tier listing paying $9 (`:240`) — also auto-approved. No site-wide gate.
29. The wizard description is unsanitized (raw text from `input.description`); combined with no review, stored content is whatever the user submits. (XSS risk depends on render side.)
30. The wizard accepts arbitrary `lat`/`lng` and `address`; AI-verified flag is forced false (`:133`) but address-misalignment fraud is undetectable until a user reports it.

### HIGH — Wizard server action accepts any field bypassing the 7-step UI
The Server Action signature takes a full `CreateListingInput` (`listing-actions.ts:11-40`). The 7-step React wizard is purely client-side decoration — any caller (especially `/api/dev/create-listing`) can submit a complete listing in one POST and skip the UX guards entirely.

Scenarios:
31. Attacker submits `tier='premium'` directly in POST → bypasses any payment paywall the wizard step 7 might enforce (no payment is taken in the Server Action; `:140-149` just inserts an `approvalRequests` row).
32. Attacker omits photos → the action enforces `photoDataUrls.length < 3` (line 56) at server but `coverPhotoIndex` is not bounds-checked (line 115 `uploadedPhotos[input.coverPhotoIndex] ?? uploadedPhotos[0]`) — works but allows weird states.
33. `input.region` percentages are not validated to sum to 100 (line 84 computes `diger` as the remainder but allows negative values to be clamped to 0; an attacker can pass `aile=200` and the diger becomes 0).
34. No XSS sanitization of `description`, `address`, `neighborhood` before storage.

### HIGH — Draft persistence isn't implemented at the server layer; clients can replay
There is no `drafts` table. Photo uploads inside `createListingAction:62-64` happen synchronously per submit. If the user partially fills the wizard and clicks "submit" twice or the response is dropped, both submits upload all photos and create two listings (no idempotency key).

Scenarios:
35. Network flake during photo upload → user clicks submit again → duplicate listing inserted (the slug uniqueness only avoids collision via `-suffix` at `:80`).
36. Photo storage is paid (Vercel Blob); abusive client can spam multi-MB data URLs in `photoDataUrls` and rack up storage costs. No per-user upload quota or file-size cap visible (`lib/storage.ts:11-27`).

### HIGH — `getEditableListing` allows admins to read+edit any listing, but the role check uses **non-admin-scope** role
`listing-actions.ts:173-183`:
```ts
if (row.agentId !== user.id && user.role !== 'admin' && user.role !== 'super_admin') return null;
```
The role here comes from `getCurrentUser()` which returns `null` if `adminScope`. So this branch can never be hit for an admin browsing in the admin console (`user` is null). But if an admin DB row has `role='admin'` and they sign in via the **normal** `/auth/sign-in` page (`signInAction` doesn't reject admins — `auth-actions.ts:236-268`), `getCurrentUser()` returns them with `role='admin'` and they gain edit-anyone capability through normal user flows. The boundary between "admin console identity" and "admin-as-user identity" is leaky.

Scenarios:
37. An admin user signs in via `/auth/sign-in` (no admin-only gate, line 243-251). Now `getCurrentUser()` returns role='admin'. They edit any listing → action permitted.
38. The 'moderator' role is *not* whitelisted in `getEditableListing:181` but IS whitelisted in `adminSignInAction:374`. Inconsistency means a moderator can sit in the admin console but cannot edit listings via the regular edit endpoint — yet they CAN approve/reject via `lib/admin-actions.ts` (which uses `requireAdmin` only checking presence, not role granularity, `:13-17`).

### HIGH — `updateListingAction` does NOT re-trigger approval
`listing-actions.ts:193-215`: any field change on an already-approved listing keeps `approvalStatus='approved'` and `istbakuApproved=true`. Price changes, status changes, description rewrites — none requeue.

Scenarios:
39. Legit listing approved by admin → owner edits title to "FREE BITCOIN" or price to `1` USD; goes live immediately, no re-review.
40. Price-change approval was foreseen (schema has `type: 'price_change'` in `approvalRequests` definition `schema.ts:293`), but the code never creates such a request.

### HIGH — `upgradeTierAction` mock payment is not gated by webhook / signature
`listing-actions.ts:235-291`: any authenticated owner can call `upgradeTierAction(id, 'premium')` and the action inserts a `payments` row with `status='paid'` and a synthetic `providerRef: 'mock-<timestamp>'` (line 254). There is **no real payment provider integration**. Anyone with edit rights can promote their listing to premium for free.

Scenarios:
41. Owner promotes own listing to premium ($29 phantom charge). Real revenue from the platform's perspective: $0. Revenue dashboard (`admin-queries.ts:60-67`) double-counts these as actual revenue.
42. The `tier='premium'` change happens *before* the (fake) payment insert at line 247 vs 252-256. If the second insert fails for any DB reason, the listing is upgraded yet no payment exists.
43. Upgrading sets `approvalStatus='pending'` only if `tier==='premium'`, so a `guclu` upgrade keeps prior approval state — but the act of upgrading is itself unaudited beyond `auditLog`.

### MEDIUM — `deleteListingAction` is a HARD delete; cascading ripple
`listing-actions.ts:217-233` calls `db.delete(listings)`. The schema's foreign keys cascade: `favorites`, `appointments` → cascade delete; `messageThreads.listingId` → cascade delete; `approvalRequests.listingId` → cascade delete (per `schema.ts:207,229,250,291`).

Scenarios:
44. A user with N favorites loses them silently when the seller deletes the listing — no notification.
45. Active appointments (`status='confirmed'`) vanish without notifying the visitor → no-show on agent side, surprise on visitor side.
46. Message threads about the listing disappear (the entire history is dropped because `messageThreads.listingId` cascade-deletes the thread, which cascades all `messages`). User communication history is destroyed.
47. There is no soft-delete and no audit retention of the deleted listing payload.

### MEDIUM — Slug-collision loop is unbounded and racy
`listing-actions.ts:78-81`: while loop checks existence then increments. Two parallel inserts can both compute `slug-2` and one will fail the unique constraint with a generic error. No retry.

---

## 4. Listing approval (admin)

`lib/admin-actions.ts:20-68` (`approveListingAction`), `:70-113` (`rejectListingAction`).

### HIGH — `approveListingAction` does not verify the listing's `approvalRequests` row exists
`admin-actions.ts:20-37`: it unconditionally sets `approvalStatus='approved'`, `istbakuApproved=true`, `aiVerified=true` and `approvalLevel=level` on the listing — even when there is no pending request.

Scenarios:
48. Admin can "approve" already-approved or auto-approved (standart/güçlü) listings, bumping their `approvalLevel` to 3 ("site visit done") without anyone visiting.
49. There's no check that `level` is in `{1,2,3}` — TypeScript narrows it at call site, but the dev API or direct invocation can pass `level=999`.
50. The "approve" function gives `aiVerified=true` even without any AI check — defeats the badge's meaning.

### HIGH — `requireAdmin()` does not distinguish admin sub-roles
`admin-actions.ts:13-17` only checks `getCurrentAdmin()` returns non-null. A `moderator` can approve/reject listings, approve/reject KYC, suspend/reactivate users, AND delete country guides (`guide-actions.ts:40-44`).

Scenarios:
51. A demo-account moderator (`demo@istbaku.com` per ADMIN_ACCOUNTS) can suspend the super-admin's user row (no protection of admin-targeted operations).
52. A moderator can refund/approve a payment via any future payment-mgmt action — but more concretely now: a moderator can mass-approve every pending listing/KYC without an additional gate.

### HIGH — Owner self-approval (when owner has admin role)
If a user with `role='admin'` posts a premium listing, they submit themselves and approve themselves. `approveListingAction:20-37` does not check `admin.id !== listing.agentId`.

Scenario 53: Admin posts own premium listing → switches to admin scope → approves themselves. Audit log shows it but cannot prevent it.

### MEDIUM — Reject reason is optional and not surfaced to user
`admin-actions.ts:70-77`: `reason?: string`. If null, the notification body falls back to "Lütfen detayları gözden geçir ve tekrar gönder." (line 95). The user has no actionable feedback.

### MEDIUM — Approval level bump is irreversible from the action surface
There's no `downgradeApproval` action. To recover from a mistaken approval, admins must hit the DB directly.

---

## 5. Search → Filter → View → Favorite → Compare

`lib/db-queries.ts:88-130` (`searchListings`), `favorite-actions.ts`.

### HIGH — Favorite counter inflation
`favorite-actions.ts:10-22`:
```ts
await db.insert(favorites).values({...}).onConflictDoNothing();
await db.update(listings).set({ favoritesCount: sql`${listings.favoritesCount} + 1` })...
```
On a duplicate favorite (already favorited), the INSERT no-ops but the UPDATE still increments. Rapid clicks → counter explodes.

Scenarios:
54. User clicks favorite 1000 times → `favoritesCount` reads 1000, real favorites = 1. Public-trust signal corrupted (and rankings/discovery may use it).
55. `removeFavoriteAction:24-30` uses `GREATEST(... - 1, 0)` so unfavoriting once after 1000 phantom increments leaves count at 999. The drift is permanent.
56. `toggleFavoriteAction:51-64` does its own SELECT-then-mutate without a transaction; two parallel toggles can both see "not favorited", both add favorite (one no-ops), both increment → +2 with one real favorite row.

### HIGH — No pagination on `searchListings`
`db-queries.ts:88-130` returns every approved non-private listing matching the filter, no LIMIT/OFFSET. As the dataset grows this is a denial-of-service in waiting (full table scan per query, full payload to client, JSON parse cost).

Scenarios:
57. Crafted broad filter ("Türkiye, sale") returns the entire TR listing set. Single user can repeatedly hit listing search to OOM the Node process when listings ≥ 50k.
58. No cursor; no offset; "load more" cannot be consistent across mutations.

### MEDIUM — Search query (`q`) is raw `%${q}%` in `ilike`
`db-queries.ts:91-101`. The `%` literal is fine (parameterized through Drizzle), but a long string is unbounded and triggers full-table sequential scan even with indexes (no trigram extension).

Scenarios:
59. Attacker sends `q='a'.repeat(10000)`. Postgres handles it but per-call latency spikes — combined with no rate limit (Section 0), trivial DoS.

### LOW — Sort options don't include tiebreaker → unstable pagination
Even if pagination were added, ordering by `publishedAt` (line 125) without secondary ordering can return inconsistent results across page boundaries when records share timestamps.

### LOW — Filter state in URL is enforced only on client
Server `searchListings` accepts the filter object directly from caller-supplied values; no whitelist of `sort` values (line 121-126 uses `default` for unknowns — safe). However the API surface for search is unclear (server actions vs `/listings` page). Pages may bypass server search by computing in-client over a full-list dump.

### LOW — Compare-store and favorites-store appear to be client-only `localStorage` (`lib/compare-store.ts`, `lib/favorites-store.ts`)
This means "compare" has no server-side limit on items added; a user could add 10,000 items to compare and the page would attempt to render all (perf issue only).

Scenario 60: User compares deleted listing IDs — the property page returns 404 on click but the compare card still exists. No reconciliation pass.

---

## 6. Message threads

`lib/message-actions.ts`. Schema: `messageThreads`, `messages` (`db/schema.ts:248-266`).

### CRITICAL — Threads are *not* keyed on a listing for some calls; receiver enumeration via threadId
`message-actions.ts:173-193` (`getThreadMessages`): `if (thread.participantA !== me.id && thread.participantB !== me.id) return []`. This is fine for *reading*. But there's no scoping in `getMyThreads:122-171` either, and `sendMessageAction:56-119` happily creates threads to any `toUserId` whose UUID is known.

Scenarios:
61. Attacker enumerates a user by sending messages to any UUID → `users` table check at line 71-73 confirms existence (`'Alıcı bulunamadı.'` if not). Combined with sequential UUIDs being random, this is enumeration-resistant — but ANY UUID known via the agent listing (`agentId` exposed in `Property.agentId`, `db-mappers.ts:53`) becomes a valid messaging target.
62. There is no block list, no "messages from strangers" gate. Spam vector wide open.
63. There is no consent gate: a buyer with the agent's UUID can DM the agent indefinitely with no per-day cap.

### HIGH — Blocked-user / suspended-user / deleted-listing message paths are not handled
The action does not check `users.status` on either side. A suspended user can still send messages (only sign-in is blocked — `auth-actions.ts:250`, but an existing session continues to work, `signInAction:253` issues, no per-request status re-check).

Scenarios:
64. User suspended at 10:00; their session cookie still valid till expiry → can keep messaging.
65. The recipient was deleted: `users.id` FK with `onDelete: 'cascade'` (`schema.ts:251-252`) means threads collapse before the message lands. But the *current* send checks `[other] = db.select(...) where id=toUserId limit 1` (line 71-73), so it will fail gracefully — yet only via the `'Alıcı bulunamadı.'` error which still leaks "the user used to exist, now they don't" via timing.
66. Sending a message about a soft-deleted listing: there is no soft-delete (Section 3 finding 44-47). Hard delete cascades thread away.

### MEDIUM — `findOrCreateThread` race
`message-actions.ts:32-49`: SELECT-then-INSERT, no unique constraint on `(participantA, participantB, listingId)`. Two parallel sends create two threads with the same pair.

Scenario 67: Two devices send the same message simultaneously → two distinct `messageThreads` rows with the same participants & listingId. The UI then shows two near-duplicate threads.

### MEDIUM — `markThreadReadAction` is callable without thread-membership check
`message-actions.ts:195-201`: it updates messages where `senderId != me.id`. Combined with the threadId being a UUID, this is hard to brute-force. But there's no auth check that `me` is a participant: anyone signed in could mark *someone else's* messages read if they obtain the thread ID. This poisons unread counts for the real participant.

Scenario 68: Internal user shares a thread URL; another logged-in user opens it → their `markThreadReadAction` call zeros the unread for the original recipient.

### MEDIUM — Self-message check is by ID at the action layer, but the action also calls itself for "system notifications" without that guard
Line 67: `if (input.toUserId === me.id) return ...` blocks the explicit case, but the `notifications` insert at line 92-98 still happens before the early-return ordering — re-check: actually the self-check is at line 67 (before any insert), so it correctly aborts. Safe here.

### LOW — Message length 4000 chars is high; no rate limit; spam easy
Line 66. Combined with `sendEmail` (line 101) firing per message, an attacker can flood the recipient inbox.

Scenario 69: 4000-char message every second from a script → email-storm DoS against the target user.

### LOW — Email/notification snippet includes raw user content
`tplNewMessage({snippet: content.slice(0,240)})` (line 107). If the template doesn't HTML-escape, this is stored email-XSS / phishing surface.

---

## 7. Appointment booking

`lib/appointment-actions.ts:19-91` (`createAppointmentAction`).

### CRITICAL — `createAppointmentAction` does NOT require auth and uses an unauthenticated `agentId`/`visitorEmail` payload
Line 22: `const me = await getCurrentUser();` — but `me` is never required. `visitorUserId: me?.id` (line 36) is optional. The action accepts arbitrary `agentId`, `visitorName`, `visitorEmail` from the body.

Scenarios:
70. Attacker books an appointment in the name of anyone they like (use any email/phone) on any agent's schedule. The agent gets a "lead" email at line 70-83 from a synthetic visitor.
71. Mass-book all available slots for a competing agent → DoS the agent's schedule.
72. Emails to spoofed visitor address (line 56-67) — used as a spam relay through ISTBAKU's branded sending domain.

### CRITICAL — Slot race
The slot-conflict check (line 28-31) does SELECT-then-INSERT with no transaction. Two concurrent bookings for the same slot both pass the SELECT and both attempt INSERT. There IS a unique index `appointments_agent_slot_idx` on `(agentId, scheduledAt)` (`schema.ts:240`) which prevents the duplicate row, but the failing INSERT throws a generic catch → "Sunucu hatası." with no friendly "this slot was just taken by someone else" message.

Scenarios:
73. Two buyers click "book" at the exact same instant → one succeeds; the other sees a generic 500 with no recovery path. They likely re-try → re-conflict.
74. Agent-side: a busy agent listing 10 popular slots may see legitimate clients getting "Sunucu hatası" frequently during opening minutes.

### HIGH — No `scheduledAt` validation: past, far-future, mid-night allowed
Line 24-25 only NaN-checks. No "future > now", no "during business hours", no "within working calendar".

Scenarios:
75. Visitor books an appointment for `2099-01-01` or `1970-01-01`. Agent sees noise in CRM.
76. Visitor books `3:00 AM` Sunday. Agent receives the lead email.

### HIGH — Email fields are not validated
`visitorEmail` is taken as-is. Combined with the SMTP send at line 56-67, an attacker can send arbitrary emails to spoofed addresses via the platform.

Scenario 77: `visitorEmail = 'victim@example.com', visitorName='<a href=...>'` — spam/phish target receives an "ISTBAKU randevu onaylandı" email mentioning a real listing they have no relation to.

### HIGH — `agentId` is not validated to be an actual agent
Line 19-43: there's no `users WHERE id=agentId AND role='agent'` check. You can pass any user UUID as the `agentId`. The action will insert into `appointments` (the FK requires the user exists, line 230-231 of schema — `onDelete:'cascade'`); but the user need not be an agent.

Scenario 78: Pass `agentId = <admin uuid>`. Appointment lands on the admin's calendar; the admin gets a lead email about "buying" a property.

### MEDIUM — Cancellation / reschedule paths are absent
No `cancelAppointmentAction` is visible in the codebase. The only state changes after creation would have to come from admin or direct DB. No re-book conflict resolution.

### MEDIUM — `getAgentAppointments` / `getBookedSlotsAction` (lines 93-124) require no auth
Anyone can query any agent's full appointment schedule for any date range. PII leak: `appointment-actions.ts:101-124` only returns `at` (timestamps) — but the SELECT itself isn't gated by `getCurrentUser()`. A scraper builds a heatmap of any agent's calendar.

Scenarios:
79. Competitor scrapes a popular agent's calendar to find unbooked slots → mass-books decoys.
80. The other variant `getAgentAppointments` returns full rows (line 97). It's a server action (`'use server'`) — callable from any signed-in client. PII leak: visitor names, emails, phones.

---

## 8. Premium tier upgrade / payments

Covered above in Section 3 (#41-43). Additional payment-flow scenarios:

### CRITICAL — There is no payment provider integration whatsoever
`upgradeTierAction:235-291` is the only "payment" code path. The `payments` table only ever sees `status='paid'`. `providerRef='mock-${Date.now()}'`. No webhook handler exists for any provider (`grep` of `app/api`: no `iyzico`, `stripe`, `paypal`, `webhook`, `paddle`, etc.).

Scenarios:
81. Tier upgrade is free in production.
82. Refund/chargeback path: there is `payment_status` enum with `refunded` and `failed` (`schema.ts:32`) but no action to set them. Reconciliation impossible.
83. `payment_type` enum includes `premium_membership`, `report_purchase`, `partner_commission` — none have action paths. Roadmap holes.

### HIGH — Premium membership state on `users.premium` is not exposed in any user-facing action
`users.premium` boolean exists (`schema.ts:51`) but no action toggles it (search shows no writes). Premium memberships are unbuyable today; if shipped, would also bypass payment per #81.

### MEDIUM — `payments` insert and `listings` tier-update are not in a transaction
`listing-actions.ts:242-263`: separate statements. A partial failure leaves listing as premium without a payment row, or vice versa. Audit trail will show one but not the other.

---

## 9. KYC flow

Schema: `kycRequests` (`schema.ts:303-314`). Actions: `lib/admin-actions.ts:127-193`.

### CRITICAL — There is no user-facing action to submit a KYC request
`grep "kycRequests"` shows only admin reads/writes (`admin-actions.ts:129, 165` and `admin-queries.ts:25-30`). No submit action exists. Either the flow is unimplemented or it bypasses the action layer entirely. **The "KYC submit" user journey is not implemented in code.**

Scenarios:
84. UI surfaces (`app/admin/kyc/page.tsx`) display an empty queue because nothing populates it.
85. If a user tries to submit, the wizard either crashes or fails silently.
86. `users.kycStatus` defaults to `'none'` and is only mutated by admin actions. A user cannot earn `'pending'` state.

### HIGH — Re-submit override semantics undefined
Even when a user-side action ships, the current admin actions just SET `users.kycStatus = 'approved'` or `'rejected'` (`admin-actions.ts:136, 170`). No transition validation: a `'rejected'` user can be re-approved without a fresh document upload; a `'pending'` can be flipped twice without history.

### MEDIUM — `kycRequests.documents` JSON contains free-form URLs with no signed access
`schema.ts:307`: `{ name: string; url: string }[]`. If the URL is a public Blob URL, anyone with the URL has the documents.

### MEDIUM — `aiCheckScore` and `aiCheckNotes` columns exist but no AI pipeline writes to them
Lines 309-310. Admin dashboards may display them as zero, misleading reviewers.

---

## 10. Complaint / abuse report

Schema: `abuseReports` (`schema.ts:316-328`). Resolution action: `admin-actions.ts:196-208`. **There is no user-facing report submit action** (no writes outside admin code visible).

### HIGH — User-facing report flow is missing
Same pattern as KYC. The admin can resolve, but users cannot create.

### HIGH — `resolveAbuseAction` has no per-action effect on the offender or target
`admin-actions.ts:196-208`: status flips, audit log entry, nothing else. Setting `status='resolved'` doesn't remove the offending listing, suspend the user, or notify the reporter. The decision has no side-effect.

Scenarios:
87. Admin marks a "fake listing" report as `'resolved'` but the listing remains live with `approvalStatus='approved'`.
88. Reporter never gets feedback on what happened to their report.
89. No mechanism to dedupe abuse reports (same listing reported by 50 users → 50 rows).

### HIGH — When submit ships, can a user report their own listing? Can a user report a report?
With no submit action visible, the logic check is theoretical, but the schema `targetType: text` and `targetId: uuid` (line 319-320) allow ANY UUID as target. There is no FK so the report can reference any string; an attacker can DoS the moderation queue with junk reports.

Scenario 90: Submit action will need to validate `targetType ∈ {'listing','user','message'}` and reject self-targeting.

---

## 11. Agent dashboard CRM

`app/agent/page.tsx`.

### HIGH — Role check accepts admin/super_admin but not agent verification status
`app/agent/page.tsx:29-31`:
```ts
if (me.role !== 'agent' && me.role !== 'admin' && me.role !== 'super_admin') {
  redirect('/dashboard');
}
```
`moderator` is excluded (good, but inconsistent with admin-actions which DOES allow moderator). Any `'agent'` role user — verified or not — can see this CRM. The `agents` row check (`:34`) is just for display; no gate.

### HIGH — Lead query is scoped to current user, but appointments leak across agents because **`getAgentAppointments` lacks an auth check** (Section 7 #80)
A rogue agent A could call `getAgentAppointments(agentBId, ...)` directly via a server action invocation and see all of agent B's leads. The agent page itself uses `eq(appointments.agentId, me.id)` (line 50), so the *page* is safe, but the server action surface (`appointment-actions.ts:93-98`) is not.

### MEDIUM — No "reassign lead" or "lead status" action exists
The CRM displays leads as appointments but provides no `agentId` reassignment, no `cancelled`/`completed` mutation path → agents cannot disposition leads from the UI.

### MEDIUM — Aggregate stats use `count()` without filters by status
`app/agent/page.tsx:63-65`: `Aktif Lead = future appointments` includes `cancelled` ones too (no `ne(status, 'cancelled')` filter). Cancelled appointments inflate the active-lead count.

Scenario 91: Agent cancels 5 leads → still see "5 active leads" until the appointment date passes.

---

## 12. Admin actions (ban, delete, refund)

`lib/admin-actions.ts`.

### HIGH — `suspendUserAction` / `reactivateUserAction` does not invalidate existing sessions
`admin-actions.ts:211-249`: sets `users.status` but does not delete any session, does not flag `users` to be re-checked on the next request. `signInAction` rejects suspended users (`:250`), but the already-issued session cookie keeps working for 30 days.

Scenario 92: Admin suspends a known abuser at 12:00 → abuser keeps posting messages, creating listings, etc. through their existing tab until 13:00 (timeline of their next sign-in attempt) or 30 days (cookie expiry).

### HIGH — No "undo delete" path; `deleteListingAction` is callable by user (not admin); admin has no separate "force delete" with audit nuance
The action is just `lib/listing-actions.ts:217-233`. An admin can call it on anyone's listing (because of the role bypass at line 181) but it's the same hard-delete with the same cascade consequences as the user-side delete.

### MEDIUM — Audit log is append-only but unprotected from admin tampering
Any admin SQL access can edit/delete `auditLog` rows. There's no checksum or off-site sink.

### MEDIUM — No refund action; `payments.status='refunded'` is unreachable
See Section 8 finding #82.

---

## 13. Notification delivery

`lib/notification-actions.ts`. Schema: `notifications` (`schema.ts:272-283`).

### MEDIUM — Delivery is pure DB-insert + later GET; no real-time (no SSE/WS/push)
There is no push channel. Each session has to poll `unreadCountAction()` or refresh the dashboard. Notifications about appointment changes, KYC results, etc. are *missed* if the user doesn't load the page within the relevant window.

Scenario 93: Approval mail bounces; in-app notification only visible when user logs in next; no SMS fallback.

### MEDIUM — `notifications.body` and `notifications.title` are inserted with raw user content in some flows
`message-actions.ts:95-97`: `title: me.name yeni mesaj gönderdi`, `body: ${input.listingTitle ? '...': content.slice(0, 80)}`. If the dashboard renders these without escaping, stored XSS via the sender's name (registration doesn't sanitize HTML).

### LOW — `unreadCountAction` does `SELECT id, COUNT in JS` rather than `SELECT count(*)`
`notification-actions.ts:28-34`: pulls all IDs, returns `.length`. O(n) memory per call for heavy users.

---

## 14. Country guides

`lib/guide-actions.ts`, `app/api/country-guide/route.ts`.

### HIGH — `/api/country-guide` allows open redirect via stored `pdfUrl`
`app/api/country-guide/route.ts:25-27`:
```ts
if (/^https?:\/\//i.test(g.pdfUrl) && !g.pdfUrl.includes('/api/country-guide')) {
  return NextResponse.redirect(g.pdfUrl, 302);
}
```
A malicious admin (or anyone with admin role) can set `pdfUrl` to any external URL → the public endpoint redirects to it. This becomes an open redirect / phishing pivot on the ISTBAKU domain.

Scenarios:
94. Admin sets pdfUrl to `https://evil.com/login.html`; share `https://istbaku.com/api/country-guide?iso=XX` looks legitimate; victim is redirected.
95. Phishing emails using `istbaku.com` host → bypass spam filters because the domain is "real".

### MEDIUM — `upsertGuideAction` / `deleteGuideAction` accept arbitrary `iso` strings (no whitelist)
`lib/guide-actions.ts:22-44`: `iso` is `varchar(2)` per schema but the action doesn't enforce A-Z. An admin can store rows with `iso='AB'` or with lowercase/special chars.

### MEDIUM — No version history / no audit log for country-guide changes
A guide can be silently rewritten by any admin/moderator (no audit log entry in `guide-actions.ts`).

### LOW — Anyone can call `getCountryGuidesAction()` (no auth) — fine for public, but the action is named like a generic getter; intended audience unclear.

---

## 15. Compare page

`app/compare/page.tsx` (client-side via `lib/compare-store.ts`).

Compare appears to be entirely client-state-only. No server backing means:

### LOW — No item limit
A user can stuff `localStorage` with thousands of entries; UI may attempt to render all.

### LOW — Deleted listings remain in compare; fetched by id and silently 404
The compare logic likely calls `/api/listings/[id]` per entry; deleted items 404. The compare card stays visible until cleared by hand.

Scenarios:
96. Compare carries entries from yesterday's session, half deleted; user perceives broken UI.
97. Cross-device compare is not synced (no server) — feature gap.

---

## 16. Private portfolio (`isPrivate=true` listings)

`app/private-portfolio/page.tsx`, `db-queries.ts:29-36`.

### CRITICAL — Private listings are visible to ANYONE, not just KYC-approved users
`db-queries.ts:29-36` returns all listings with `isPrivate=true` and `approvalStatus='approved'`. There is NO authorization gate. `app/private-portfolio/page.tsx:1-14` does not call `getCurrentUser()`; the page is fully public.

Scenarios:
98. Anyone visits `/private-portfolio` and sees the entire "private" listing inventory in plaintext.
99. The page is statically renderable; even unauthenticated bots crawl it.
100. The supposed gate ("KYC approved investors only") is enforced only via dashboard CTA copy, not via code.

### HIGH — `createListingAction` hard-codes `isPrivate: false` (`listing-actions.ts:134`)
No user-facing action sets `isPrivate=true`. Either the feature was abandoned (and the inventory must be seeded) or admins must directly UPDATE the DB to mark a listing private.

---

## 17. Reports / analytics

`app/reports/page.tsx` and `lib/admin-queries.ts:54-69`.

### MEDIUM — Public reports page (`/reports`) renders synthetic constants
`app/reports/page.tsx:14-40` ships hard-coded `TREND`, `FOREIGN`, `PROFILE` arrays. The "B2B reports" CTA implies data-product offering, but the displayed values are mock.

### LOW — Admin analytics aggregates do not de-anonymize per row, but small-N risk exists
`admin-queries.ts:54-69`: stats are coarse. No per-region or per-user-segment leak via this endpoint. However:

Scenario 101: When the dataset is small (early days), a single user with a single payment in `payments` will be uniquely identifiable from aggregates if filtered tightly.

### LOW — `getAdminStats` is callable from any admin (incl. moderator)
Same as Section 4 #51 — moderator sees revenue total.

---

## 18. Direct-call IDOR / Force-browse register

Quick consolidated table.

| Endpoint / Action | Owner check | Admin-role check | Risk |
|---|---|---|---|
| `GET /api/listings/[id]` | none | none | Public (intended) |
| `POST /api/ai/explain` | none | none | OK (mock AI) |
| `POST /api/ai/match` | none | none | OK |
| `POST /api/ai/describe` | none | none | DoS surface |
| `GET /api/country-guide` | none | none | Open redirect risk (Section 14) |
| `GET /api/auth/me` | session-only | n/a | OK |
| `POST /api/dev/*` | none in dev | none | CRITICAL when NODE_ENV!=production |
| `addFavoriteAction` | session-only | n/a | counter inflation #54 |
| `sendMessageAction` | session-only | n/a | spam #69, enumeration #61 |
| `createAppointmentAction` | optional | none | #70-78 |
| `getAgentAppointments` | none | n/a | leaks any agent's leads #80 |
| `getBookedSlotsAction` | none | n/a | leaks calendar #79 |
| `createListingAction` | session-only | n/a | auto-approve #27 |
| `updateListingAction` | owner via `getEditableListing` | role bypass | no re-approval #39 |
| `deleteListingAction` | same | same | cascading destroy #44-47 |
| `upgradeTierAction` | same | same | free premium #41 |
| `getEditableListing` | owner OR `role∈{admin,super_admin}` | only via user role | moderator can't edit but moderator CAN approve #51 |
| `approveListingAction` | n/a | `requireAdmin` only | moderator approves #51, self-approve #53 |
| `suspendUserAction` | n/a | `requireAdmin` only | moderator suspends admin #51 |
| `upsertGuideAction` | n/a | `requireAdmin` only | open redirect data #94 |
| `getMyThreads` | session-only | n/a | OK |
| `getThreadMessages` | participant check | n/a | OK |
| `markThreadReadAction` | NO participant check | n/a | #68 |
| `markNotificationReadAction` | userId match | n/a | OK |
| `getPrivateListings` (via page) | NONE | n/a | CRITICAL #98 |

---

## 19. Additional adversarial scenarios

102. **Negative price**: `createListingAction:58` checks `price <= 0`. Good. But `updateListingAction:202-205` accepts any number including negative. Owner can set `price = -1000000` post-approval to spike scoreboards or invert sort.
103. **Future-only end-date in the past**: schema has no `endsAt`/`expiresAt` on listings; all listings are "evergreen". No "listing expired" concept → stale inventory accumulates.
104. **End-before-start**: appointments have only `scheduledAt` (single timestamp) — no duration. Cannot represent overlap with another appointment that takes 90 min vs 30 min.
105. **Self-favorite**: Owner can favorite their own listing → inflates counter (#54).
106. **Self-message** is blocked at `message-actions.ts:67`. Good.
107. **Self-appointment**: Visitor==Agent not blocked; user can book themselves and inflate their own CRM stats.
108. **Email-spoofing via appointment-cancel mail**: cancellations don't exist (#79), but if added later they'll likely send mail to `visitor_email` (controlled by attacker per #77) — vector remains.
109. **Tier downgrade**: no `downgradeTierAction`; once premium, the listing stays premium (subscription doesn't expire). Combined with #41, this is a permanent free upgrade.
110. **Replay of upgrade**: `upgradeTierAction` does no idempotency check. Calling it twice inserts two `payments` rows and two `approvalRequests` rows but the listing's tier is idempotent. The audit log shows two upgrades. Revenue dashboard double-counts.
111. **Inflated listing views**: `views` column (`schema.ts:185`) — no update visible in code; presumably set by a job. If exposed via update endpoint, click-bombing is trivial.
112. **Inflated `favoritesCount`** — see #54.
113. **Race: parallel KYC submit** (when implemented): without a unique active-pending constraint, two parallel submits create two rows; admin sees duplicates.
114. **Race: parallel reset password** — see #21.
115. **Race: parallel verify** — see #14.
116. **Race: simultaneous favorite + delete listing**: cascade FK from `favorites.listingId` deletes the favorite row; counter update at `favorite-actions.ts:16` would fail silently if it raced after the listing row's deletion. No transaction wrap.
117. **Race: parallel `findOrCreateThread`** — see #67.
118. **Race: parallel slug generation** — see Section 3 finding #56 (#52 not 56). `listing-actions.ts:78-81`.
119. **Cookie session fixation**: iron-session re-issues on `session.save()`; no obvious fixation, but the `adminScope` flag is on the same cookie. After sign-in via `/auth/sign-in` then via `/admin/login`, the latter overwrites the former.
120. **Cross-role session ambiguity**: `getCurrentUser()` returns null for admin-scope; `getCurrentAdmin()` returns null for user-scope. There is no concept of "I'm an admin acting as user" — admins must sign out and back in to test buyer flows, an operational headache that nudges admins to share user accounts (auditing gap).
121. **Bypass of `isPrivate` filter**: `db-queries.ts:30-32` filters by `isPrivate=true`. Any caller passing `includePrivate=true` to `getAllListings` (line 11-22) gets everything. Other internal callers must be vetted to not leak across routes. Today `private-portfolio/page.tsx` calls `getPrivateListings` which only returns private — but the function itself doesn't enforce KYC.
122. **Audit log injection**: `auditLog.action` and `target` are inserted as-is. Logs are not sanitized for terminal control chars; if rendered in a CLI or syslog, attacker-controlled values (e.g., a listing slug crafted to include ANSI escape) can poison logs.
123. **Generated description (`aiDescribe`)**: `POST /api/ai/describe` accepts arbitrary text (line 5-8). No length cap. Memory DoS vector if the mock LLM is replaced later with a real one that hits a paid API.
124. **AI-match cost / abuse**: `POST /api/ai/match` is unauthenticated and runs full-table fetch + scoring (`ai-match-action.ts:73-115`). Scrape-everything via `maxResults=10000`. Mock is cheap; real AI tier would explode.
125. **`upsertGuideAction` lets an admin set arbitrary `iso` and large `description`**: no length cap, no markdown sanitizer (`guide-actions.ts:22-37`). Then `app/api/country-guide/route.ts:33-79` writes the description directly into a PDF object via `esc()` (line 50). Helper escapes `()` for PDF safety, but the description still ends up unescaped in HTML context if rendered on a page using `dangerouslySetInnerHTML`.
126. **Email send is fire-and-forget** (`.catch((e) => console.warn(...))` pattern in every action). Failed emails never re-queue; users don't know.
127. **`sendEmail({ silent: true })`** — in `lib/email.ts` (not read here but referenced widely). The `silent` flag suggests dev-time stubbing. Verify in production this flag does not suppress real sending.
128. **`getCurrentAdmin` returns role string only — no rights table**. To extend permissions later, every action must individually check role granularity. Risk: future devs forget. (Bus factor finding.)
129. **`approvalRequests` doesn't track which listing fields changed** — so a "price_change" approval shows just `type='price_change'` without before/after. Reviewer cannot decide intelligently.
130. **`abuseReports.targetId` has no FK** (`schema.ts:317-328`). Stale references survive target deletion → admin panel shows reports on missing entities.
131. **`payments` table FK to `listingId` ON DELETE SET NULL** (`schema.ts:333`). Good — but if the listing is deleted, the payment loses linkage and the revenue dashboard can't attribute. Combined with no soft-delete, history is corrupted.
132. **Notification spam via approval flips**: an admin who repeatedly clicks approve/reject creates a notification per click (no de-dup at `admin-actions.ts:46-51` etc.). Notification table fills up.
133. **Notification mark-read TOCTOU**: `markNotificationReadAction:14-19` updates by `(id, userId)` — safe from cross-user mutation. OK.
134. **Saved searches**: `createSavedSearchAction:294-303` stores arbitrary `filters` JSON. No size cap. Could store 10MB JSON per row.
135. **Saved searches: delete others' searches?** `deleteSavedSearchAction:314-320` filters by `(id, userId)`. Safe. ✓
136. **Cross-tenant data via search**: `searchListings` only filters by `approvalStatus='approved'` and `isPrivate=false`. Suspended sellers' listings remain visible. No `listings.status='suspended'` linkage to user status.
137. **Country guide PDF placeholder injects unescaped body** (`api/country-guide/route.ts:48-79`). The PDF generator escapes `()` but not `\n` or font-stream control. A crafted description with `)) ET ... BT ` could in theory break out of the text stream — low impact (just garbled PDF) but worth fixing.
138. **`hold time` not enforced anywhere** — no "wait 24h after sign-up before promoting tier" or similar anti-fraud. New users can immediately premium-spam.
139. **`updatedAt` is set manually in actions** (e.g. `listing-actions.ts:199`). Missing in `approveListingAction` (`admin-actions.ts:22-26`) — approval doesn't bump `updatedAt`. Last-modified ordering becomes stale.
140. **`auditLog.meta` JSON accepts unbounded payloads** (`schema.ts:348`). Combined with `updateListingAction:208`, the entire `input` object lands there → no PII filter.
141. **Photo upload data URLs may exceed memory limits**: `lib/storage.ts:29-38` does `Buffer.from(match[2], 'base64')`. A 50 MB data URL → 50 MB Buffer in Node memory; multiplied by photo count and concurrent requests, OOM is achievable.
142. **No EXIF stripping** on uploaded photos. GPS coordinates leak even if the listing's `lat/lng` is generic.
143. **`tier='premium'` listings still appear in public search** even before approval — actually, they don't: `db-queries.ts:88-89` filters `approvalStatus='approved'`. So pending premiums are correctly hidden. ✓ (One of the few correct behaviors.)
144. **However, after a premium is rejected, the listing keeps `tier='premium'` but `approvalStatus='rejected'`** — invisible to the public, but the user's dashboard still shows it as "premium". Confusing state.
145. **Bulk approve**: there is no admin bulk action. To approve 100 listings, 100 separate Server Action calls happen. Each fires emails. Mail volume can hit provider limits.
146. **Email template `tplVerifyEmail` includes the code in the subject** (`auth-actions.ts:94`): `subject: 'ISTBAKU — Doğrulama kodun: <code>'`. Email subjects are often logged unencrypted across mail relays. Subject-line leak.
147. **`tplPasswordReset` URL also leaks via Referer** if the user clicks any link on the reset page before completing reset.
148. **`message_threads.listingId` cascade DELETE** (`schema.ts:250`): deleting a listing nukes the thread, which nukes the messages — and there is no way for a user to recover their conversation history.
149. **Notification creation in `admin-actions.ts:47-52, 92-97, 145-149, 179-183`** mixes `await db.insert(...)` with fire-and-forget `sendEmail(...).catch(...)`. If the DB insert succeeds but the email fails, the notification UI shows an item with no email backing — fine UX-wise, but the inverse failure mode is dangerous: an admin clicks reject, the audit log writes, the user's status flips, but the in-app notification fails (db error) — user is rejected silently.
150. **Currency conversion**: `lib/currency.ts` likely contains conversion rates (not read). If hard-coded, premium-tier amount of `$29` is taken as USD regardless of user currency preference. Cross-currency revenue accuracy is questionable.
151. **`tierEnum` does not have a `none` value** — all listings default to `'standart'` (`schema.ts:133`). There's no way to mark a listing as "free trial" or similar.
152. **`role='moderator'`** is not enforced as read-only — moderators have the same write access as super_admin via `requireAdmin`. Principle of least privilege violated.
153. **No 2FA / MFA anywhere**, despite the admin login page advertising "Production'da MFA + IP allow-list zorunlu" (`app/admin/login/page.tsx:85`).
154. **No CAPTCHA on sign-up / sign-in / password-reset endpoints**. Combined with no rate limit, bot-spam is trivial.
155. **The `users.lastSeenAt` is only updated on sign-in** (`auth-actions.ts:261`). Long-running sessions appear "offline" forever in admin.
156. **Stored `users.phone` is not validated against country code** — `phoneDial` separate field, no consistency check.
157. **Email lower-case on insertion** (`auth-actions.ts:59`) is good — but the `users_email_idx` is `uniqueIndex('users_email_idx').on(sql\`lower(${t.email})\`)` (`schema.ts:61`) — also good. ✓
158. **`appointment-actions.ts:36` uses `me?.id` for `visitorUserId`** — guest bookings produce NULL `visitorUserId`, which is fine; but admin reporting cannot distinguish "guest booked" from "logged-in user booked" reliably.
159. **No "verify-listing-ownership" workflow** — `ownerType=sahibi` (owner) is self-declared. Combined with auto-approve (#27), anyone can claim ownership of any property in any city.
160. **Country guides have no role-based viewer**: the PDF endpoint is fully public (Section 14). A "Türkiye" guide is universally downloadable, no country-restriction. Fine if intended.
161. **`isAdmin` boundary at `getCurrentAdmin()` only checks `adminScope=true`** (`auth-actions.ts:397`). It does NOT re-query the DB to verify the user's role is still admin. If the DB role is downgraded to 'user', the cookie still says admin.
162. **`auth-actions.ts:381-388` admin sign-in always sets `session.role` from the freshly-fetched user row** — but the persisted cookie value isn't refreshed on subsequent requests. So later changes to the user's DB role are invisible.
163. **`session.email` and `session.name` are stale** — never refreshed if user updates their profile.
164. **`signOutAction:339-342` destroys the iron-session**. Good. But there's no "sign out of all devices" feature.
165. **No "remember me" toggle** — every sign-in writes a 30-day cookie (`session.ts:26`). User cannot opt out.
166. **`approvalLevel` 0/1/2/3 has no automatic ratchet** — `approveListingAction` takes `level: 1|2|3 = 2` (default 2). A reviewer can mis-click "approve" and accidentally certify a level higher than actually verified.
167. **No DSAR / data-deletion endpoint** for users (GDPR/KVKK concern). `db.delete(users)` cascades but is not user-callable.
168. **Webhook endpoints absent everywhere** — no provider-callback handlers means tier upgrades, KYC AI checks, etc. are all manual or unimplemented (Section 8 #81).
169. **No request body size limit explicitly set** on API routes — relies on Next.js defaults. Large JSON (e.g. `photoDataUrls`) can be 100+ MB.
170. **The `sessions` table is defined but unused** (`db/schema.ts:83-93`). Either remove it or wire it. Currently misleading for future devs.
171. **`signInAction` returns the same error string for "user not found" and "wrong password"** (`:245, :248`) — good. But the *timing* differs (no `bcrypt.compare` on missing user) — timing oracle for user enumeration.
172. **`/auth/forgot-password`** flow (page not read, but action analyzed) — see #25 for timing oracle there too.
173. **There is no captcha on `verifyCodeAction`** — combined with #11, brute force of the 6-digit code is the highest-impact attack against fresh signups.

---

## Severity summary

- **CRITICAL (10):** 0/middleware, 0/admin credentials, 0/dev endpoints, 1/unbounded verify tokens, 3/auto-approve standard listings, 7/appointment unauth + spoof, 7/slot race, 8/no payment provider, 9/no KYC submit, 16/private portfolio public.
- **HIGH (~25):** 0/CSRF, 0/session secret fallback, 0/counter inflation, 0/no audit on most flows, 1/verify TOCTOU, 1/sessions survive reset, 2/reset race, 3/wizard server bypass, 3/edit→re-approval missing, 3/premium upgrade free, 3/cascade destroy, 4/owner self-approve, 4/role granularity, 5/favorite counter, 5/no pagination, 6/IDOR via UUID enumeration, 6/no blocklist, 6/suspended-user messaging, 7/no scheduledAt validation, 7/agentId not verified, 9/re-submit semantics, 10/no user-side report, 11/role bypass in agent CRM, 12/session invalidation on suspend, 14/open-redirect via guide, 16/wizard hard-coded isPrivate=false.
- **MEDIUM (~30):** weak password rules, weak email regex, hard-delete cascades, slug race, role inconsistency, approval level abuse, search DoS, message thread race, mark-read no auth, message length, raw user content in templates, audit lacking, lead leak via server action, agent stats bug, no refund path, payment ↔ tier transaction, KYC re-submit, KYC docs not signed, AI scores unset, no reporter feedback, no abuse dedup, no real-time notifications, body content unescaped, unread count O(n), guide audit gap, guide ISO unchecked, mock reports, small-N de-anon, no MFA, no rate limit, transaction-less mutations, photo memory DoS, no EXIF strip.
- **LOW (~15):** signup race, history-visible reset link, no post-reset email, no compare limit, deleted compare item not reconciled, no listing expiry, sort tiebreaker, mock-AI cost, generated subject line leak, captcha absence, lastSeen stale, message snippet XSS surface, unused sessions table, timing oracle, no DSAR.

---

## Top remediation priorities (ordered)

1. **Lock down the middleware**: enforce auth on `/dashboard`, `/messages`, `/new-listing`, `/agent`, `/private-portfolio`, `/admin/**`, and any `/api/dev/**`. Implement role-based gates centrally.
2. **Kill `/api/dev/**` from any non-local environment** (check by hostname or explicit env flag, not `NODE_ENV`).
3. **Remove default admin credentials** from source AND from the login page. Force a first-run admin-creation flow.
4. **Authorize `createAppointmentAction`** (require sign-in OR captcha + bound to actual agent role).
5. **Atomically claim email-verify and password-reset tokens** (`UPDATE ... WHERE usedAt IS NULL RETURNING ...`); rate-limit verify-code attempts.
6. **Wire a real payment provider** with webhook signature verification before exposing `upgradeTierAction`.
7. **Set `approvalStatus='pending'` for ALL new listings**, not only premium. Require explicit approval for go-live.
8. **Add KYC submit + abuse-report submit user-facing actions** (currently absent).
9. **Authorize `/private-portfolio` page** behind KYC-approved gate.
10. **Add server-side rate limits, CAPTCHA, and Origin checks** on all auth + abuse-prone endpoints.
11. **Invalidate sessions on password reset and user suspension** (move session state into the existing `sessions` table or rotate iron-session pepper).
12. **Wrap counter-mutating flows (favorites, tier, payments) in DB transactions** with idempotency keys.
13. **Add soft-delete + retention** for listings, threads, payments.
14. **Granular role checks** (`super_admin > admin > moderator`) on each `admin-actions.ts` mutation.
15. **Audit-log every state-changing action** for forensic completeness.
