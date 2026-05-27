# UI/UX & Accessibility Audit — ISTBAKU

Scope: All `components/**`, all `app/**` pages, `app/layout.tsx`, `app/globals.css`. Cross-referenced with `audit-out/01..73-*.png` screenshots. 160+ scenarios.

Severity legend:
- CRITICAL — blocks a user / WCAG 2.1 Level A violation / data loss risk
- HIGH — clear WCAG AA violation or major UX defect impacting most users
- MEDIUM — usability defect or WCAG AAA / specific cohort impact
- LOW — polish, minor inconsistencies, future-proofing

---

## CRITICAL

### C1. Form labels are NOT associated with their inputs (htmlFor/id missing)
`components/ui/Input.tsx:59-64` defines `Label` as a plain `<label>` with no `htmlFor` prop forwarded, and every consumer (`app/auth/sign-in/page.tsx:57,64`, `app/auth/sign-up/page.tsx:115,123,132,181`, `components/listings/FilterSidebar.tsx:88,95,159,164,169`, `app/new-listing/NewListingClient.tsx:236,250-251,268,273,278-298`, `components/listings/AgentCard.tsx:245-247,250,272`) renders `<Label>X</Label><Input ... />` without `id` on the input or `htmlFor` on the label. Screen readers cannot programmatically associate the label with the field; clicking the label text also does not focus the input. WCAG 1.3.1 / 4.1.2 — Level A failure across every form in the app.

### C2. ARIA error announcements absent on all forms
No `aria-live`, `aria-invalid`, `aria-describedby`, or `role="alert"` exists anywhere in `app/` or `components/` (grep for `aria-live|aria-atomic` returns zero project files; `aria-describedby|aria-invalid` returns zero project files). When the sign-up form sets `serverError` (`app/auth/sign-up/page.tsx:208-212`) or the inline `<p className="text-[11px] text-danger">` validators trigger (`app/auth/sign-up/page.tsx:128,186`), nothing is announced to AT users and inputs are not flagged with `aria-invalid="true"`. WCAG 3.3.1 / 4.1.3.

### C3. Toast notifications are not announced to screen readers
`components/ui/Toast.tsx:33-58` renders the toast region as a plain `<div className="fixed bottom-5 right-5 z-[1000] flex flex-col gap-2 max-w-sm pointer-events-none">` — no `role="status"`/`role="alert"`, no `aria-live="polite"`/`assertive`, no `aria-atomic`. Every success/error feedback (favorites, copy link, KYC, send message, publish listing, etc.) is silent for blind users. The MobileActionBar (`components/listings/MobileActionBar.tsx:44`) "Bağlantı kopyalandı" feedback is therefore inaccessible.

### C4. No focus trap inside Modal, BottomSheet, mobile drawer, lightbox, or chat panel
- `components/ui/Modal.tsx:22-56` — sets ESC handler and scroll lock, but never restricts Tab cycling. Tab leaves the modal into the underlying page.
- `components/ui/BottomSheet.tsx:20-106` — same.
- `components/layout/Header.tsx:200-338` mobile drawer — has `role="dialog" aria-modal="true"` but no focus trap.
- `components/listings/PropertyGallery.tsx:172` lightbox — `role="dialog" aria-modal="true"` but Tab escapes.
- `components/chat/ChatbotFAB.tsx:87-201` chat panel — no dialog role at all, opens over content.
Keyboard users get lost beneath the overlay. WCAG 2.4.3 / 2.1.2.

### C5. Modal closes via clicking a non-button div backdrop with no keyboard equivalent
`components/ui/Modal.tsx:37` — `<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />`. Same anti-pattern: `BottomSheet.tsx:61`, `Header.tsx:208`, `ChatbotFAB.tsx:82`. The `<div>` is not focusable, has no role/aria-label, and is not announced. WCAG 4.1.2.

### C6. No initial focus management when dialogs open
None of Modal/BottomSheet/Drawer/Lightbox/Chat moves focus into the dialog on open or returns focus to the trigger on close. The user's focus stays on the now-hidden background trigger; AT users do not know a dialog opened. (Sign-up code uses `autoFocus` on the verification input — `app/auth/sign-up/page.tsx:242` — but that is one isolated case, not the general modals.)

### C7. Mobile filter sticky bar overlaps and traps under header
`app/listings/ListingsClient.tsx:211` — `sticky top-16 z-30 -mx-4 ...` sits at z-30 while the Header (`Header.tsx:72`) is `z-50`. On scroll the header (also sticky) sits on top, but the filter row is also `sticky top-16`, producing two stacked sticky rows that consume ~7rem of viewport on small phones (320×568) leaving only ~9rem of visible content area. Combined with `MobileBottomNav` (h-16) and `MobileActionBar` (h-14) on property pages (`components/listings/MobileActionBar.tsx:52-55`), a 320×568 device has < 25% of the viewport free for actual content.

### C8. Touch-target size violations on mobile
`components/listings/ListingCard.tsx:122` favorite/compare buttons are `size-9` (36×36) — below the 44×44 WCAG 2.5.5 / Apple HIG minimum. Same in `ContactCard`, header buttons `size-9` (`Header.tsx:104,131,176-style icon buttons are size-9 on sm:`), `CompareFloatingBar.tsx:38` (`size-8` = 32×32 close button), `Toast.tsx:53` close button (no fixed size, ~16×16 icon clickable area), `ChatbotFAB.tsx:114,117,120` (size-8 = 32×32). The header bell on mobile is `size-10` (`Header.tsx:176`) which is OK; everything inside the listing card is undersized.

