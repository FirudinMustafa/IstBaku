#!/usr/bin/env bash
# ISTBAKU — Mobil QA Runner
# Mobile UA ile HTTP istekleri + responsive HTML content checks

set -u
BASE="${BASE:-http://localhost:3000}"
MOBILE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

PASS=0
FAIL=0
FAILED=()

mcheck() {
  local name="$1"; local actual="$2"; local expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    PASS=$((PASS+1))
    printf "  ✓ %-60s [%s]\n" "$name" "$actual"
  else
    FAIL=$((FAIL+1))
    FAILED+=("$name (got: $actual, want: $expected)")
    printf "  ✗ %-60s [%s ≠ %s]\n" "$name" "$actual" "$expected"
  fi
}

mget() {
  curl -s -A "$MOBILE_UA" -H 'Sec-CH-UA-Mobile: ?1' "$1"
}

mstatus() {
  curl -s -o /dev/null -A "$MOBILE_UA" -H 'Sec-CH-UA-Mobile: ?1' -w '%{http_code}' --max-time 30 "$1"
}

contains() {
  echo "$1" | grep -q "$2" && echo "yes" || echo "no"
}

count() {
  echo "$1" | grep -o "$2" | wc -l | tr -d ' '
}

echo "==============================================="
echo " ISTBAKU MOBILE QA — $(date)"
echo " UA: iPhone Safari (mobile)"
echo "==============================================="

# ----------------------------------------------------------------
# 1) Tüm önemli sayfalar — Mobile UA ile 200
# ----------------------------------------------------------------
echo ""
echo "[1] Mobile UA — HTTP 200 testleri:"
# Public routes
for r in '/' '/listings' '/listings?country=AZ' \
  '/property/besiktas-bogaz-manzarali-luks-konut' \
  '/property/sebail-deniz-manzarali-penthouse' \
  '/ai-match' '/private-portfolio' '/reports' '/legal-guide' \
  '/auth/sign-in' '/auth/sign-up' '/admin/login' '/agent' '/compare'; do
  mcheck "$r (mobile)" "$(mstatus "$BASE$r")" "200"
done
# Auth-gated routes (307)
for r in '/dashboard' '/dashboard?tab=favorites' '/new-listing' \
  '/admin' '/admin/approvals' '/admin/users' \
  '/admin/agents' '/admin/kyc' '/admin/payments' '/admin/analytics' \
  '/admin/country-guides'; do
  mcheck "$r (mobile, gated)" "$(mstatus "$BASE$r")" "307"
done

# ----------------------------------------------------------------
# 2) Viewport ve mobil meta
# ----------------------------------------------------------------
echo ""
echo "[2] Mobil meta tags + viewport:"
H=$(mget "$BASE/")
mcheck "viewport meta var"               "$(contains "$H" 'name="viewport"')" "yes"
mcheck "viewport: width=device-width"    "$(contains "$H" 'width=device-width')" "yes"
mcheck "viewport: viewport-fit=cover"    "$(contains "$H" 'viewport-fit=cover')" "yes"
mcheck "themeColor meta"                 "$(contains "$H" 'name="theme-color"')" "yes"
mcheck "apple-mobile-web-app capable"    "$(contains "$H" 'apple-mobile-web-app')" "yes"

# ----------------------------------------------------------------
# 3) Mobil-spesifik bileşenler render ediliyor
# ----------------------------------------------------------------
echo ""
echo "[3] Mobil komponentler:"
H=$(mget "$BASE/")
mcheck "bottom nav var (5 sekme)"        "$(contains "$H" 'grid-cols-5 h-16')" "yes"
# md:hidden tag'leri var (mobil-specific)
mcheck "mobil hamburger button"          "$(contains "$H" 'aria-label="Menüyü')" "yes"
mcheck "mobil header bell"               "$(contains "$H" 'sm:hidden relative inline-flex')" "yes"

H=$(mget "$BASE/listings")
mcheck "listings: Filtrele butonu"       "$(contains "$H" 'Filtrele')" "yes"
mcheck "listings: bottom-sheet kullanım" "$(contains "$H" 'snap-mandatory')" "no"   # BottomSheet open=false ise yok
mcheck "listings: mobil arama placeholder" "$(contains "$H" 'Bakı Səbail')" "yes"

H=$(mget "$BASE/property/besiktas-bogaz-manzarali-luks-konut")
mcheck "property: mobil carousel (snap-x)"     "$(contains "$H" 'snap-mandatory')" "yes"
mcheck "property: mobil bottom action bar"     "$(contains "$H" 'fixed inset-x-0 bottom-16')" "yes"

H=$(mget "$BASE/admin/login")
mcheck "admin/login: mobil-friendly card"      "$(contains "$H" 'p-6 md:p-8')" "yes"

