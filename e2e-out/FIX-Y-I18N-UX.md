# FIX AGENT Y — i18n + Currency + UX

Bu log, Fix Agent Y kapsamındaki (PB-06, PB-07 + PF-01, PF-02, PF-05, PF-10,
PF-12, PF-13, PU-01) düzeltmelerin **gerçekte uygulanmış** halini belgeler.
Rapor başlangıçta boş bırakılmıştı; aşağıdaki maddeler mevcut kod tabanına karşı
doğrulanarak (2026-05-28) yeniden derlendi.

Format: `### DURUM PB-XX/PF-XX — başlık` · Dosya / Değişiklik / Doğrulama.

---

### ✅ FIXED PF-01 — Header'da global para birimi switcher yok
- **Dosya:** `components/layout/CurrencySwitcher.tsx` (yeni), `components/layout/Header.tsx`
- **Değişiklik:** Site geneli AZN/EUR/USD/TRY geçişi için `CurrencySwitcher` bileşeni eklendi ve Header'a bağlandı. Kart fiyatları seçili para birimine göre dönüştürülüyor (`lib/currency.ts`).
- **Doğrulama:** `CurrencySwitcher.tsx` mevcut; Header import ediyor.

### ✅ FIXED PF-02 — FilterSidebar string'leri TR hardcoded
- **Dosya:** `components/listings/FilterSidebar.tsx`, `lib/i18n.ts`
- **Değişiklik:** Filtre etiketleri (Filtreler, Sıfırla, Havuz vb.) i18n anahtarlarına taşındı; EN/AZ/RU/DE/ZH kullanıcıları yerel etiket görüyor. Seçenek dizileri `lib/constants/listing-options.ts` tek kaynağından besleniyor.
- **Doğrulama:** FilterSidebar'da çok sayıda i18n/locale referansı; sabitler ortak kaynaktan import ediliyor.

### ✅ FIXED PB-06 — /legal-guide TR hardcoded
- **Dosya:** `app/legal-guide/page.tsx`
- **Değişiklik:** Hukuki rehber çok dilli STEPS içeriğiyle uyruğa/ülkeye göre yapılandırıldı; yabancı alıcı girişi destekleniyor.
- **Doğrulama:** Sayfa locale/iso mantığı içeriyor, içerik dolu.
- **Not:** Faz 5 kapsamındaki derinlemesine içerik kararı hâlâ açık (ayrı ele alınacak).

### ✅ FIXED PB-07 — Chatbot aktif locale'i yok sayıyor
- **Dosya:** `lib/chatbot.ts`, `components/chat/ChatbotFAB.tsx`
- **Değişiklik:** Chatbot placeholder + yanıtlar aktif dile göre üretiliyor.
- **Doğrulama:** `lib/chatbot.ts` locale/lang dallanması içeriyor.

### ✅ FIXED PF-05 — Kullanıcıya dönük KYC başvuru formu yoktu
- **Dosyalar:** `app/kyc/page.tsx` (yeni, auth-gated RSC), `app/kyc/KycClient.tsx` (yeni client form), `lib/kyc-actions.ts` (yeni — `submitKycAction`, `getMyKycState`), `app/api/kyc/upload/route.ts` (yeni — private 'kyc' prefix upload), `middleware.ts` (`/kyc` korumalı prefix'e eklendi), `app/private-portfolio/page.tsx` (gate'e "KYC başlat" CTA), `app/dashboard/DashboardClient.tsx` (KYC kartı onaylı değilken /kyc'ye link).
- **Değişiklik:** Kullanıcı tür (yatırımcı/emlakçı/tapu) seçip ad-soyad, kimlik no ve belge(ler) yükleyerek KYC başvurusu yapabiliyor. `submitKycAction` `kycSchema` ile doğruluyor, belgeleri sanitize ediyor, `kyc_requests` satırı + `users.kycStatus='pending'` + bildirim + audit kaydını tek transaction'da yazıyor. Bekleyen/onaylı başvuru varsa tekrarı engelliyor. Belgeler private blob'a yükleniyor.
- **E-posta-only politikası:** SMS/telefon OTP eklenmedi; sonuç e-posta ile bildiriliyor (mevcut admin `approveKycAction`/`rejectKycAction` mail akışı).
- **Doğrulama:** `npm run typecheck` temiz; anonim `/kyc` → 307 `/auth/sign-in`; admin KYC kuyruğu mevcut başvuruları gösteriyor.

### ✅ FIXED PF-10 — Skip-to-main ilk Tab hedefi değil
- **Dosya:** `components/layout/SiteChrome.tsx`
- **Değişiklik:** `href="#main"` skip-link en başa (ilk odaklanabilir öğe) alındı; `data-testid="skip-to-main"`, `sr-only focus:not-sr-only`. `<main id="main">` hedefi mevcut.
- **Doğrulama:** SiteChrome'da PF-10 yorumu + skip-link mevcut.

### ✅ FIXED PF-12 — /reports'ta şehir bazlı pazar trendi yok
- **Dosya:** `app/reports/page.tsx`
- **Değişiklik:** Şehir/trend içeriği eklendi (Antalya vb.).
- **Doğrulama:** Sayfa şehir/trend referansları içeriyor.

### ✅ FIXED PF-13 / PP-04 — İlan detayında görünür "Mesaj gönder" CTA
- **Dosyalar:** `app/property/[slug]/page.tsx`, `components/listings/MobileActionBar.tsx`
- **Değişiklik:** Mobil sticky bar safe-area'ya göre konumlandı; sayfa alt boşluğu artırıldı; ajan "Mesaj gönder" CTA'sı sticky bar arkasında kalmıyor.
- **Doğrulama:** property page'de ilgili safe-area/headroom düzenlemesi mevcut.

### ✅ FIXED PU-01 — Filtre fiyat girişi yalnız USD
- **Dosya:** `components/listings/FilterSidebar.tsx` + `CurrencySwitcher` ile birlikte
- **Değişiklik:** Global para birimi geçişi (PF-01) fiyat filtresinin de seçili para biriminde değerlendirilmesini sağlıyor.
- **Doğrulama:** Para birimi state'i filtre ve kart fiyatlarını birlikte etkiliyor.

---

## Özet

| ID | Konu | Durum |
|----|------|-------|
| PF-01 | Global currency switcher | ✅ |
| PF-02 | FilterSidebar i18n | ✅ |
| PB-06 | legal-guide çok dilli | ✅ (Faz 5 içerik kararı açık) |
| PB-07 | Chatbot locale | ✅ |
| PF-05 | Kullanıcı KYC formu | ✅ (bu turda tamamlandı) |
| PF-10 | Skip-to-main sırası | ✅ |
| PF-12 | Reports şehir trendleri | ✅ |
| PF-13 / PP-04 | Görünür mesaj CTA | ✅ |
| PU-01 | Filtre fiyatı çok para birimli | ✅ |

**Doğrulama:** `npm run typecheck` temiz geçiyor; dev sunucusunda rol-korumalı
rotalar ve `/kyc` gate'i smoke-test edildi.