### C9. Hero search input renders 12px+ on mobile due to global override but loses focus ring
`app/globals.css:135-139` forces `input, select, textarea { font-size: 16px !important; }` for ≤767px. Good for iOS zoom, but the Hero `<input>` (`components/home/Hero.tsx:47`) has class `bg-transparent border-0 outline-none` — combined with global `input:focus { outline: none; }` in `globals.css:235-239`, the search input has **no visible focus indicator** anywhere. WCAG 2.4.7 Level AA fail.

### C10. CompareFloatingBar disabled state is invisible/inactive but still presents as a Link
`components/listings/CompareFloatingBar.tsx:42-52` — when `compare.count < 2` the `<Link>` gets `cursor-not-allowed pointer-events-none` but it is still a focusable anchor with valid `href="/compare"` and no `aria-disabled`. Tab focus lands on a "disabled" link that *can be activated via Enter*. Keyboard users will land on the compare page with one item.

---

## HIGH

### H1. Mobile drawer aria-expanded but no aria-controls
`components/layout/Header.tsx:187-194` — toggle button has `aria-expanded={open}` and `aria-label="Menüyü aç/kapat"` but no `aria-controls` pointing at the drawer's `id`. Drawer aside has no `id`.

### H2. Mobile drawer Lang button group not semantic radio group
`Header.tsx:310-325` renders three plain `<button>`s for language selection without `role="radiogroup"`/`role="radio"` or `aria-checked`. Screen reader users hear "button Türkçe" three times with no indication of which is selected.

### H3. Custom select dropdowns built from buttons
`components/layout/LangSwitcher.tsx:32-48`, `app/auth/sign-up/page.tsx:155-173` (country dial picker), `Header.tsx:128-164` (user menu) — all custom listbox/menu components, none with `role="listbox"`, `role="menu"`, `aria-haspopup`, or arrow-key navigation. Closing via outside-click and ESC works, but keyboard cannot select an option without Tab-cycling through every option.

### H4. Custom checkbox visually disconnected from real input
`components/listings/FilterSidebar.tsx:259-273` (`CheckLine`) — the real `<input type="checkbox">` is `sr-only`, the visible custom box is a `<span>` without `role="checkbox"` or `aria-checked`. Tabbing reaches the hidden checkbox but the focus ring (set on `:focus-visible` for `button, a, [tabindex]`, globals.css:229) does NOT apply to inputs — focus is invisible.

### H5. Search input lacks accessible name in two places
- `app/listings/ListingsClient.tsx:152-159` (desktop "Doğal dilde ara…") — no `<label>`, no `aria-label`, only a placeholder.
- `app/listings/ListingsClient.tsx:190-207` (mobile) — same.
- `components/chat/ChatbotFAB.tsx:188-193` chat composer input — no `aria-label`/label.
Placeholder is not a label (WCAG 3.3.2).

### H6. Heading hierarchy skips levels and is duplicated
- `app/property/[slug]/page.tsx:70` uses `<h1>{property.title}</h1>`, and `CardTitle` in `components/ui/Card.tsx:28` is hard-coded to `<h3>`. Multiple `<Card>` components are used at the same nesting level as `<h2>` should be, resulting in h1 → h3 jumps everywhere (sign-in `<h1>` at `app/auth/sign-in/page.tsx:44`, AI-match `<h2>` at `app/ai-match/page.tsx:74` is inside a Card whose title is also a heading-like element).
- `components/listings/ListingCard.tsx:162` uses `<h3>` for each listing title — fine — but multiple `<h3>` siblings on the listings page have no `<h2>` parent for the result region.
- `app/listings/ListingsClient.tsx:146` page `<h1>Tüm İlanlar</h1>`, then `<h3>` cards directly underneath: skipped `<h2>`.

### H7. No `<main>` landmark exception on admin shell
`components/layout/SiteChrome.tsx:14-18` — when `isAdmin` is true the global Header/Footer/MobileBottomNav AND the `<main>` wrapper are all dropped, returning only `{children}`. AdminShell needs its own `<main>` landmark, otherwise admin pages have zero landmarks. Confirm in `app/admin/AdminShell.tsx` (not read, but pattern is risky).

### H8. Footer "social" links go nowhere
`components/layout/Footer.tsx:16-17, 41-45, 51-54` — Instagram, LinkedIn, "Hakkımızda", "Kariyer", "İletişim", "KVKK / GDPR", "Gizlilik", "Kullanım Şartları", "Çerezler" all use `href="#"`. Tab-cycling hits a dozen anchors that scroll to the top. WCAG 2.4.4 (Link Purpose) + UX dead-ends. Also legally risky for KVKK/GDPR.

### H9. Sign-up — phone country picker has no keyboard support
`app/auth/sign-up/page.tsx:155-173` — clicks register the country, but Arrow/Up/Down/Enter inside the menu do nothing. Type-ahead absent. ~196 country list rendered with no virtualization.

### H10. Sign-up — KVKK consent error never appears to screen readers
`app/auth/sign-up/page.tsx:202-206` — if user submits without accepting, the form simply does not advance (button is `disabled`) and a low-contrast `text-[color:var(--fg-faint)]` 11px hint shows. No focus jumps to the checkbox, no `role="alert"` fires.

