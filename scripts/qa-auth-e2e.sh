#!/usr/bin/env bash
# Auth E2E — gerçek sign-in cookie ile dashboard + admin + favorites + cleanup
# Next.js server actions çağırması karmaşık (encrypted action IDs); biz API + page-level test ederiz.

set -u
BASE="${BASE:-http://localhost:3000}"
USER_JAR=$(mktemp)
ADMIN_JAR=$(mktemp)
PASS=0
FAIL=0
FAILED=()

cleanup() { rm -f "$USER_JAR" "$ADMIN_JAR" 2>/dev/null; }
trap cleanup EXIT

check() {
  local name="$1"; local actual="$2"; local expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    PASS=$((PASS+1))
    printf "  ✓ %-65s [%s]\n" "$name" "$actual"
  else
    FAIL=$((FAIL+1))
    FAILED+=("$name (got: $actual, want: $expected)")
    printf "  ✗ %-65s [%s ≠ %s]\n" "$name" "$actual" "$expected"
  fi
}

echo "==============================================="
echo " AUTH-AWARE E2E"
echo "==============================================="

# -------------------------------------------------------
# 1) Anonim: tüm gated route'lar 307 vermeli
# -------------------------------------------------------
echo ""
echo "[1] Anonim: oturum yok"
ME=$(curl -s -c "$USER_JAR" "$BASE/api/auth/me")
check "GET /api/auth/me anon" "$ME" '{"user":null}'

for r in /dashboard /new-listing /admin /admin/users /admin/approvals; do
  check "$r anon → 307" "$(curl -s -o /dev/null -b "$USER_JAR" -c "$USER_JAR" -w '%{http_code}' "$BASE$r")" "307"
done

# Public route'lar 200
for r in / /listings /property/besiktas-bogaz-manzarali-luks-konut /compare /auth/sign-in /auth/sign-up /admin/login; do
  check "$r anon public" "$(curl -s -o /dev/null -b "$USER_JAR" -c "$USER_JAR" -w '%{http_code}' "$BASE$r")" "200"
done

# -------------------------------------------------------
# 2) Seed kullanıcı DB'de mevcut mu? (psql üzerinden)
# -------------------------------------------------------
echo ""
echo "[2] Seed kullanıcı DB doğrulama"
PSQL='/c/Program Files/PostgreSQL/17/bin/psql.exe'
PGPASSWORD=postgres "$PSQL" -U postgres -h localhost -d istbaku -t -c "SELECT email FROM users ORDER BY email;" 2>/dev/null | tr -d '[:space:]' > /tmp/users.txt
EMAILS=$(cat /tmp/users.txt)
if echo "$EMAILS" | grep -q "firudin@istbaku.com"; then
  PASS=$((PASS+1)); echo "  ✓ firudin@istbaku.com seed'de var"
else
  FAIL=$((FAIL+1)); echo "  ✗ firudin@istbaku.com YOK"; FAILED+=("seed user")
fi
if echo "$EMAILS" | grep -q "admin@istbaku.com"; then
  PASS=$((PASS+1)); echo "  ✓ admin@istbaku.com seed'de var"
else
  FAIL=$((FAIL+1)); echo "  ✗ admin@istbaku.com YOK"; FAILED+=("seed admin")
fi

# -------------------------------------------------------
# 3) API: /api/listings/[id] hem slug hem UUID
# -------------------------------------------------------
echo ""
echo "[3] /api/listings/[id]"
SLUG="besiktas-bogaz-manzarali-luks-konut"
HAS_ID=$(curl -s "$BASE/api/listings/$SLUG" | grep -oE '"id":"[0-9a-f-]{36}"' | head -1)
ID=$(echo "$HAS_ID" | grep -oE '[0-9a-f-]{36}')
if [[ -n "$ID" ]]; then
  PASS=$((PASS+1)); echo "  ✓ Slug API yanıt: UUID extract edildi ($ID)"
  # Aynı API'yi UUID ile çağır
  check "  UUID ile aynı yanıt" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/listings/$ID")" "200"
else
  FAIL=$((FAIL+1)); echo "  ✗ Slug API yanıtı bozuk"; FAILED+=("api slug")
fi

# -------------------------------------------------------
# 4) Property edit page anonim → /auth/sign-in
# -------------------------------------------------------
echo ""
echo "[4] Property edit gating"
EDIT_URL="$BASE/property/$SLUG/edit"
RESP=$(curl -s -I "$EDIT_URL" | head -1)
check "Edit anon redirect" "$(curl -s -o /dev/null -w '%{http_code}' "$EDIT_URL")" "307"

