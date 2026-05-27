#!/usr/bin/env bash
# ISTBAKU — Otomatik QA Runner
# Tüm route + API endpoint + sınır vakaları test eder.

set -u
BASE="${BASE:-http://localhost:3000}"
PASS=0
FAIL=0
FAILED_TESTS=()

check() {
  local name="$1"; local actual="$2"; local expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    PASS=$((PASS+1))
    printf "  ✓ %-55s [%s]\n" "$name" "$actual"
  else
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("$name (got: $actual, expected: $expected)")
    printf "  ✗ %-55s [%s ≠ %s]\n" "$name" "$actual" "$expected"
  fi
}

status() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$1"
}

post_json() {
  curl -s -X POST -H 'Content-Type: application/json' -d "$2" --max-time 30 "$1"
}

post_status() {
  curl -s -o /dev/null -X POST -H 'Content-Type: application/json' -d "$2" -w '%{http_code}' --max-time 30 "$1"
}

contains() {
  echo "$1" | grep -q "$2" && echo "yes" || echo "no"
}

echo "==============================================="
echo " ISTBAKU QA Runner — $(date)"
echo " Base: $BASE"
echo "==============================================="

# ============================================================
# 1. ROUTES (HTTP 200)
# ============================================================
echo ""
echo "[1] Route HTTP status:"

echo "[1a] Public routes (200):"
for r in \
  "/" \
  "/listings" \
  "/listings?q=Bakı" \
  "/listings?country=AZ" \
  "/listings?country=TR&approved=1" \
  "/listings?q=besiktas&type=luks_konut" \
  "/property/besiktas-bogaz-manzarali-luks-konut" \
  "/property/sebail-deniz-manzarali-penthouse" \
  "/property/konyaalti-deniz-manzarali-villa" \
  "/property/kadikoy-moda-yatirimlik-2-1" \
  "/property/narimanov-merkezi-3-1" \
  "/property/bodrum-yalikavak-villa" \
  "/property/cankaya-residence-1-1" \
  "/property/yasamal-yeni-bina-2-1" \
  "/property/basaksehir-aile-konut-3-1" \
  "/property/nesimi-merkez-ofis" \
  "/property/sariyer-tarabya-arsa" \
  "/property/xetai-proje-yeni" \
  "/ai-match" \
  "/private-portfolio" \
  "/reports" \
  "/legal-guide" \
  "/auth/sign-in" \
  "/auth/sign-up" \
  "/admin/login" \
  "/agent" \
  "/compare" \
; do
  s=$(status "$BASE$r")
  check "$r" "$s" "200"
done

echo ""
echo "[1b] Auth-gated routes (anonim erişimde 307 redirect):"
for r in \
  "/dashboard" \
  "/dashboard?tab=overview" \
  "/dashboard?tab=listings" \
  "/dashboard?tab=favorites" \
  "/dashboard?tab=compare" \
  "/dashboard?tab=matches" \
  "/dashboard?tab=searches" \
  "/dashboard?tab=notifications" \
  "/dashboard?tab=invalid_tab" \
  "/new-listing" \
  "/property/besiktas-bogaz-manzarali-luks-konut/edit" \
  "/admin" \
  "/admin/approvals" \
  "/admin/users" \
  "/admin/agents" \
  "/admin/kyc" \
  "/admin/reports" \
  "/admin/payments" \
  "/admin/analytics" \
  "/admin/audit" \
  "/admin/country-guides" \
; do
  s=$(status "$BASE$r")
  check "$r" "$s" "307"
done

# 404
check "/nonexistent-route"    "$(status $BASE/nonexistent-page-xyz)" "404"
check "/property/invalid-slug" "$(status $BASE/property/this-does-not-exist)" "404"
check "/property/x/edit (gated → /auth)" "$(status $BASE/property/x-not-real/edit)" "307"

# ============================================================
# 2. API CONTRACT - /api/ai/match
# ============================================================
echo ""
echo "[2] POST /api/ai/match contract:"