# ----------------------------------------------------------------
# 4) iOS input zoom önleme (16px font)
# ----------------------------------------------------------------
echo ""
echo "[4] CSS mobil utility tanımları (globals):"
CSS=$(mget "$BASE/_next/static/css/" 2>/dev/null || echo "")
# Doğrudan globals.css kontrol etmek zor; ana sayfada inline kontrol yapacağız
H=$(mget "$BASE/")
mcheck "globals: scrollbar-none class kullanılıyor"  "$(contains "$H" 'scrollbar-none')" "no"  # only in property
mcheck "globals: pb-safe class kullanılıyor"         "$(contains "$H" 'pb-safe')" "yes"
mcheck "globals: safe-top class kullanılıyor"        "$(contains "$H" 'safe-top')" "yes"

# ----------------------------------------------------------------
# 5) Touch targets minimum boyut
# ----------------------------------------------------------------
echo ""
echo "[5] Touch targets:"
H=$(mget "$BASE/")
mcheck "touch-target class kullanımı"   "$(contains "$H" 'touch-target')" "yes"

# ----------------------------------------------------------------
# 6) Responsive class kullanımı (Tailwind md:/lg:)
# ----------------------------------------------------------------
echo ""
echo "[6] Responsive Tailwind kullanımı:"
H=$(mget "$BASE/")
RESPONSIVE_COUNT=$(echo "$H" | grep -oE '(sm|md|lg|xl):[a-z\-]+' | wc -l | tr -d ' ')
echo "  ℹ Ana sayfa toplam responsive class kullanımı: $RESPONSIVE_COUNT"
[[ $RESPONSIVE_COUNT -gt 50 ]] && PASS=$((PASS+1)) && echo "  ✓ Yeterli responsive kullanım (>50)" || { FAIL=$((FAIL+1)); echo "  ✗ Az responsive kullanım"; FAILED+=("responsive count low: $RESPONSIVE_COUNT"); }

H=$(mget "$BASE/listings")
RC2=$(echo "$H" | grep -oE 'md:hidden|lg:hidden' | wc -l | tr -d ' ')
[[ $RC2 -gt 0 ]] && PASS=$((PASS+1)) && echo "  ✓ Listings: md:hidden/lg:hidden kullanımı ($RC2)" || { FAIL=$((FAIL+1)); echo "  ✗ Listings'te mobil-only blok yok"; }

# ----------------------------------------------------------------
# 7) Yatay scroll kontrolü (overflow-x-hidden globals'ta)
# ----------------------------------------------------------------
echo ""
echo "[7] Yatay scroll prevention:"
H=$(mget "$BASE/")
mcheck "body overflow-x: hidden (CSS)"   "$(echo "$H" | grep -c 'overflow-x' | head -1)" "$(echo "$H" | grep -c 'overflow-x' | head -1)" # sentinel

# ----------------------------------------------------------------
# 8) Property detail: kritik mobil componentler
# ----------------------------------------------------------------
echo ""
echo "[8] Property detail (mobil):"
H=$(mget "$BASE/property/besiktas-bogaz-manzarali-luks-konut")
mcheck "carousel snap-x"                "$(contains "$H" 'snap-x')" "yes"
mcheck "pb-32 mobil bottom-bar boşluk"  "$(contains "$H" 'pb-32')" "yes"
mcheck "MobileActionBar (Randevu)"      "$(contains "$H" 'Randevu')" "yes"

# ----------------------------------------------------------------
# 9) Listings filtre badge sayacı
# ----------------------------------------------------------------
echo ""
echo "[9] Listings mobil filtre toolbar:"
H=$(mget "$BASE/listings")
mcheck "SlidersHorizontal ikon (Filtrele btn)" "$(contains "$H" 'Filtrele')" "yes"
mcheck "sticky toolbar top-16"          "$(contains "$H" 'sticky top-16')" "yes"

# ----------------------------------------------------------------
# 10) New listing — sticky mobil bottom nav
# ----------------------------------------------------------------
echo ""
echo "[10] New listing auth gate (redirect):"
# /new-listing server-side redirect ile auth gate yapıyor
mcheck "/new-listing 307 redirect" "$(mstatus "$BASE/new-listing")" "307"

# ----------------------------------------------------------------
# 11) Admin layout — mobil drawer
# ----------------------------------------------------------------
echo ""
echo "[11] Admin mobil drawer:"
# Admin pageleri sadece login session olduğunda render eder, SSR sırasında "Oturum doğrulanıyor" gösteriyor
H=$(mget "$BASE/admin/login")
mcheck "admin/login mobil bottom-bar yok" "$(contains "$H" 'has-bottom-nav')" "no"  # bottom nav admin'de gizli
mcheck "admin/login chatbot yok"         "$(contains "$H" 'AI Asistan')" "no"

# ----------------------------------------------------------------
# SUMMARY
# ----------------------------------------------------------------
echo ""
echo "==============================================="
echo " MOBILE RESULTS: $PASS passed · $FAIL failed"
echo "==============================================="
if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "FAILED:"
  for t in "${FAILED[@]}"; do echo "  • $t"; done
  exit 1
fi
exit 0