### H11. ListingCard is a `<Link>` wrapping interactive buttons (nested interactive controls)
`components/listings/ListingCard.tsx:63-186` — the entire card is a `<Link href="/property/...">` that contains `<button>` (favorite, compare). HTML disallows interactive descendants inside an `<a>`. While `e.preventDefault()+stopPropagation()` works for mouse, screen-reader/Tab users still navigate into nested controls in an invalid DOM. Will fail axe-core and break in iOS VoiceOver swipe.

### H12. Property gallery decorative images have empty alt (good) but listing card hero has `alt={p.title}`
`components/listings/ListingCard.tsx:81` — uses `alt={p.title}` which is identical to the visible `<h3>` (`line 163`). Screen readers announce the title twice (once for the image, once for the heading). Should be `alt=""`.

### H13. Image fallback hides via `style.display = 'none'` on error, leaving alt unread
`ListingCard.tsx:82` — when the image fails, it is removed entirely, but no alt fallback / placeholder text is shown to assistive tech. The empty-image SVG underneath (lines 71-77) has no `<title>`/aria-label.

### H14. No use of `next/image` anywhere in the codebase
Grep confirms `next/image` is not imported in any app/components file. Every `<img>` is raw (`ListingCard`, `PropertyGallery`, `Header` avatar, `MessagesClient`, `AgentCard`). This produces:
- No automatic responsive `srcSet`/retina handling.
- Full-resolution images downloaded on slow 3G (CLS + LCP hit).
- No automatic lazy/blur placeholder (some have `loading="lazy"` manually, but `Header.tsx:134,237` user avatars do not).
- No size enforcement → CLS jumps on listing cards & property page hero grid.

### H15. Map view consumes full viewport with no skip-link
`app/listings/ListingsClient.tsx:274-306` — when `view === 'map'`, the `<MapView>` (Leaflet) replaces the listing grid. There is no "skip map" link, and Leaflet keyboard users get trapped panning the map.

### H16. Sign-in/sign-up are entirely client-rendered → JS-disabled users see blank page
`app/auth/sign-in/page.tsx:1` and `app/auth/sign-up/page.tsx:1` both start with `'use client'` and have no server-side fallback. With JS disabled, users see only the Suspense fallback or the static shell. Auth must work without JS for resilience (or at minimum show a noscript message).

### H17. Property images list is decorative `alt=""` but lightbox lacks any caption
`components/listings/PropertyGallery.tsx:204` — lightbox shows `<img src={safeImages[idx]} alt="" />` with no alt and no caption. The only context is "1 / N" bottom-center. AT users in lightbox get nothing.

### H18. AI Asistant FAB has aria-label but does not announce unread badge
`components/chat/ChatbotFAB.tsx:58-60` — when closed it is one button; no announcement of new follow-ups. Once open it is just a `<div>` without `role="dialog"`.

### H19. Color contrast — `text-[color:var(--fg-faint)]` on `var(--bg)` is below AA
Light theme: `--fg-faint: #93a4bf` on `--bg: #f4f6f9` → contrast ≈ 2.5:1 (needs 4.5:1 normal, 3:1 large). Dark theme: `--fg-faint: #5b6b80` on `--bg: #050f1f` → contrast ≈ 4.0:1 (fails AA for normal text). Used widely: `Footer.tsx:22,31,39`, ListingCard timestamps (`ListingCard.tsx:178`), all "11px text" hints. WCAG 1.4.3.

### H20. Gold link on dark background contrast
`--color-gold-300: #fdba74` on `--bg: #050f1f` ≈ 9.5:1 — OK. But `--color-gold-400: #f97316` (the primary brand) on `--bg-elev` (light theme `#ffffff`) ≈ 3.3:1 — fails AA for body-size text. Hero CTA "Ara" button on white card (Hero.tsx:54) is bg-gold-400, text uses navy-900 → OK. But hover state `hover:bg-gold-500: #ea580c` on navy-900 text ≈ 5.5:1, OK. The risky combo: `text-gold-300` link on `--bg-elev` light (`#ffffff`) — contrast ≈ 1.6:1, completely unreadable. Visible at `Footer.tsx` hover, Header active nav.

### H21. Active nav state uses `text-gold-300` on `bg-gold-400/10` (10% alpha) — invisible in light mode
`Header.tsx:90` — `text-gold-300 bg-gold-400/10`. On light theme `#fdba74` text on near-white background is ≈ 1.9:1. Failing.

### H22. Fixed header z-50 not announced as `<nav role="navigation">` named
`Header.tsx:70` — `<header>` and `<nav>` inside are unnamed. With multiple `<nav>` elements (Header, MobileBottomNav, breadcrumb on property page) screen readers list "navigation, navigation, navigation". Each needs `aria-label`.

### H23. MobileBottomNav anchor uses Link without aria-current
`components/layout/MobileBottomNav.tsx:33-62` — the active tab has visual gold styling but no `aria-current="page"`. WCAG 4.1.2.

### H24. Sticky header overlaps in-page anchor jumps
With header `h-16` sticky, any `#section` hash jump on the page lands behind the header. No `scroll-padding-top` is set on `html`.

### H25. New-listing wizard step indicator not announced
`app/new-listing/NewListingClient.tsx:190-202` — visual circled numbers with check-mark for completed. No `aria-current="step"`, no `<ol>` list, no progress announcement (`role="progressbar"` or `aria-valuenow`). Power wheelchair / SR user cannot tell which step they are on.

### H26. New-listing: photo upload has no live preview alt and no remove keyboard support
Inferred from `NewListingClient.tsx:74-96` (handlePhotos) — the photos array is rendered (in code not shown) but the upload state has no progress indicator, no "X added of 12 max" SR announcement.