check "empty body"          "$(post_status $BASE/api/ai/match '{}')" "200"
check "valid full body"     "$(post_status $BASE/api/ai/match '{"goals":["yatirim","kira"],"countries":["TR","AZ"],"maxBudgetUSD":500000,"horizonYears":5,"maxResults":3}')" "200"
check "single country TR"   "$(post_status $BASE/api/ai/match '{"countries":["TR"]}')" "200"
check "single country AZ"   "$(post_status $BASE/api/ai/match '{"countries":["AZ"]}')" "200"
check "budget=0"            "$(post_status $BASE/api/ai/match '{"maxBudgetUSD":0}')" "200"
check "huge budget"         "$(post_status $BASE/api/ai/match '{"maxBudgetUSD":999999999}')" "200"
check "horizon=0"           "$(post_status $BASE/api/ai/match '{"horizonYears":0}')" "200"
check "horizon=100"         "$(post_status $BASE/api/ai/match '{"horizonYears":100}')" "200"
check "maxResults=1"        "$(post_status $BASE/api/ai/match '{"maxResults":1}')" "200"
check "maxResults=999"      "$(post_status $BASE/api/ai/match '{"maxResults":999}')" "200"
check "empty goals []"      "$(post_status $BASE/api/ai/match '{"goals":[]}')" "200"
check "all 4 goals"         "$(post_status $BASE/api/ai/match '{"goals":["oturum","kira","yazlik","yatirim"]}')" "200"
check "invalid JSON"        "$(post_status $BASE/api/ai/match 'not-json{{{')" "200"
check "no body"             "$(post_status $BASE/api/ai/match '')" "200"

# match: returns at most N
R=$(post_json $BASE/api/ai/match '{"maxResults":1}')
count=$(echo "$R" | node -e 'let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{try{console.log(JSON.parse(s).results.length)}catch{console.log("?")}})' 2>/dev/null || echo "?")
check "maxResults=1 returns 1" "$count" "1"

R=$(post_json $BASE/api/ai/match '{"maxResults":5}')
count=$(echo "$R" | node -e 'let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{try{console.log(JSON.parse(s).results.length)}catch{console.log("?")}})' 2>/dev/null || echo "?")
check "maxResults=5 returns 5" "$count" "5"

R=$(post_json $BASE/api/ai/match '{"maxResults":100}')
count=$(echo "$R" | node -e 'let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{try{console.log(JSON.parse(s).results.length)}catch{console.log("?")}})' 2>/dev/null || echo "?")
check "maxResults=100 (public count check)" "$count" "12"

# budget cap behavior
R=$(post_json $BASE/api/ai/match '{"maxBudgetUSD":200000,"maxResults":3}')
over=$(echo "$R" | grep -o '"propertyId":"p2"' | wc -l | tr -d ' ')
check "budget cap excludes p2 (1.25M)" "$over" "0"

# ============================================================
# 3. API CONTRACT - /api/ai/describe
# ============================================================
echo ""
echo "[3] POST /api/ai/describe contract:"
check "empty body"     "$(post_status $BASE/api/ai/describe '{}')" "200"
check "valid text"     "$(post_status $BASE/api/ai/describe '{"text":"bakı sebail premium daire"}')" "200"
check "empty text"     "$(post_status $BASE/api/ai/describe '{"text":""}')" "200"
LONG_TEXT=$(node -e 'process.stdout.write(JSON.stringify({text:"a ".repeat(500)}))')
check "very long text" "$(post_status $BASE/api/ai/describe "$LONG_TEXT")" "200"
check "unicode"        "$(post_status $BASE/api/ai/describe '{"text":"Bakü deniz manzaralı 🏠 lüks ev"}')" "200"
check "XSS attempt"    "$(post_status $BASE/api/ai/describe '{"text":"<script>alert(1)</script>"}')" "200"

# ============================================================
# 5. API CONTRACT - /api/ai/explain
# ============================================================
echo ""
echo "[5] POST /api/ai/explain contract:"
check "valid slug besiktas"  "$(post_status $BASE/api/ai/explain '{"propertyId":"besiktas-bogaz-manzarali-luks-konut"}')" "200"
check "valid slug sebail"    "$(post_status $BASE/api/ai/explain '{"propertyId":"sebail-deniz-manzarali-penthouse"}')" "200"
check "invalid slug"         "$(post_status $BASE/api/ai/explain '{"propertyId":"xxx-not-exists"}')" "404"
check "missing id"           "$(post_status $BASE/api/ai/explain '{}')" "404"
check "invalid json body"    "$(post_status $BASE/api/ai/explain 'not-json{{{')" "400"

# ============================================================
# 6. API CONTRACT - /api/country-guide
# ============================================================
echo ""
echo "[6] GET /api/country-guide:"
check "TR"        "$(status "$BASE/api/country-guide?iso=TR")"  "200"
check "AZ"        "$(status "$BASE/api/country-guide?iso=AZ")"  "200"
check "no iso"    "$(status "$BASE/api/country-guide")"          "200"
check "unknown"   "$(status "$BASE/api/country-guide?iso=ZZ")"   "200"
check "XSS iso"   "$(status "$BASE/api/country-guide?iso=%3Cscript%3E")" "200"

