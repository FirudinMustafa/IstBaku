# İstBaku — Revize Durum Takibi (canlı çalışma dosyası)

> Amaç: tüm revize maddelerinin (tur 1/2/3) durumunu tek yerde tutmak; eksik/ertelenen/yarım
> kalanları bitirmek ve çalıştığını doğrulamak. Her madde durum etiketli:
> ✅ tamam+canlı doğrulandı · 🟡 kod/build ile doğrulandı · 🟠 kısmi · ❌ açık · 🔧 BU TURDA yapılıyor

## Kritik altyapı
- Migration 0011 prod Neon'a uygulandı (housing_type giris_kat, appointment_status rejected/rescheduled,
  appointments.proposed_at, partial unique index).
- ⚠️ Kod henüz commit/deploy edilmedi → canlı site eski kod. Partial index ile eski kodun randevu
  ON CONFLICT'i uyumsuz → deploy ŞART. (Commit kararı kullanıcıda.)

## Madde durumu (önce)
1. İpotek satılıkta — ✅
2. Geri butonu — ✅
3. Mahalle/site dataset — 🟠 (seed var, "tüm siteler" yok) → 🔧 site auto-suggest + seed genişlet
4. Ödeme bug refactor — 🟡 → 🔧 canlı uçtan uca doğrula
5. Lightbox ölçü — ✅
6. İlan numarası — ✅
7. Randevu (TZ+onay/red+takip+öner) — 🟡 → 🔧 canlı akış doğrula
8a. Kullanım durumu — ✅
8b. Eşyalı/site ayrı + site arama — ✅
8c. Konut tipi sıra + Giriş Kat — ✅
9. Tapu "Sözleşme" — ✅
10. Video 9:16+yatay+ölçü — 🟡 → 🔧 canlı doğrula
11. İstBaku Onaylı Yap görünür — ✅
12. Hakkımızda AZ — ✅
13. Ana sayfa arka plan — 🟠 → 🔧 renk/derinlik dokunuşları ekle
14. Performans (hafif kasma) — ❌ → 🔧 gerçek tarama + güvenli iyileştirmeler
tur3#1. Diller (i18n) — 🟠 → 🔧 sihirbaz + randevu + admin TAM çeviri
tur3#2. Ofis/ajan profili + link — ✅
tur3#3. Tipe göre form — 🟡 (Bina ✓ canlı; alan gizleme detay adımı canlı görülmedi) → 🔧 canlı doğrula
tur3#4/#5. Ofis KYC — 🟡 (AZ form canlı ✓; TR + submit canlı değil) → 🔧 doğrula

## BU TURDA YAPILACAKLAR (sıra)
- [x] A. Ana sayfa arka plan — ucuz renk katmanı her ekranda (app/page.tsx), ağır blur md+
- [x] B. Site auto-suggest — ListingsClient'tan distinct siteName → FilterSidebar datalist (filter-site-list)
- [x] C. i18n TAM sweep — agent: ~250 anahtar×6 dil; appointments, ApprovalsClient, NewListing sihirbazı
- [x] D. Performans — MapView dynamic(ssr:false), scroll rAF throttle, Hero blur md+, Header blur hafif, ListingCard React.memo
- [x] E. typecheck + build TEMİZ
- [x] F. Canlı doğrulama — aşağıda
- [x] G. MD final güncelle

## CANLI DOĞRULAMA SONUÇLARI (tarayıcı, dev sunucu)
- i18n: /listings EN → "Housing type" var, "Konut tipi" YOK; new-listing tip/amaç EN. ✅
- Ana sayfa 200; 0 pageerror. ✅
- **Randevu oluşturma yeni kodla çalışıyor** (ok:true) — migration/partial-index uyumu ✅
  (eski deploy edilmiş kodda ON CONFLICT uyumsuzluğu nedeniyle BOZUK → deploy şart).