### H27. Custom skeleton has no aria-busy region
`components/ui/Skeleton.tsx:3-7` — pure visual; no `role="status"`/`aria-live="polite"`/`aria-label="Yükleniyor"`. SR users perceive no loading at all.

### H28. Toast auto-dismisses after 4.5s — too short for slow readers
`Toast.tsx:25` — `setTimeout(...4500)`. WCAG 2.2.1 "Adjustable" requires that the user can turn off, adjust, or extend time limits (or 20s default). 4.5s is too brief for many SR users to read a multi-line description and act.

### H29. Heart/Compare buttons toggle aria-label but do not announce state change
`ListingCard.tsx:119-138` — `aria-label` flips between "Favorile" and "Favorilerden çıkar" but there's no `aria-pressed={fav}` on the button. Toggle semantics missing.

### H30. Phone input pattern not validated against international codes
`app/auth/sign-up/page.tsx:56` — `^\d{6,15}$` permits 6-digit "phone" but the user-facing dial code is set separately. No combined format validation. Also `inputmode="numeric"` is set but `type="tel"` should be on the input (it is at line 146 — OK; but the value pattern allows whitespace stripped to digits).

### H31. Listings filter sidebar uses border-bottom-dashed for visual section dividers — print fail
`FilterSidebar.tsx:228` — `border-b border-dashed pb-3` per section. No print stylesheet hides these. No `@media print` anywhere; property detail and reports cannot be printed cleanly.

### H32. Currency converter / Hero stats use gradient text — `bg-clip-text text-transparent`
`Hero.tsx:28-30,95-97` and AI-match — Tailwind gradient text. In high-contrast Windows mode or forced-colors, the text disappears (transparent fallback). Should provide `forced-color-adjust: auto` or solid-fallback.

### H33. RTL not supported but Arabic/Russian inevitable for AZ market
`lib/i18n.ts:4` — `SUPPORTED_LANGS = ['tr','az','en']` — currently no RTL languages. But many components have hardcoded `ml-/mr-/text-left` (5 files: `Header`, `ListingCard`, `InvestmentScoreCard`, `MobileActionBar`, `PropertyGallery`) and no `dir` toggle. When Russian/Arabic is added (or any AZ Cyrillic), directional flips will not occur.

### H34. Long text overflow on property title
Pasting a 200-char title → `ListingCard.tsx:162` uses `line-clamp-2` (good), but `PropertyDetail` `<h1>` (`app/property/[slug]/page.tsx:70`) has `max-w-3xl` with no line-clamp, no `text-balance`/`word-break`. A title with a single 200-char unbroken token would cause horizontal scroll on mobile.

### H35. Description / freeform text — no overflow guard
`PropertyDetail` shows `{property.description}` (typically rendered later in the page). Inferred — no `prose` styling, no `whitespace-pre-line` + `break-words` guard on description with 10k characters → horizontal scroll on narrow viewports.

### H36. ChatBot composer disables Send by `!input.trim() || busy` but offers no Enter-to-send feedback
`ChatbotFAB.tsx:184-197` — form submit on Enter works, but if the user pastes 50k chars (the entire chat history) there is no debounce, no maxLength on the input. The `respond()` mock may freeze the UI.

### H37. ChatBot uses dangerouslySetInnerHTML
`ChatbotFAB.tsx:139` — `dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}`. The `renderMarkdown()` (line 208-214) escapes `&<>` but only formats `**bold**`. Safe today, but the pattern is XSS-prone if future content sources change.

---

## MEDIUM

### M1. Suspense fallback is plain text, not accessible loading region
`app/auth/sign-in/page.tsx:100` — `<div>...Yükleniyor…</div>` is not announced.

### M2. Verification code input is type="text" with pattern but no `aria-label`
`app/auth/sign-up/page.tsx:237-247` — input has good `inputMode="numeric"`, `autoComplete="one-time-code"`, `maxLength`, but the visible Label "Doğrulama Kodu" is not associated via id/for (see C1).

### M3. `placeholder="• • • • • •"` is purely cosmetic
`app/auth/sign-up/page.tsx:245` — the placeholder pattern can confuse screen readers and obscure the autofill prompt.

### M4. Currency converter / map / charts: no `<figure>`/`<figcaption>`
`AdminDashboardCharts`, `app/admin/analytics/AnalyticsCharts.tsx`, `app/admin/payments/PaymentsCharts.tsx`, `Calculators.tsx`, `CurrencyConverter.tsx` (recharts) — without titles or text-alternative tables, charts are inaccessible to AT users.

### M5. Reports page has no print stylesheet
`app/reports/page.tsx` — no `@media print` rules in `globals.css`. Investors will print reports; backgrounds (dark theme `--bg: #050f1f`) will burn ink.

### M6. Property detail breadcrumb is `<nav>` but unnamed
`app/property/[slug]/page.tsx:48-56` — `<nav>` with no `aria-label="Breadcrumb"`. Items are not `<ol>`/`<li>`.

### M7. Header bell unread badge text not announced as "yeni"
`Header.tsx:110-113,180-184` — badge shows the digit but the label `aria-label='Bildirimler (${unread} okunmamış)'` works on desktop only; on mobile the badge is rendered without context update on count change. Good attempt though.

### M8. Mobile filter "X aktif filtre" pill doesn't announce removal
`app/listings/ListingsClient.tsx:241-256` — pressing the X removes the filter visually but no toast/SR announcement.

### M9. AI Asistant FAB uses `animate-pulse-glow` continuously
`globals.css:219-223` — infinite pulse animation. With `prefers-reduced-motion`, no override exists. The chatbot button visually pulses forever.

