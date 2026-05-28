# PERSONA 8 — PAULA (German foreign buyer · EN · EUR)

Generated: 2026-05-28T12:44:10.145Z

## Summary

- PASS: 3
- PARTIAL: 4
- FAIL: 2
- INFO: 0

## Scenarios

### S1 — Language switch to EN

Status: **PASS**

- Language switcher trigger clicked successfully.
- Visible English strings found (out of 10): 7 → [Listings, Sign in, Reports, Legal, AI Match, Private, Search]
- i18n key leaks on home (sample, max 10): none
- Console errors: 1

### S2 — Currency to EUR

Status: **PARTIAL**

- Global currency switcher detected: true
- Listing page currencies visible — EUR: false, USD: true, TRY: false, AZN: false
- FUNCTIONAL GAP: No EUR-priced listings visible on /listings landing.

### S3 — Filters Antalya/villa/3+1/pool/300-800k

Status: **PASS**

- Clicked Türkiye country chip.
- Selected Antalya in city select.
- Clicked Villa property-type chip.
- 3+1 room chip not found.
- Pool feature chip not found.
- Listing card count after filters: 8

### S4 — EN string sweep + untranslated keys

Status: **PARTIAL**

- /listings: TR strings still visible after EN switch (FUNCTIONAL GAP): []
- /listings: i18n key leaks (sample): []
- property detail: TR strings still visible: [Sahibinden, Boş]
- property detail: i18n key leaks (sample): []

### S5 — /legal-guide foreign buyer + PDF

Status: **PARTIAL**

- FUNCTIONAL GAP: /legal-guide is fully hardcoded Turkish: [Hukuki Rehber]
- Selected nationality=OTHER (foreign buyer).
- Selected target=TR.
- "Foreign buyer" related text on page: found.
- PDF links on page: 0
- FUNCTIONAL GAP: No PDF/downloadable legal references found in /legal-guide.

### S6 — /reports Antalya market trends

Status: **FAIL**

- Antalya mentioned on /reports: false
- "Market trends"-like phrase visible: false
- FUNCTIONAL GAP: No "Antalya market trends" entry detected on /reports.

### S7 — Chatbot EN response

Status: **PASS**

- Question sent: "Can foreigners buy property in Turkey?"
- Response time: 1089 ms
- Assistant reply (first 200 chars): Foreigners can buy property in Turkey. It is allowed in almost every province except a few military / restricted zones. Minimum requirements: passport, tax number, DASK earthquake insurance, and a Tur

### S8 — Agent message modal EN

Status: **FAIL**

- Buttons attempted: 0, message modal opened: false
- FUNCTIONAL GAP: could not open agent message modal from property detail.

### S9 — Currency switch loop

Status: **PARTIAL**

- Global currency switcher present: true
- After TRY: sample = "$600.000"
- After USD: sample = "$600.000"
- Currency option AZN not found in switcher.
- Currency option EUR not found in switcher.
- FUNCTIONAL GAP: price text did not change across currency switches.

## i18n Key Leaks Detected

_None detected via heuristic pattern match._

## Screenshots

- e2e-out/screenshots/persona-8-01-home-before-lang.png
- e2e-out/screenshots/persona-8-01-home-after-lang-en.png
- e2e-out/screenshots/persona-8-02-listings-card-currency.png
- e2e-out/screenshots/persona-8-03-listings-filters-applied.png
- e2e-out/screenshots/persona-8-04a-listings-en-sweep.png
- e2e-out/screenshots/persona-8-04b-property-detail-en.png
- e2e-out/screenshots/persona-8-05-legal-guide-en.png
- e2e-out/screenshots/persona-8-05-legal-guide-foreign-tr.png
- e2e-out/screenshots/persona-8-06-reports-en.png
- e2e-out/screenshots/persona-8-07-chatbot-opened.png
- e2e-out/screenshots/persona-8-07-chatbot-response.png
- e2e-out/screenshots/persona-8-09-currency-try.png
- e2e-out/screenshots/persona-8-09-currency-usd.png
