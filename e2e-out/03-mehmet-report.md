# Persona 3 — Mehmet Report
**Date:** 2026-05-17
**Browser:** Chromium desktop
**Total scenarios run:** 16
**Passed:** 8
**Failed:** 8

## 🔴 BROKEN
### #B001 — step7-wizard-medya-single
**URL:** http://localhost:3000/new-listing
**Action:** step7-wizard-medya-single
**Expected:** Step succeeds without error
**Actual:** Error: locator.click: Timeout 10000ms exceeded.
**Screenshot:** e2e-out/screenshots/persona-3-step7-wizard-medya-single-FAIL.png

### #B002 — step8-wizard-kapak
**URL:** http://localhost:3000/new-listing
**Action:** step8-wizard-kapak
**Expected:** Step succeeds without error
**Actual:** Error: locator.click: Timeout 10000ms exceeded.
**Screenshot:** e2e-out/screenshots/persona-3-step8-wizard-kapak-FAIL.png

### #B003 — step9-wizard-bolge
**URL:** http://localhost:3000/new-listing
**Action:** step9-wizard-bolge
**Expected:** Step succeeds without error
**Actual:** Error: expected 4 sliders, got 0
**Screenshot:** e2e-out/screenshots/persona-3-step9-wizard-bolge-FAIL.png

### #B004 — step10-wizard-tier-premium
**URL:** http://localhost:3000/new-listing
**Action:** step10-wizard-tier-premium
**Expected:** Step succeeds without error
**Actual:** Error: locator.click: Timeout 10000ms exceeded.
**Screenshot:** e2e-out/screenshots/persona-3-step10-wizard-tier-premium-FAIL.png

### #B005 — step11-wizard-publish-standart
**URL:** http://localhost:3000/new-listing
**Action:** step11-wizard-publish-standart
**Expected:** Step succeeds without error
**Actual:** Error: locator.click: Timeout 10000ms exceeded.
**Screenshot:** e2e-out/screenshots/persona-3-step11-wizard-publish-standart-FAIL.png

### #B006 — step12-validation-empty-step1
**URL:** http://localhost:3000/new-listing
**Action:** step12-validation-empty-step1
**Expected:** Step succeeds without error
**Actual:** Error: locator.click: Timeout 10000ms exceeded.
**Screenshot:** e2e-out/screenshots/persona-3-step12-validation-empty-step1-FAIL.png

### #B007 — step13-validation-short-desc
**URL:** http://localhost:3000/new-listing
**Action:** step13-validation-short-desc
**Expected:** Step succeeds without error
**Actual:** Error: locator.fill: Timeout 10000ms exceeded.
**Screenshot:** e2e-out/screenshots/persona-3-step13-validation-short-desc-FAIL.png

### #B008 — step14-validation-no-photos
**URL:** http://localhost:3000/new-listing
**Action:** step14-validation-no-photos
**Expected:** Step succeeds without error
**Actual:** Error: locator.click: Timeout 10000ms exceeded.
**Screenshot:** e2e-out/screenshots/persona-3-step14-validation-no-photos-FAIL.png

## 🟠 FUNCTIONAL
### #F001 — Sign-up did not reach verify step
**URL:** http://localhost:3000/auth/sign-up
**Action:** Submit sign-up for mehmet-agent-1779302311076@istbaku-test.example
**Expected:** 6-digit code prompt
**Actual:** verify input missing; alert=""

## 🟡 UX
### #U001 — Edit-after-publish does not warn about re-queue for approval
**URL:** http://localhost:3000/property/i-stanbul-besiktas-3-1-konut-2/edit
**Action:** Change price on edit page and save
**Expected:** Toast or banner like "Değişikliğin onay bekliyor"
**Actual:** No re-approval messaging shown
**Suspected cause:** Edit flow auto-approves without round-tripping admin moderation
**Suggested fix:** On price/material edits, flip listing.status → "pending" server-side and surface a toast

## 🟢 POLISH
### #P001 — Console/page/network noise during run
**URL:** http://localhost:3000/property/i-stanbul-besiktas-3-1-konut-2/edit
**Action:** End-of-test diagnostic dump
**Expected:** 0 console errors, 0 page errors, 0 5xx responses
**Actual:** console=2 pageerr=0 net5xx=0
**Console:** Failed to fetch RSC payload for http://localhost:3000/auth/sign-up. Falling back to browser navigation. TypeError: Failed to fetch
    at createFetch (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/router-reducer/fetch-server-response.js:154:12)
    at fetchServerResponse (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/router-reducer/fetch-server-response.js:82:27)
    at hmrRefreshReducerImpl (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/router-reducer/reducers/hmr-refresh-reducer.js:33:67)
    at clientReducer (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/router-reducer/router-reducer.js:41:65)
    at Object.action (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/shared/lib/router/action-queue.js:130:55)
    at runAction (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/shared/lib/router/action-queue.js:42:38)
    at runRemainingActions (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/shared/lib/router/action-queue.js:20:13)
    at handleResult (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/shared/lib/router/action-queue.js:49:9) | Failed to fetch RSC payload for http://localhost:3000/dashboard?tab=listings. Falling back to browser navigation. TypeError: Failed to fetch
    at createFetch (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/router-reducer/fetch-server-response.js:154:12)
    at fetchServerResponse (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/router-reducer/fetch-server-response.js:82:27)
    at hmrRefreshReducerImpl (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/router-reducer/reducers/hmr-refresh-reducer.js:33:67)
    at clientReducer (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/router-reducer/router-reducer.js:41:65)
    at Object.action (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/shared/lib/router/action-queue.js:130:55)
    at runAction (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/shared/lib/router/action-queue.js:42:38)
    at dispatchAction (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/shared/lib/router/action-queue.js:96:9)
    at Object.dispatch (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/shared/lib/router/action-queue.js:128:40)
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/use-reducer.js:37:21)
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/app-router.js:246:25)
    at exports.startTransition (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react/cjs/react.development.js:1427:27)
    at Object.hmrRefresh (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/app-router.js:245:48)
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/react-dev-overlay/app/hot-reloader-client.js:335:28)
    at exports.startTransition (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react/cjs/react.development.js:1427:27)
    at processMessage (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/react-dev-overlay/app/hot-reloader-client.js:334:44)
    at WebSocket.handler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/react-dev-overlay/app/hot-reloader-client.js:508:17)


## ✅ PASSED
- step0-warmup
- step1-signup-form
- step2-seeded-sign-in
- step3-open-wizard
- step4-wizard-tur
- step5-wizard-konum
- step6-wizard-detay
- step15-dashboard-listings
- step16-edit-listing

## 📊 STATISTICS
- Findings: 11 (BROKEN 8 / FUNCTIONAL 1 / UX 1 / POLISH 1)
- Steps passed: 9/16
- Screenshots written under e2e-out/screenshots/persona-3-*
- Fixture image: tests/fixtures/sample-listing.jpg
