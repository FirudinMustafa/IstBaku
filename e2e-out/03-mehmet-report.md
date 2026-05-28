# Persona 3 — Mehmet Report
**Date:** 2026-05-17
**Browser:** Chromium desktop
**Total scenarios run:** 16
**Passed:** 9
**Failed:** 7

## 🔴 BROKEN
### #B001 — step6-wizard-detay
**URL:** http://localhost:3000/new-listing
**Action:** step6-wizard-detay
**Expected:** Step succeeds without error
**Actual:** Error: locator.selectOption: Timeout 10000ms exceeded.
**Screenshot:** e2e-out/screenshots/persona-3-step6-wizard-detay-FAIL.png

### #B002 — step7-wizard-medya-single
**URL:** http://localhost:3000/new-listing
**Action:** step7-wizard-medya-single
**Expected:** Step succeeds without error
**Actual:** Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoHaveCount[2m([22m[32mexpected[39m[2m)[22m failed
**Screenshot:** e2e-out/screenshots/persona-3-step7-wizard-medya-single-FAIL.png

### #B003 — step8-wizard-kapak
**URL:** http://localhost:3000/new-listing
**Action:** step8-wizard-kapak
**Expected:** Step succeeds without error
**Actual:** Error: locator.click: Timeout 10000ms exceeded.
**Screenshot:** e2e-out/screenshots/persona-3-step8-wizard-kapak-FAIL.png

### #B004 — step9-wizard-bolge
**URL:** http://localhost:3000/new-listing
**Action:** step9-wizard-bolge
**Expected:** Step succeeds without error
**Actual:** Error: expected 4 sliders, got 0
**Screenshot:** e2e-out/screenshots/persona-3-step9-wizard-bolge-FAIL.png

### #B005 — step10-wizard-tier-premium
**URL:** http://localhost:3000/new-listing
**Action:** step10-wizard-tier-premium
**Expected:** Step succeeds without error
**Actual:** Error: locator.click: Timeout 10000ms exceeded.
**Screenshot:** e2e-out/screenshots/persona-3-step10-wizard-tier-premium-FAIL.png

### #B006 — step11-wizard-publish-standart
**URL:** http://localhost:3000/new-listing
**Action:** step11-wizard-publish-standart
**Expected:** Step succeeds without error
**Actual:** Error: locator.click: Timeout 10000ms exceeded.
**Screenshot:** e2e-out/screenshots/persona-3-step11-wizard-publish-standart-FAIL.png

### #B007 — step13-validation-short-desc
**URL:** http://localhost:3000/new-listing
**Action:** step13-validation-short-desc
**Expected:** Step succeeds without error
**Actual:** Error: locator.fill: Timeout 10000ms exceeded.
**Screenshot:** e2e-out/screenshots/persona-3-step13-validation-short-desc-FAIL.png

## 🟠 FUNCTIONAL
### #F001 — Sign-up did not reach verify step
**URL:** http://localhost:3000/auth/sign-up
**Action:** Submit sign-up for mehmet-agent-1779972068949@istbaku-test.example
**Expected:** 6-digit code prompt
**Actual:** verify input missing; alert=""

### #F002 — Konum step let user proceed without lat/lng
**URL:** http://localhost:3000/new-listing
**Action:** Click İleri on Konum step without dropping a pin
**Expected:** Toast "Konumu işaretle" and stay on step
**Actual:** No toast surfaced

### #F003 — Dashboard İlanlarım empty after publish
**URL:** http://localhost:3000/dashboard?tab=listings
**Action:** Visit /dashboard?tab=listings after publishing
**Expected:** At least one listing row
**Actual:** "Henüz ilanın yok" or empty grid
**Suspected cause:** createListingAction did not associate listing with current user

## 🟡 UX
### #U001 — Could not reach Medya step in validation flow
**URL:** http://localhost:3000/new-listing
**Action:** Advance from Detay to Medya with abc description
**Expected:** Either a description-length toast OR proceed to Medya
**Actual:** Stuck on Detay step

### #U002 — No Düzenle link reachable from dashboard
**URL:** http://localhost:3000/dashboard?tab=listings
**Action:** Look for /property/*/edit anchor on /dashboard?tab=listings
**Expected:** At least one editable listing
**Actual:** No edit anchor present

## 🟢 POLISH
_None._


## ✅ PASSED
- step0-warmup
- step1-signup-form
- step2-seeded-sign-in
- step3-open-wizard
- step4-wizard-tur
- step5-wizard-konum
- step12-validation-empty-step1
- step14-validation-no-photos
- step15-dashboard-listings
- step16-edit-listing

## 📊 STATISTICS
- Findings: 12 (BROKEN 7 / FUNCTIONAL 3 / UX 2 / POLISH 0)
- Steps passed: 10/16
- Screenshots written under e2e-out/screenshots/persona-3-*
- Fixture image: tests/fixtures/sample-listing.jpg
