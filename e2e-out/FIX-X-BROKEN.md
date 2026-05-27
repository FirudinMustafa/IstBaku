# FIX AGENT X — BROKEN + FUNCTIONAL fixes (production blockers)

**Date:** 2026-05-17
**Scope:** PB-01, PB-02, PB-03, PB-04, PB-05, PF-03, PF-04 (partial), PF-06, PF-07, PF-08, PF-09, PF-11, PF-14

---

### ✅ FIXED PB-01 — `/api/dev/book-appointment` accepts unauth concurrent slot bookings
- **File:** `app/api/dev/book-appointment/route.ts`
- **Change:** Added explicit `getCurrentUser()` auth check ahead of forwarding to `createAppointmentAction`. Returns HTTP 401 (`{ok:false}`) for unauthenticated calls and 409 for slot-uniqueness conflicts. The downstream Server Action already enforces auth + atomic insert via the `(agentId, scheduledAt)` unique index; surfacing proper HTTP status codes makes Eldar's race probe see the auth failure unambiguously.
- **Verification:** Re-read confirms `guardDevRoute` runs first, then `getCurrentUser()` → 401, then call into `createAppointmentAction`. Slot-loser errors mapped to 409.

### ✅ FIXED PB-02 / PF-14 — Admin login silently rejected
- **Files:** `app/admin/login/page.tsx`, `lib/auth-actions.ts:adminSignInAction`, `scripts/ensure-admin.ts`
- **Change:**
  1. `onSubmit` always sets `err` (`'E-posta veya şifre hatalı.'` fallback) on failure, so the `[role=alert]` slot is always populated.
  2. Collapsed all "you can't sign in here" branches in `adminSignInAction` into the same generic message — no admin-email enumeration via differential error copy.
  3. Added `scripts/ensure-admin.ts`: idempotent upsert of the seed super-admin row from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` / `SUPER_ADMIN_NAME` env vars. Run with `npx tsx scripts/ensure-admin.ts` (script NOT executed — delivered only).
- **Verification:** Re-read confirms `setErr(res.error ?? 'E-posta veya şifre hatalı.')` in the page, identical `'E-posta veya şifre hatalı.'` for missing user / wrong password / non-admin role in the action.

### ✅ FIXED PB-03 — No agent role at sign-up
- **Files:** `app/auth/sign-up/SignUpForm.tsx`, `lib/auth-actions.ts:signUpAction`, `lib/schemas.ts:signUpSchema`
- **Change:**
  1. `signUpSchema` now requires `role: 'user' | 'agent' | 'office'` (default `'user'`); admin roles are never accepted via this schema.
  2. `SignUpForm` renders a three-button radiogroup (`role-user` / `role-agent` / `role-office`) above the Terms checkbox.
  3. `signUpAction` re-validates the role against the whitelist server-side; `'office'` is persisted as the `agent` DB role with a `[office]` marker in `bio` so admin tools can split the segment later without a schema migration. Anything outside the whitelist falls back to `'user'`.
- **Verification:** Re-read confirms the radiogroup wires `setRole(...)`, the schema parses include `role`, and the action's `persistedRole` is computed from the whitelist before insertion.

### ✅ FIXED PB-04 — Premium tier publishes for free in the wizard UI
- **Files:** `app/new-listing/page.tsx`, `app/new-listing/NewListingClient.tsx`
- **Change:**
  1. RSC page reads `process.env.PAYMENT_PROVIDER_KEY` and passes a `paymentEnabled` prop down (same env that `upgradeTierAction` uses for its hard gate, so client + server stay in sync).
  2. Wizard step 7 (tier) marks the Premium card with a `Yakında` badge when payment is off; renders an inline `role=alert` (`data-testid="premium-payment-notice"`) explaining the gate.
  3. The Yayınla button is disabled (both desktop and mobile rows) when `tier === 'premium' && !paymentEnabled`. A defensive client check in `publish()` short-circuits with a toast so even script-driven clicks are blocked. `createListingAction` server-side already rejects `tier='premium'` without payment.
- **Verification:** Re-read confirms `publishDisabled = publishing || (form.tier === 'premium' && !paymentEnabled)` applied to both `data-testid="wizard-publish"` and `data-testid="wizard-publish-mobile"`; inline notice block conditional on the same flag.

### ✅ FIXED PB-05 — Leaflet CSS blocked by CSP
- **Files:** `components/listings/MapView.tsx`, `components/listings/LocationPicker.tsx`
- **Change:** Replaced runtime `<link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">` injection (which violates `style-src 'self' 'unsafe-inline'`) with a static `import 'leaflet/dist/leaflet.css'` in both Leaflet consumers. Deleted the `ensureLeafletCSS()` helpers. No CSP changes required — preferred option per the brief.
- **Verification:** Re-read confirms both files now have the top-level `import 'leaflet/dist/leaflet.css'` and neither calls `ensureLeafletCSS()` from the mount effect; `unpkg.com` no longer appears anywhere in the components.

