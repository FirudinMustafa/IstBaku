# Persona 1 — Ayşe Report
**Date:** 2026-05-17
**Browser:** Chromium desktop
**Total scenarios run:** 12
**Passed:** 5
**Failed:** 7

## 🔴 BROKEN
### #B001 — step5-open-first-listing
**URL:** http://localhost:3000/listings?q=Be%C5%9Fikta%C5%9F+2%2B1
**Action:** step5-open-first-listing
**Expected:** Step succeeds without error
**Actual:** Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed
**Screenshot:** e2e-out/screenshots/persona-1-step5-open-first-listing-FAIL.png

### #B002 — step6-gallery
**URL:** http://localhost:3000/listings?q=Be%C5%9Fikta%C5%9F+2%2B1
**Action:** step6-gallery
**Expected:** Step succeeds without error
**Actual:** Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed
**Screenshot:** e2e-out/screenshots/persona-1-step6-gallery-FAIL.png

### #B003 — step7-ai-score
**URL:** http://localhost:3000/listings?q=Be%C5%9Fikta%C5%9F+2%2B1
**Action:** step7-ai-score
**Expected:** Step succeeds without error
**Actual:** Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed
**Screenshot:** e2e-out/screenshots/persona-1-step7-ai-score-FAIL.png

### #B004 — step8-mortgage
**URL:** http://localhost:3000/listings?q=Be%C5%9Fikta%C5%9F+2%2B1
**Action:** step8-mortgage
**Expected:** Step succeeds without error
**Actual:** Error: locator.scrollIntoViewIfNeeded: Timeout 10000ms exceeded.
**Screenshot:** e2e-out/screenshots/persona-1-step8-mortgage-FAIL.png

### #B005 — step9-favorite-anon
**URL:** http://localhost:3000/listings?q=Be%C5%9Fikta%C5%9F+2%2B1
**Action:** step9-favorite-anon
**Expected:** Step succeeds without error
**Actual:** Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed
**Screenshot:** e2e-out/screenshots/persona-1-step9-favorite-anon-FAIL.png

### #B006 — step10-signup
**URL:** http://localhost:3000/auth/sign-up
**Action:** step10-signup
**Expected:** Step succeeds without error
**Actual:** Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed
**Screenshot:** e2e-out/screenshots/persona-1-step10-signup-FAIL.png

### #B007 — Sign-up did not reach verify step
**URL:** http://localhost:3000/auth/sign-up
**Action:** Submit sign-up form for ayse-1779302265343@istbaku-test.example
**Expected:** 6-digit code prompt (verify step) renders
**Actual:** Verify input not visible. Alert text: ""
**Suspected cause:** lib/auth-actions.ts → signUpAction; lib/schemas.ts → signUpSchema (phone format with leading space?)
**Suggested fix:** Check signUpAction logs in dev server; verify Drizzle migrations ran; confirm phone schema accepts "5551112233"
**Screenshot:** e2e-out/screenshots/persona-1-step11-no-verify.png

## 🟠 FUNCTIONAL
### #F001 — Filter for 2+1 Beşiktaş Konut <250k USD returned 0 results
**URL:** http://localhost:3000/listings?q=Be%C5%9Fikta%C5%9F+2%2B1&country=TR
**Action:** Apply sidebar filters: TR / İstanbul / Beşiktaş / Konut / 0–250000 USD / 2+1
**Expected:** At least one matching listing
**Actual:** Counter says "0 sonuç · 5 aktif filtre"
**Suspected cause:** Seeded dataset may not contain matching properties at this price; or USD vs TL price-axis mismatch with persona budget
**Suggested fix:** Verify seed data in lib/data/* — ensure Beşiktaş 2+1 fixtures under 250k USD exist

## 🟡 UX
_None._

## 🟢 POLISH
### #P001 — Console/page/network noise during run
**URL:** http://localhost:3000/auth/sign-in?next=%2Fmessages
**Action:** End-of-test diagnostic dump
**Expected:** 0 console errors, 0 page errors, 0 5xx responses
**Actual:** console=2 pageerr=0 net5xx=0
**Console:** A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

%s%s https://react.dev/link/hydration-mismatch 

  ...
    <ErrorBoundary errorComponent={undefined} errorStyles={undefined} errorScripts={undefined}>
      <LoadingBoundary loading={null}>
        <HTTPAccessFallbackBoundary notFound={undefined} forbidden={undefined} unauthorized={undefined}>
          <RedirectBoundary>
            <RedirectErrorBoundary router={{...}}>
              <InnerLayoutRouter parallelRouterKey="children" url="/auth/sign-up" tree={[...]} childNodes={Map} ...>
                <SignUpPage>
                  <div className="relative m...">
                    <div>
                    <Card>
                      <div className="bg-[color:...">
                        <CardBody>
                          <div className="p-6 md:p-8">
                            <div>
                            <SignUpForm>
                              <form onSubmit={function submit} noValidate={true} className="mt-6 space...">
                                <div className="relative">
                                  <User>
                                  <Input id="signup-name" label="Ad Soyad" className="pl-9" value="" ...>
                                    <Field id="signup-name" label="Ad Soyad" error={undefined} hint={undefined} ...>
                                      <div className={undefined}>
                                        <label>
                                        <input
                                          ref={null}
                                          id="signup-name"
                                          required={true}
                                          aria-invalid={undefined}
                                          aria-describedby={undefined}
                                          className="h-10 px-3.5 w-full rounded-xl bg-[color:var(--bg-elev)] border bo..."
                                          value=""
                                          onChange={function onChange}
                                          placeholder="Firudin Mustafayev"
                                          autoComplete="name"
-                                         style={{caret-color:"transparent"}}
                                        >
                                <div>
                                <div>
                                  <Label>
                                  <div ref={{current:null}} className="flex gap-2...">
                                    <button>
                                    <div className="relative f...">
                                      <Phone>
                                      <Input id="signup-phone" type="tel" className="pl-9" value="" ...>
                                        <input
                                          ref={null}
                                          id="signup-phone"
                                          required={undefined}
                                          aria-invalid={undefined}
                                          aria-describedby={undefined}
                                          className="h-10 px-3.5 w-full rounded-xl bg-[color:var(--bg-elev)] border bo..."
                                          type="tel"
                                          value=""
                                          onChange={function onChange}
                                          placeholder="555 010 1010"
                                          inputMode="numeric"
                                          autoComplete="tel-national"
-                                         style={{caret-color:"transparent"}}
                                        >
                                  ...
                                <div>
                                <div>
                                <div>
                                  <label htmlFor="terms" className="flex items...">
                                    <input
                                      id="terms"
                                      data-testid="terms-accept"
                                      type="checkbox"
                                      name="acceptedTerms"
                                      checked={false}
                                      onChange={function onChange}
                                      className="mt-0.5 size-5 accent-gold-400 cursor-pointer shrink-0"
                                      aria-invalid={undefined}
                                      aria-label="Kullanım şartlarını ve KVKK aydınlatma metnini kabul ediyorum"
-                                     style={{caret-color:"transparent"}}
                                    >
                                    ...
                                ...
                ...
 | Failed to fetch RSC payload for http://localhost:3000/auth/sign-up. Falling back to browser navigation. TypeError: network error


## ✅ PASSED
- step1-homepage-load
- step2-hero-search
- step3-sidebar-filters
- step4-map-toggle
- step11-verify-screen
- step12-messages-anon

## 📊 STATISTICS
- Findings: 9 (BROKEN 7 / FUNCTIONAL 1 / UX 0 / POLISH 1)
- Steps passed: 6/12
- Screenshots written under e2e-out/screenshots/persona-1-*