### M10. `animate-floaty` and `shimmer` lack reduced-motion guard
`globals.css:208-217, 197-211`. WCAG 2.3.3 / vestibular concerns.

### M11. ChatbotFAB visible on every non-admin page including auth — covers form on small screens
On a 320×568 viewport the FAB "AI Asistan" sits over the sign-up "Hesabın var mı?" link (visible in `audit-out/73-mobile-sign-up.png`). It also overlaps the bottom of the sign-up form's submit button on iPhone SE.

### M12. Listings split view collapses to no map on xl: breakpoint
`app/listings/ListingsClient.tsx:281-294` — `view === 'split'` shows map only at xl: (1280+). On laptops 1024–1279, the user picked "Bölünmüş" but sees no map. No fallback or indicator.

### M13. Empty state is generic
`app/listings/ListingsClient.tsx:342-349` — single line "Sonuç yok". No illustration, no "clear filters" CTA, no suggestion. Same for compare empty, dashboard tabs (favorites empty, messages empty — though `MessagesClient.tsx:98-105` has a decent one).

### M14. New-listing wizard — back button uses ArrowLeft text but no escape-to-cancel
`app/new-listing/NewListingClient.tsx:114-136` `next()` validates; there is no `prev()` shown in the trimmed view but the wizard cannot be exited mid-flow without losing 7 steps of data. No "Save draft" / "Exit" confirmation.

### M15. New-listing step toast errors fire but don't focus the broken field
`NewListingClient.tsx:114-136` — when validation fails, toast appears but focus stays on "Next". User must manually scroll back to find the broken field.

### M16. Compare page (`app/compare/page.tsx`) — empty state not previewed
Per screenshot `09-compare-empty.png`, the empty state shows but heading hierarchy and ARIA not verified.

### M17. Sign-in CTA "Şifreni mi unuttun?" is `text-xs` (12px) — below recommended minimum
`app/auth/sign-in/page.tsx:83-85`. Below 14px is poor for low-vision users (WCAG 1.4.4 supports scaling, but text-xs underlines are easy to miss).

### M18. Hero pill "popüler" suggestions wrap awkwardly at 360px
`Hero.tsx:60-72` — 4 pills + the "Popüler:" label use `flex-wrap` so on 360px the second pill drops to a single-pill row, but pill height is uneven. Visual jitter.

### M19. Theme toggle on header is `hidden sm:inline-flex` (Header.tsx:101)
Mobile users cannot toggle theme from the header; only from the drawer → Ayarlar → Tema button. Not a blocker, but inconsistent.

### M20. PropertyGallery dot navigator hides remaining count behind tiny "+N"
`PropertyGallery.tsx:115-117` — `+N` is 10px and grey. Hard to read in light mode.

### M21. AppointmentModal builds local ISO with `toISOString()` confusion
`AgentCard.tsx:165-168` — comment says "Treat as local time of the agent" but `new Date('YYYY-MM-DDTHH:MM:00').toISOString()` converts via local browser zone. Cross-timezone agent/user pairings will show wrong slots.

### M22. AppointmentModal: disabled slot uses `line-through opacity-40` (3:1 contrast)
`AgentCard.tsx:283` — disabled slots may be confused with selected/hover. No `aria-disabled` either.

### M23. Long text in agent bio
`AgentCard.tsx:87-89` — `agent.bio` rendered as `<p className="text-xs text-[color:var(--fg-muted)] leading-relaxed">`. No line-clamp; long bios push card height.

### M24. Listings page `id="listings-results"` exists (good) but no skip-link to it
`app/listings/ListingsClient.tsx:272`. A "Skip to results" link at top of page would help keyboard users bypass filters.

### M25. Filter Chip uses `text-gold-300` on `bg-gold-400/15` for active
`FilterSidebar.tsx:248-251` — active state hard to distinguish in light mode (light orange-on-light orange). Contrast ≈ 2.6:1.

### M26. `<select>` arrow inlined via SVG with hardcoded color `%2393a4bf`
`components/ui/Input.tsx:48` — arrow is fixed grey regardless of theme. In light mode (white bg), grey arrow on white = low contrast.

### M27. New-listing photo `coverPhotoIndex` selector
`NewListingClient.tsx:71` — exists in state but UI affordance (photos.map → click to set cover) not seen in the audit subset; ensure each photo thumbnail has `aria-pressed`.

### M28. ChatbotFAB clears messages on refresh
`ChatbotFAB.tsx:21` — `useState(WELCOME)`. No `localStorage` persistence, so users lose their chat history on every page change (the panel is mounted globally though, so navigation within app keeps state — but full reload loses it).

### M29. Mobile drawer scroll inside drawer + body scroll lock OK, but the drawer's overscroll
`Header.tsx:267` — `<nav className="px-3 py-4 flex-1 overflow-y-auto">`. Lacks `overscroll-behavior: contain` → on iOS, dragging at the bottom can rubber-band the underlying page.

### M30. Header user-menu chevron rotates 90deg on open
`Header.tsx:136` — uses `rotate-90` but icon is `ChevronRight`, not `ChevronDown`. Visually wrong direction (should rotate 90 → faces down).

### M31. CTA spacing inconsistent
`Footer.tsx`, `Hero.tsx`, `AgentCard.tsx` use different `gap-` and `space-y-` values. Visual inconsistency.