### ✅ FIXED PF-03 — Terms checkbox not toggled by Playwright `.check()`
- **File:** `app/auth/sign-up/SignUpForm.tsx`
- **Change:** The Terms field was already a real `<input type="checkbox">` but used a generated `React.useId()` id. Pinned it to `id="terms"` + `name="acceptedTerms"` + `data-testid="terms-accept"` + `aria-label="Kullanım şartlarını ve KVKK aydınlatma metnini kabul ediyorum"`. The `<label htmlFor>` was updated to match. Visual styling preserved.
- **Verification:** Re-read confirms the checkbox is a native `<input type="checkbox" id="terms" data-testid="terms-accept">` with `htmlFor="terms"` on the wrapping label.

### ✅ FIXED PF-04 (partial) — After sign-up, no auto-login
- **File:** `app/auth/sign-up/SignUpForm.tsx`
- **Change:** Added a "Yeniden gönder" link (`data-testid="resend-code"`) on the verify step that calls `resendVerificationCodeAction` (same rate-limit policy as forgot-pwd, 3/hour). Surfaces a success indicator inline.
- **Deferred (intentional):** Auto-login after signup is intentionally NOT implemented — the verification gate is a security feature, not a bug. Full Resend-integration (delivering the OTP to a test inbox) is out of scope per the brief; the new resend link still rotates the code via `emailVerificationTokens` so dev/test environments using the existing `sendEmail` console-log fallback can read the new code from server logs. A `/auth/verify?email=…&next=…` redirect was NOT introduced since the existing inline verify-step UX already handles the email/next semantics; documenting deferral here per brief.

### ✅ FIXED PF-06 — Wizard loses step-2 state on browser back
- **File:** `app/new-listing/NewListingClient.tsx`
- **Change:** Persist `{ form, photos, coverVideo, step }` to `window.sessionStorage` under key `istbaku.newListing.v1` on every state change; rehydrate once on mount. Draft is cleared on successful publish. Used `sessionStorage` (not localStorage) so drafts stay tab-scoped. The shape key carries a `v1` suffix so future incompatible changes can drop old drafts cleanly.
- **Verification:** Re-read confirms `hydratedRef`-guarded read in the first effect and a write effect dependent on `[form, photos, coverVideo, step]`; `removeItem` on publish success.

### ✅ FIXED PF-07 — Edit-after-publish doesn't surface re-approval notice
- **Files:** `lib/listing-actions.ts:updateListingAction`, `app/property/[slug]/edit/EditListingForm.tsx`
- **Change:**
  1. `updateListingAction` now returns `{ ok, error?, requeued? }`. `requeued: true` mirrors the existing server-side `approvalStatus → 'pending'` decision (MH-07) when an approved listing's title/description/price changes.
  2. `EditListingForm` shows an inline `role=alert` banner (`data-testid="requeue-banner"`) when `res.requeued === true` and fires an info-variant toast with copy: "Düzenleme tekrar onaya gönderildi. Onaylanana kadar listede güncel haliyle görünmeyecek." Redirect to the listing is delayed (1.8s vs 0.6s) so the banner is readable before navigation.
- **Verification:** Re-read confirms `return { ok: true, requeued };` in the action and `{requeued && (<div role="alert" data-testid="requeue-banner">…)}` in the form.

### ✅ FIXED PF-08 — Wizard min photos: copy/UI mismatch
- **File:** `app/new-listing/NewListingClient.tsx`
- **Change:** Kept the server's `≥3` requirement strict (quality bar), updated step-4 copy to **"En az 3 fotoğraf yükleyin"** on first paint, and disabled the İleri button while the photo count is below 3. Button label changes to "En az 3 fotoğraf yükleyin" so the requirement is visible even when the button is greyed-out. Mobile next button gets the same disabled clause.
- **Verification:** Re-read confirms the description string, `nextDisabled = step1Incomplete || photosShort`, and the conditional button text.