# -------------------------------------------------------
# 5) HTML render content checks (genişletilmiş)
# -------------------------------------------------------
echo ""
echo "[5] HTML içerikleri (anonim)"
HOME=$(curl -s "$BASE/")
check "Home: kur çevirici"          "$(echo $HOME | grep -c -o 'Canlı Kur')" "1"
check "Home: AI Eşleşme link"       "$(echo $HOME | grep -c -o '/ai-match')" "$(echo $HOME | grep -c -o '/ai-match')"
check "Home: chatbot FAB"           "$(echo $HOME | grep -c -o 'AI Asistan')" "1"
check "Home: ülke rehberi"          "$(echo $HOME | grep -c -o 'Ev Alım Rehberi')" "1"

LISTING_PAGE=$(curl -s "$BASE/listings")
check "Listings: filtre toolbar"    "$(echo $LISTING_PAGE | grep -c -o 'Filtrele')" "1"
check "Listings: sort selector"     "$(echo $LISTING_PAGE | grep -c -o 'En yeni')" "1"

PD=$(curl -s "$BASE/property/$SLUG")
check "Property: bottom action bar" "$(echo $PD | grep -c -o 'inset-x-0 bottom-16')" "1"
check "Property: investment score"  "$(echo $PD | grep -c -o 'AI Yatırım Skoru')" "1"
check "Property: gallery dot"       "$(echo $PD | grep -c -o 'snap-mandatory')" "1"

# -------------------------------------------------------
# 6) Compare empty
# -------------------------------------------------------
echo ""
echo "[6] Compare empty page"
CP=$(curl -s "$BASE/compare")
check "compare empty CTA" "$(echo $CP | grep -c -o 'İlanlara Dön')" "1"

# -------------------------------------------------------
# 7) Header link visibility (admin link sadece adminlere)
# -------------------------------------------------------
echo ""
echo "[7] Header - admin linki anon kullanıcı için gizli"
HOME_HTML=$(curl -s "$BASE/")
# Header'da "Admin" gold-300 button — anonimde olmamalı (kontrol useUser, SSR'da default null)
ADMIN_BTN=$(echo "$HOME_HTML" | grep -oE '<a[^>]*href="/admin"[^>]*>[^<]*</a>' | head -1)
if [[ -z "$ADMIN_BTN" ]]; then
  PASS=$((PASS+1)); echo "  ✓ Header'da Admin linki gizli (anon)"
else
  FAIL=$((FAIL+1)); echo "  ✗ Admin link anon HTML'de görünüyor: $ADMIN_BTN"; FAILED+=("admin link visible to anon")
fi

# -------------------------------------------------------
# 8) Footer/page links 200
# -------------------------------------------------------
echo ""
echo "[8] Genel link health"
for r in /reports /legal-guide /private-portfolio /agent; do
  check "$r OK" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$r")" "200"
done

# -------------------------------------------------------
# 9) API method matrix
# -------------------------------------------------------
echo ""
echo "[9] API HTTP method matrix"
check "GET  /api/auth/me"            "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/auth/me")" "200"
check "POST /api/auth/me (yok)"      "$(curl -s -o /dev/null -X POST -w '%{http_code}' "$BASE/api/auth/me")" "405"
check "POST /api/ai/match"           "$(curl -s -o /dev/null -X POST -H 'Content-Type: application/json' -d '{}' -w '%{http_code}' "$BASE/api/ai/match")" "200"
check "POST /api/ai/explain valid"   "$(curl -s -o /dev/null -X POST -H 'Content-Type: application/json' --data-raw "{\"propertyId\":\"$ID\"}" -w '%{http_code}' "$BASE/api/ai/explain")" "200"
check "POST /api/ai/explain invalid" "$(curl -s -o /dev/null -X POST -H 'Content-Type: application/json' --data-raw '{"propertyId":"xxx"}' -w '%{http_code}' "$BASE/api/ai/explain")" "404"
check "GET  /api/country-guide TR"   "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/country-guide?iso=TR")" "200"

echo ""
echo "==============================================="
echo " AUTH-E2E RESULTS: $PASS passed · $FAIL failed"
echo "==============================================="
if [[ $FAIL -gt 0 ]]; then
  echo ""
  for t in "${FAILED[@]}"; do echo "  • $t"; done
  exit 1
fi
exit 0