### M32. `formatPrice` not previewed for very large numbers
If `price = 999_999_999` USD → `formatPrice` (not read) likely produces a long string; `ListingCard.tsx:146` `<div className="text-lg font-bold">` may wrap.

### M33. Hero stat `12,800+` uses gradient text not announced as a single block
`Hero.tsx:88-100` — Stat block has `v` value gradient + `l` label below. SR announces "12,800+ Aktif İlan" but visual order/grouping may confuse.

### M34. Mobile bottom-nav "Favoriler" goes to `/dashboard?tab=favorites` and "Hesap" goes to `/auth/sign-in` even when authed
`components/layout/MobileBottomNav.tsx:13-14` — "Hesap" always points at sign-in; logged-in users get redirected to dashboard but the route is wrong semantically.

### M35. ScreenReader cannot tell ListingCard score
`ListingCard.tsx:165` — `<ScoreRing value={p.score.total} ... />` is decorative (no caption). The actual score is rendered visually inside the ring.

### M36. Hover-only video preview on listing card breaks for keyboard users
`ListingCard.tsx:65-66` — `onMouseEnter/Leave` toggles video. Keyboard focus does not trigger preview; touch users (no hover) never see preview. Move to `onFocus`/`Intersection-based` for parity.

### M37. Map markers labeled by city not by full address
(Inferred from `MapView` use) — likely no individual marker title; AT users cannot select listings via map.

### M38. SiteChrome `<main>` lacks `id="main"` and skip-link
`SiteChrome.tsx:22` — `<main className="min-h-[calc(100vh-4rem)]">{children}</main>`. No `id`, no "Skip to content" link at the top of the page. WCAG 2.4.1 Level A.

### M39. Theme toggle button has no aria-pressed
`ThemeToggle.tsx:10-22` — flips icon but no `aria-pressed={theme === 'dark'}`.

### M40. Some onClick handlers swallow events
Various components call `e.stopPropagation()` (ListingCard heart, compare). When ListingCard wraps the entire link, the stopPropagation pattern is correct, but it means right-click "Open in new tab" on those buttons does nothing.

### M41. Bottom-nav fixed at bottom always — covers footer
On scroll to bottom of any non-admin page, mobile bottom-nav (`h-16`) covers footer's bottom-row links (`Footer.tsx:48-56`). `body.has-bottom-nav main { padding-bottom: 4.5rem }` (globals.css:128-131) doesn't apply to `<footer>`.

### M42. No skeleton for ListingCard during query loading
The listings page returns initial server-rendered set, but Filter changes are client-side and instantaneous. If/when remote sort is added, no skeleton fallback exists.

### M43. New-listing publishing button shows spinner via Button loading prop — OK; but no aria-busy on the form
`NewListingClient.tsx:138-180`.

### M44. Toast position bottom-right collides with ChatBot FAB
`Toast.tsx:33` is `bottom-5 right-5`; `ChatbotFAB` is also bottom-right. Toasts will sit *behind* the FAB or push above it ungracefully.

### M45. Toast queue unbounded
`Toast.tsx:21-26` — pushing many toasts stacks them off-screen with no max queue length.

---

## LOW

### L1. Sign-in error displayed inline with icon but using `align-items: flex-start`
`app/auth/sign-in/page.tsx:71-75` — minor visual: icon sits above first line.

### L2. Hero subtitle has `text-pretty` but `<h1>` uses `text-balance`
`Hero.tsx:26,34` — different wrap behaviors. Cosmetic.

### L3. Stats `12,800+` includes hardcoded `,` separator
`Hero.tsx:89` — should use `Intl.NumberFormat` for the active language.

### L4. "Onaylı" badge has emoji `★`
`ListingCard.tsx:110`, also `app/property/[slug]/page.tsx:66`. SRs read "black star Premium" — acceptable, but could be `aria-hidden` on the emoji + visible-text-only.

### L5. Country flags rendered as emoji (🇹🇷, 🇦🇿)
`FilterSidebar.tsx:81-82`, `Hero.tsx`, `NewListingClient.tsx:238-239` — flag emojis render inconsistently across OS (Windows has no flag emojis). Better: SVG flag icons.

### L6. Filter chip checkmark icon size 11px
`FilterSidebar.tsx:267` — tiny.

### L7. Sign-up Türkçe-only — no language fallback on auth pages
`app/auth/sign-in/page.tsx:44` — hardcoded "ISTBAKU'ya giriş yap"; `useLang` not used.

### L8. Footer copy uses TR-specific phrasing
`Footer.tsx:50` — "Tüm hakları saklıdır" not translated.

### L9. ScoreRing absolute size 48px
`ListingCard.tsx:165` — does not scale at zoom-200%.

### L10. Listings card heart button positioned absolute top-3 right-3 — on iPhone safe-area at top
Not relevant since card has no safe-area context, but visually the heart can hide behind notch on full-bleed images.

### L11. `select option` styled in `globals.css:245-253`, but native select on Windows uses OS skin overriding
Native select arrow custom SVG (Input.tsx:48) works, but options behind it open in OS-native overlay.

### L12. Various `text-[10px]` micro labels (e.g. `Header.tsx:268`, `MobileBottomNav.tsx:55`)
Below 12px minimum on small screens. Several screenshots show text barely legible.

### L13. `glass` blur effect on dark backdrop
`globals.css:190-195` — `backdrop-filter` not supported in older browsers; fallback uses `color-mix`, which is also limited in older browsers (Safari < 16.4). No `@supports` fallback.

### L14. Hero CTA buttons "İlanları Keşfet" and "AI Eşleşme Başlat" — equally weighted on mobile
Both `<Button variant>` differ but visual hierarchy weak in `audit-out/70-mobile-home.png`.