- **Saat kayması fix**: 07:00Z booking, besiktas country=TR → ofis panelinde **10:00** gösterildi ✅
  (mail aynı formatInTz helper'ını kullanır → mailde de 10:00).
- typecheck + build temiz. ✅
- Test verisi (randevu + önceki test ofis) oluşturulup SİLİNDİ — prod'da iz yok.

## HÂLÂ AÇIK (dürüst, küçük kalanlar)
- /agent CRM sayfası ve dashboard wrapper'ı hâlâ sabit TR (randevu KARTLARI çevrildi; sayfa başlıkları değil).
- Tam TR mahalle dataseti yok (seed + serbest metin + otomatik büyüyen site önerileri var).
- Performans: kod kazanımları yapıldı; gerçek Lighthouse ölçümü yapılmadı.
- Ödeme uçtan uca + ofis KYC SUBMIT canlı test edilmedi (kod+typecheck+build ile doğru; prod'a gerçek
  ödeme/başvuru yazmamak için). Preview deploy'da test edilebilir.

## Yapılan değişikliklerin kaydı (unutmamak için)
- A: app/page.tsx — blur'suz gradient+grid katmanı her ekranda; blur-3xl lekeler `hidden md:block`.
- B: FilterSidebar `siteSuggestions` prop + datalist; ListingsClient `siteSuggestions` useMemo (city/district'e göre distinct).
- C: lib/i18n.ts 6 dile ~250 anahtar (appt.*, approvals.*, wz.* genişletme). 4 bileşen t() ile.
- D: ListingsClient MapView→next/dynamic; scroll handler rAF throttle; Hero.tsx aurora+blur `hidden md:block`;
     Header.tsx blur-xl→md / blur-md→sm; ListingCard.tsx React.memo(id+compact).
- Build dummy SESSION_PASSWORD ile tamamlandı; tüm rotalar derlendi.

## TUR 4 — TAM i18n TARAMASI (tüm sayfalar/kodlar)
Hedef: dil değişince çevrilmeyen HİÇBİR UI metni kalmasın.
- [x] Keşif: envanter çıktı — ~650+ string (public ~150, authed ~120, admin ~320+)
- [ ] Düzeltme (sıralı, i18n.ts çakışmasın):
  - [ ] Agent 1 PUBLIC: compare, ai-match, reports, office-performance, private-portfolio, blog/*, coming-soon, not-found, error, Hero popüler aramalar, BlogNews, PublisherBlog
  - [ ] Agent 2 AUTHED: dashboard(PAYMENT labels+AccountSettings+OfficeDetails), agent/page, kyc/*, messages, publisher/layout, OwnerActionBar, DailyBookingCard, AvailabilityCalendar, ui(LocationSelector/RichTextEditor/Modal/Toast)
  - [ ] Agent 3 ADMIN-1: AdminShell, admin/page, charts, login, Users, ListingsAdmin, kyc, payments, analytics, agents
  - [ ] Agent 4 ADMIN-2: offices, cross-border, pricing, reports/Abuse, reviews, blog, country-guides, publishers, audit, rpa-reports
- [x] Düzeltme TAMAM: 4 alanın hepsi (public/authed/admin-1/admin-2) — ~673 yeni anahtar × 6 dil
- [x] typecheck + build TEMİZ
- [x] Canlı EN doğrulama: yüklenen her sayfada (public+authed+admin) TR sızıntısı YOK;
      admin gerçek oturumla EN → "Overview/Quick Action/Total Users" (İngilizce) doğrulandı.
- AÇIK KALAN (küçük): SEO `<title>`/metadata başlıkları statik TR (ör. coming-soon "Çok Yakında — ISTBAKU")
  — generateMetadata + cookie-lang gerektirir, ayrı kategori. loading.tsx skeleton "Yükleniyor…" kısa flash.
Not: loading.tsx skeleton'larındaki "Yükleniyor…" server-render (kısa flash) — düşük öncelik.
Not: Sunucu hata/bildirim/email metinleri ayrı kategori (request-lang gerekir) — UI öncelik.
Not: Sunucu kaynaklı hata mesajları/bildirim/email metinleri ayrı kategori (request-lang gerektirir) — UI öncelik.

## KALAN (dürüst)
- Mahalle dataseti hâlâ seed + serbest metin (tam TR ~50k YOK) — site önerileri otomatik büyüyor.
- new-listing'deki amenity etiketleri (lib/labels.ts amenitiesFor) hâlâ TR data — TSX label'ları çevrildi.
- Performans: kod-seviyesi kazanımlar yapıldı; gerçek cihazda Lighthouse ölçümü yapılmadı.