# ============================================================
# 7. HTML İçerik testleri
# ============================================================
echo ""
echo "[7] HTML content checks:"

H=$(curl -s "$BASE/")
check "/  contains 'yatırım kararı'"        "$(contains "$H" "yatırım kararı")" "yes"
check "/  contains 'ISTBAKU'"               "$(contains "$H" "ISTBAKU")" "yes"
check "/  contains chatbot FAB"             "$(contains "$H" "AI Asistan")" "yes"
check "/  contains currency converter"      "$(contains "$H" "Canlı Kur")" "yes"
check "/  contains country guides"          "$(contains "$H" "Ev Alım Rehberi")" "yes"
check "/  contains nav 'İlanlar'"           "$(contains "$H" '>İlanlar<')" "yes"

H=$(curl -s "$BASE/property/besiktas-bogaz-manzarali-luks-konut")
check "property  TR labels (Kat Mülkiyeti)" "$(contains "$H" "Kat Mülkiyeti")" "yes"
check "property  Emlakçı label"             "$(contains "$H" "Emlakçı")" "yes"
check "property  Kapalı Otopark"            "$(contains "$H" "Kapalı Otopark")" "yes"
check "property  contains AI Score"         "$(contains "$H" "AI Yatırım Skoru")" "yes"
check "property  contains agent card"       "$(contains "$H" "Mehmet Yılmaz")" "yes"
check "property  contains Hızlı kredi"      "$(contains "$H" "Hızlı kredi")" "yes"
check "property  contains POI metro"        "$(contains "$H" "Metro")" "yes"
check "property  contains bölge profili"    "$(contains "$H" "Bölgede Yaşayan")" "yes"
check "property  contains Gezinti Randevu"  "$(contains "$H" "Gezinti Randevusu")" "yes"
check "property  /10 score format"          "$(contains "$H" "/ 10")" "yes"

H=$(curl -s "$BASE/admin/login")
check "admin/login  chatbot HIDDEN"         "$(contains "$H" "AI Asistan")" "no"
# Meta description leak ediyor 'İlanları' kelimesini — body içinde nav arıyoruz
check "admin/login  no body nav 'İlanlar<'" "$(contains "$H" '>İlanlar<')" "no"
check "admin/login  has credentials hint"   "$(contains "$H" "Admin2026")" "yes"

H=$(curl -s "$BASE/listings?q=test_nothing_returns")
check "/listings empty  shows EmptyState"   "$(contains "$H" "Sonuç yok")" "yes"

H=$(curl -s "$BASE/auth/sign-up")
# Picker default-collapse; varsayılan dial +90 görünür
check "sign-up  has dial +90 default"       "$(contains "$H" "+90")" "yes"
check "sign-up  has email field"            "$(contains "$H" "type=\"email\"")" "yes"
check "sign-up  has phone field"            "$(contains "$H" "type=\"tel\"")" "yes"

# ============================================================
# 8. URL parametre sınır vakaları
# ============================================================
echo ""
echo "[8] URL parameter edge cases:"
LONG_Q=$(node -e 'process.stdout.write("a".repeat(5000))')
check "?q very long"        "$(status "$BASE/listings?q=$LONG_Q")" "200"
check "?q with emoji"       "$(status "$BASE/listings?q=%F0%9F%8F%A0+ev")" "200"
check "?q with XSS"         "$(status "$BASE/listings?q=%3Cscript%3Ealert(1)%3C/script%3E")" "200"
check "?country=ZZ"         "$(status "$BASE/listings?country=ZZ")" "200"
check "?approved=banana"    "$(status "$BASE/listings?approved=banana")" "200"
check "?tab=hack (auth gate)" "$(status "$BASE/dashboard?tab=<script>")" "307"

# ============================================================
# 9. Çoklu method check
# ============================================================
echo ""
echo "[9] HTTP method handling:"
check "GET /api/ai/match"   "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/ai/match")" "405"
check "DELETE /api/ai/match" "$(curl -s -o /dev/null -X DELETE -w '%{http_code}' "$BASE/api/ai/match")" "405"
check "POST /api/country-guide" "$(curl -s -o /dev/null -X POST -d '{}' -w '%{http_code}' "$BASE/api/country-guide")" "405"

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "==============================================="
echo " RESULTS: $PASS passed · $FAIL failed"
echo "==============================================="
if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "FAILED TESTS:"
  for t in "${FAILED_TESTS[@]}"; do echo "  • $t"; done
  exit 1
fi
exit 0