### L15. NewListingClient — currency select includes AZN but Hero uses USD pricing only
Possible mismatch; M5 in stack notes mentions multi-currency. Verify display.

### L16. AdminShell — pattern `if (isAdmin) return <>{children}</>` (SiteChrome.tsx:14) means admins lose ChatbotFAB
Intentional. But also lose the mobile-bottom-nav for admin mobile use → admin on mobile has no navigation. Risk if admins use mobile.

### L17. Cookie/consent banner not present
KVKK/GDPR — required for EU/TR. Footer links to KVKK go to `#`. Risk.

### L18. `next-env.d.ts` exists (good); no manifest.json for PWA
Stack claims mobile-first; no install prompt, no service worker, no offline.

### L19. Header `Logo` uses `<Logo>` component (not previewed) — likely accessible if it wraps `<Link>` with text
Visual inspection in screenshots shows `ib` mark + `ISTBAKU TR · AZ · AI` text — good.

### L20. NewListingClient stale form recovery — no localStorage save
A 7-step form with no draft save. Refreshing mid-wizard loses everything.

### L21. LangSwitcher pop-up positioned right-0 — may overflow viewport on small screens
`LangSwitcher.tsx:33`. On 320px iPhone, mostly fine, but check on 280px Galaxy Fold.

### L22. Search `q` debounce 350ms (`ListingsClient.tsx:130`) — OK, but no spinner during debounce window

### L23. Mobile menu drawer width `86%` of viewport with `max-w-[360px]`
`Header.tsx:214` — fine, but no swipe-to-close gesture (only ESC and backdrop tap).

### L24. ChatbotFAB uses inline `paddingBottom: env(safe-area-inset-bottom)` style
`ChatbotFAB.tsx:96` — works, but better as `pb-safe` utility from globals.

### L25. PropertyGallery 360° tab shows just a placeholder
`PropertyGallery.tsx:217-221` — "Matterport altyapısı" is a mocked placeholder. Real users will be disappointed.

### L26. Toast description not provided for many calls
e.g. `MobileActionBar.tsx:48` "Kopyalanamadı" has no description. Many UI feedbacks are title-only.

### L27. ListingsClient sort select is a native `<select>` — fine for a11y but the down chevron color is hardcoded
M26 reiteration in low-priority context.

### L28. The "Doğal dilde ara" placeholder implies natural language but is just a substring search
`ListingsClient.tsx:18-22` — filter applies a lowercase `includes()` on title/desc/city/district. Misleading.

### L29. Header sticky on mobile, `safe-top` good
`Header.tsx:72` — but uses `bg-[color:var(--bg)]/40` when not scrolled (line 73) which is very transparent over hero — first-render flash on the property page.

### L30. PropertyGallery dots show first 8 plus `+N`
`PropertyGallery.tsx:104-117` — if there are 9 photos, dot 9 is hidden behind `+1` text instead of showing as a dot.

### L31. Dashboard uses `tab` query param; pages don't deep-link `#section`
`app/dashboard/DashboardClient.tsx:50-60`. Useful for SSR; just not document-fragment based.

### L32. Hover-only "Tümünü gör" button on desktop gallery
`PropertyGallery.tsx:162-167` — visible always, but corner placement could obscure last thumbnail's content.

### L33. NewListingClient redirects unauth users via useEffect → flashes content before redirect
`NewListingClient.tsx:42-44` — pattern flashes the form. Should be middleware-gated.

### L34. `getBookedSlotsAction` runs on every modal open
`AgentCard.tsx:189-197` — no cache, no debounce.

### L35. Hero search "Ara" button shows ArrowRight icon next to text → fine; but on 320px the button shrinks below recommended `min-h: 44px`
`Hero.tsx:54-57` — `size="lg"` (h-12 = 48px) is fine. OK.

### L36. Compare page header is "Karşılaştırma" — verify hierarchy not skipped
Inferred from screenshot only.

### L37. NewListingClient uploads photos as base64 data URLs
`NewListingClient.tsx:83-96` — 12 photos × ~3 MB each = 36 MB of base64 in client memory + server payload. Mobile browsers may OOM.

### L38. PropertyDetail PriceCard / QuickMortgage / RegionProfile — none verified directly; heading levels likely off
Inferred.

### L39. ChatbotFAB welcome message renders before any user interaction → potential layout shift on initial open

### L40. Listings `view === 'split'` on mobile (≤ md) silently hides the map column
`ListingsClient.tsx:282-294` — map hidden behind `hidden xl:block`. User who selected split view on mobile (no UI to do so, but state can be set via initial query param) gets a list. Cosmetic.

---

## Adversarial scenario outcomes