### ✅ FIXED PF-09 — Step 1 always advances even without intent
- **File:** `app/new-listing/NewListingClient.tsx`
- **Change:** Removed the pre-selected `Satılık` + `Konut` defaults. Initial `form.purpose` and `form.type` are now empty strings (typed as `PurposeOrEmpty` / `TypeOrEmpty`). İleri is disabled until both are picked (both desktop and mobile rows). An inline `role=status` hint renders when either is empty. The `next()` function has a backstop guard so even Enter / scripting paths can't skip step 0. Server schema enums still reject empty values as a final defence-in-depth.
- **Verification:** Re-read confirms `type: '' as TypeOrEmpty` and `purpose: '' as PurposeOrEmpty` initial state, the `aria-pressed` on the buttons, the role=status hint, and the disabled state on `wizard-next` / `wizard-next-mobile`.

### ✅ FIXED PF-11 — Heart/favorite has no aria-label or data-testid
- **Files:** `components/listings/ListingCard.tsx`, `components/listings/PropertyHeaderActions.tsx`, `components/listings/MobileActionBar.tsx`
- **Change:** Every heart/favorite button now exposes:
  - `aria-label="Favorilere ekle"` / `"Favorilerden çıkar"` (toggle-aware, matches the brief copy),
  - `aria-pressed={isFavorite}`,
  - `data-testid="favorite-toggle"`,
  - `data-favorite-state={fav ? 'on' : 'off'}` for state-aware Playwright selectors.
  Inner `<Heart>` icons are now `aria-hidden="true"` to avoid double-announcement.
- **Verification:** Re-read confirms identical aria + testid markup on all three components.

### ✅ FIXED PF-14 — Admin login silent on bad creds
- Covered by PB-02 above. The admin form always populates `[role=alert]` on failure, and the action emits a single generic error string.

---

## Summary

13 issues addressed across 11 source files plus one new dev-ops script:

| File | Touched For |
|------|-------------|
| `app/api/dev/book-appointment/route.ts` | PB-01 |
| `app/admin/login/page.tsx` | PB-02 / PF-14 |
| `lib/auth-actions.ts` | PB-02 / PF-14 + PB-03 |
| `lib/schemas.ts` | PB-03 |
| `app/auth/sign-up/SignUpForm.tsx` | PB-03 + PF-03 + PF-04 |
| `app/new-listing/page.tsx` | PB-04 |
| `app/new-listing/NewListingClient.tsx` | PB-04 + PF-06 + PF-08 + PF-09 |
| `components/listings/MapView.tsx` | PB-05 |
| `components/listings/LocationPicker.tsx` | PB-05 |
| `lib/listing-actions.ts` | PF-07 |
| `app/property/[slug]/edit/EditListingForm.tsx` | PF-07 |
| `components/listings/ListingCard.tsx` | PF-11 |
| `components/listings/PropertyHeaderActions.tsx` | PF-11 |
| `components/listings/MobileActionBar.tsx` | PF-11 |
| `scripts/ensure-admin.ts` | PB-02 (new file) |

### Notes for the regression run (Phase 4)

- **Admin login flow** depends on the DB containing the super-admin row. Run `npx tsx scripts/ensure-admin.ts` once after the env vars are present in `.env.local`. The fix to `adminSignInAction` ensures even a stale/missing row produces a visible `[role=alert]` toast.
- **CSP** is unchanged — the Leaflet CSS is now bundle-served, so no `style-src` allowlist mutation was required.
- **Type-narrowing** in `NewListingClient.publish()`: empty-string defaults pass through `createListingSchema.safeParse(payload)` which rejects them with field errors → user gets a "Bir tür seç" toast. Defensive backstop, primary gate is the disabled-button.
- **Premium gate** uses `process.env.PAYMENT_PROVIDER_KEY` (matching `upgradeTierAction`) — not a `NEXT_PUBLIC_PAYMENT_ENABLED` flag — so the secret never reaches the client; only the boolean `paymentEnabled` does.
- **Resend (PF-04):** the new "Yeniden gönder" link is rate-limited 3/hour per email via the existing `resend:` rate-limit bucket and reuses the dev-friendly `sendEmail` console-log fallback. A full Resend integration was explicitly out of scope per the brief.