| Scenario | Result |
|---|---|
| Paste 10,000 chars into name field (sign-up) | No `maxLength` on `Input` (`app/auth/sign-up/page.tsx:118`); allowed. Layout: name is `<Input>` no wrap → unbroken token will overflow card width via input scroll, but error messaging fine. |
| SR user submits sign-up with bad email | `<p class="text-[11px] text-danger">Geçerli e-posta gir.</p>` appears but no `aria-live`/`aria-invalid` → silent for SR. Same for password ≥8 chars. |
| Keyboard-only modal dismiss | ESC works (Modal.tsx:25-31, BottomSheet:27, Header drawer:55-60, Gallery:25-31). Backdrop click dismiss is mouse-only. ✅ for ESC. |
| 320px viewport horizontal scroll | `body { overflow-x: clip }` (globals.css:124) hides scroll but content may still be clipped. Property detail breadcrumb wraps fine. Listings sticky filter bar `-mx-4 px-4` extends to viewport edges — OK. Hero stats grid `grid-cols-2 sm:grid-cols-4` on 320px shows 2 cols × 2 rows — OK. |
| Slow 3G + CLS | High risk: no `next/image`, no `width/height` on `<img>` tags (`ListingCard.tsx:79-88` no dimensions), no skeleton dimensions matching cards → significant CLS jumps. |
| JS disabled | Sign-in/up show only `'Yükleniyor…'` (Suspense fallback) since the entire form is in a client component. Form unusable. Hero is server-rendered (page.tsx → Hero is client but the wrapping page may SSR). Listings client component → blank without JS. Home page partially works. |
| 200-char unbroken token in title | `<h1 className="text-2xl sm:text-3xl font-bold tracking-tight max-w-3xl">` (property page line 70) — `overflow-wrap: anywhere` is not set; on narrow viewports it causes overflow because `max-w-3xl` clamps width but no `break-words`. |
| Triple-click select text inside FAB chat bubble | `dangerouslySetInnerHTML` — selectable. OK, but markdown HTML is rendered as DOM, no `user-select` issues. |
| Submit form, navigator.share unsupported | `MobileActionBar.tsx:36-49` properly falls back to `navigator.clipboard.writeText`. ✅ |
| Run in macOS Safari with `prefers-reduced-motion: reduce` | All animations (`shimmer`, `floaty`, `pulse-glow`, modal entrance, button `active:scale-[0.98]`, ListingCard `group-hover:scale-[1.04]`, ChatBot pulse) continue. No `@media (prefers-reduced-motion: reduce)` override anywhere. |
| Forced colors / Windows high-contrast | Gradient text (`bg-clip-text text-transparent`) goes invisible. CSS custom properties (`color: var(--fg)`) may map to user colors but `bg-gold-400/15` and `border-gold-400/30` lose meaning. No `forced-color-adjust` rules. |
| RTL pseudo-test (set `dir="rtl"` on `<html>`) | All `ml-*/mr-*`, `left-*/right-*` utilities don't flip. Hero search bar's `<Search size={18}>` stays on the left. Modal close button stays on right (`Modal.tsx:48`). Mobile drawer slides in from `right-0` always (`Header.tsx:214`) — wrong for RTL. Should use logical properties (`ms-`, `me-`, `inset-inline-end`). |
| Sign up with 6-digit phone (e.g., 555010) | `phoneValid` regex (`^\d{6,15}$`) accepts it. No country-specific minimum. |
| Submit 0-length search via Enter | Hero search redirects to `/listings` with no q — works (Hero.tsx:42). Listings search debounces empty string — works. |
| Tab from header into mobile drawer when open | Drawer overlays page but no focus trap → Tab moves into hidden background content. Combined with `pointer-events-none` on the wrapper when closed, the page focus is unrecoverable mid-state. |
| Open multiple modals in quick succession (e.g., Modal then BottomSheet) | Both attempt `document.body.style.overflow = 'hidden'` and `= ''` in cleanup. Race: close Modal A while Modal B open → body becomes scrollable while Modal B still open. Bug. |
| User has 99+ favorites in list | Dashboard not previewed deeply; likely no pagination. |

---

## Quick-fix priority list (top 12 actions)

1. Wrap `ToastProvider` toast region in `<div role="status" aria-live="polite" aria-atomic="true">` to fix C3.
2. Add `id` prop to `Input`/`Textarea`/`Select` and `htmlFor` to `Label` (auto-generate IDs via `React.useId`); set `aria-describedby`/`aria-invalid` from a sibling `<p role="alert">` for errors. Fixes C1+C2 across every form.
3. Implement a generic `useFocusTrap` hook and apply to `Modal`, `BottomSheet`, mobile drawer, lightbox, chat panel. Also handle initial-focus + return-focus. Fixes C4+C6.
4. Add `<button onClick=onClose aria-label="Kapat" className="sr-only">` (or convert backdrop to button) with keyboard support, OR rely on ESC only and remove backdrop-as-button pattern. Fix C5.
5. Bump every icon button to `size-11` (44px) on mobile, especially `ListingCard` heart/compare and `Toast` close. Fix C8.
6. Add `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; } .animate-pulse-glow,.animate-floaty,.shimmer { animation: none !important; } }` to `globals.css`. Fix M9+M10.
7. Replace `<img>` with `next/image` in `ListingCard`, `PropertyGallery`, `Header` avatar, `Messages`, `AgentCard`. Set explicit `width`/`height` to prevent CLS. Fix H14.
8. Add a global `Skip to main` link at top of `SiteChrome` + `id="main"` on `<main>` and on `<aside>` filter. Fix M38.
9. Add `aria-current="page"` to `MobileBottomNav` active tab. Replace mobile drawer Lang buttons with semantic radiogroup. Fix M34/H2/H23.
10. Add `@media print` section to `globals.css`: set bg white, force `--fg: #000`, hide nav/footer/FAB/bottom-bar, expand images. Fix M5/H31.
11. Add `forced-color-adjust: auto;` and explicit `border: 1px solid CanvasText` overrides for buttons/cards in `@media (forced-colors: active)`. Fix H32.
12. Use `useId` to generate stable IDs for combobox patterns (LangSwitcher, country picker, user menu) and apply `role="listbox"/option"` with arrow-key handler. Fix H3+H9.
