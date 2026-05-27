# ISTBAKU — Test Senaryoları (Rol Bazlı)

> Her senaryo gerçek bir kullanıcının yapacağı bir aksiyon dizisidir.
> Yürütme türleri: **[A]** otomatik (curl/HTTP), **[C]** kod tracing, **[V]** görsel inceleme.

## Roller

| Rol | Tarif | Yetki |
|---|---|---|
| `guest` | Giriş yapmamış ziyaretçi | Sadece public ilanlar, kayıt/giriş, hesaplayıcılar |
| `user-basic` | Üye, KYC yok | + favori, karşılaştırma, AI eşleşme, mesaj |
| `user-premium` | Üye, KYC onaylı + premium üyelik | + gizli portföy, partner avukat eşle, raporlar |
| `agent-pending` | Yeni emlakçı, lisans bekliyor | İlan veremez |
| `agent` | Doğrulanmış emlakçı | İlan ekle/düzenle, CRM, randevu kabul |
| `agent-construction` | İnşaat firması | Proje ilanı, toplu yükleme |
| `moderator` | Şikayet/onay moderatörü | İlan onay/red, şikayet kapatma |
| `admin` | Operasyon admini | + kullanıcı yönetimi, KYC karar, ödeme görüntüleme |
| `super_admin` | Süper admin | Tüm yetki, ülke rehberi yönetimi, system config |

---

## A. Discovery & Navigation (Tüm roller)

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| D1 | `/` ana sayfa ilk yükleme | A | 200, "yatırım kararı" başlığı görünür |
| D2 | Hero search "Bakı Səbail" yaz, Enter | A | `/listings?q=Bakı+Səbail` rotasına git, results > 0 |
| D3 | Popüler arama tag "Bodrum villa" tıkla | A | `/listings?q=Bodrum+villa`, Bodrum sonuçları |
| D4 | "İlanları Keşfet" CTA tıkla | A | `/listings` |
| D5 | "AI Eşleşme Başlat" CTA tıkla | A | `/ai-match` |
| D6 | Currency converter: 1000 USD → TRY çevir | V | ~38,600 TRY göster |
| D7 | Currency converter: swap düğmesi | V | from/to yer değiştirir |
| D8 | TR↔AZ köprü kart hover | V | Hover effect |
| D9 | Editörün seçtikleri kart hover (premium ilan) | V | **Video oto-oynar** |
| D10 | Mortgage hesaplayıcı sliderları | V | Anlık güncelleme |
| D11 | Ülke rehberi: TR seç → PDF indir | A | `/api/country-guide?iso=TR` 200 |
| D12 | Ülke rehberi: 6 ülke bayrağı tıkla | V | Detay paneli güncellenir |
| D13 | Footer linkler | A | Tüm linkler 200 veya `#` |
| D14 | Header navigation tüm linkler | A | Tüm rotalar 200 |
| D15 | Mobil hamburger menü | V | Açılır/kapanır |
| D16 | Dark/Light toggle | V | Tema değişir, localStorage yazar |
| D17 | Dil değiştir: TR/AZ/EN | V | Header label'ları değişir |
| D18 | Sayfa scroll ile header sticky | V | scroll > 10 ise glass+shadow |
| D19 | Bell ikonuna tıkla | A | `/dashboard?tab=notifications` |
| D20 | Logo tıkla → ana sayfa | A | `/` |

## B. Listings (Filtre + Harita)

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| L1 | `/listings` doğrudan açılış | A | 200, 11 public sonuç |
| L2 | Filtre: Ülke=AZ | V | Sadece AZ ilanları |
| L3 | Filtre: Türk + Lüks Konut + Premium | V | Çok dar sonuç |
| L4 | Fiyat: min=100000, max=500000 | V | Bu aralıkta |
| L5 | Min net m² = 200 | V | Geniş daireler |
| L6 | Sadece ISTBAKU Onaylı checkbox | V | Sadece approved |
| L7 | Sort: Fiyat artan/azalan/AI skor | V | Sıralama doğru |
| L8 | View: Liste / Split / Harita | V | Layout değişir |
| L9 | Harita marker'a tıkla | V | Popup gösterilir |
| L10 | Filtre: 5 farklı feature seç | V | Sonuç daralır |
| L11 | Sıfırla butonu | V | Filtreler temizlenir, sort kalır |
| L12 | Doğal dil arama "Bakü deniz manzara" | V | İlgili sonuçlar |
| L13 | Filtre: Bina yaşı min=0 max=2 | V | Yeni ilanlar |
| L14 | Filtre: Isıtma=Kombi | V | Sadece kombili |
| L15 | Filtre: Kimden=Sahibinden | V | Sadece sahibi |
| L16 | Filtre: Konum durumu=Boş | V | Sadece boş ilanlar |
| L17 | Filtre: Bana özel oda 2+1 ve 3+1 | V | Çoklu oda seçimi |
| L18 | Banyo (min) = 2 | V | 2+ banyolular |
| L19 | "Takasa açık" filtresi | V | Sadece swappable |
| L20 | Filtre kombinasyonu: Bos sonuç | V | EmptyState gösterilir |
| L21 | URL paylaş: `/listings?q=Bakı&country=AZ&approved=1` | A | URL parametreleri uygulanır |
| L22 | Listing card favorite (kalp) tıkla | V | İçi dolar, navigasyon değil |
| L23 | Listing card hover'da gold border | V | hover effect |
| L24 | Premium ilan kartı hover | V | Video oynar |

## C. Property Detail

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| P1 | Listingden bir ilana git | A | 200 |
| P2 | Galeride büyük foto'ya tıkla | V | Lightbox açılır |
| P3 | Lightbox ←/→ klavye | V | Foto değişir |
| P4 | Lightbox ESC | V | Kapanır |
| P5 | 360° tur sekmesi (varsa) | V | Mock placeholder gösterilir |
| P6 | Video sekmesi (varsa) | V | Video çalar |
| P7 | Fiyat kartı: 3 farklı kur göster | V | USD/EUR/TRY/AZN |
| P8 | Fiyat kartı: m² fiyatları doğru | C | price/area.net, price/area.gross |
| P9 | Hızlı kredi: peşinat slider 20→50 | V | Aylık taksit değişir |
| P10 | Hızlı kredi: faiz 1.7→3 | V | Taksit artar |
| P11 | Hızlı kredi: vade 20→10 | V | Taksit artar |
| P12 | Hızlı kredi: peşinat=100 (edge) | C | Aylık taksit = 0 |
| P13 | AI Skor: detay aç/kapa | V | Toggle çalışır |
| P14 | AI Skor: 4 metrik /10 gösterimi | V | 9.2/10 vb. |
| P15 | Agent kartı: tüm metrikler dolu | V | Yıldız/yorum/yanıt/üye |
| P16 | Agent: Ara butonu | V | tel: link |
| P17 | Agent: WhatsApp butonu | V | wa.me link |
| P18 | Agent: Mesaj modal | V | Açılır, "Gönder" toast |
| P19 | Randevu modal aç | V | 7 gün + 7 saat görünür |
| P20 | Randevu: bir saat seç ve onayla | V | Toast + slot dolar |
| P21 | Randevu: aynı saati tekrar seç | V | Üstü çizili, disabled |
| P22 | Bölge profil 4 bar göster | V | aile/memur/öğrenci/yabancı |
| P23 | POI kartı: 6 ikon göster | V | Metro/okul/hastane/AVM/park/market |
| P24 | Konum haritası render | V | Leaflet + 1 marker |
| P25 | Benzer ilanlar | V | Aynı şehirden 3 ilan |
| P26 | Breadcrumb city link | A | `/listings?q=İstanbul` |
| P27 | Favori butonu üst | V | Toggle (state only) |
| P28 | Paylaş butonu | V | Klipboard kopyala (mock) |
| P29 | Detay sayfa scroll → sağ kolon sticky | V | Skor + agent kartı yapışır |
| P30 | Galeride 0 foto edge case | C | Placeholder gösterilir |
| P31 | Arsa: oda/banyo/bina yaşı gizli | C | showsField() filtreler |
| P32 | İş yeri: floor/heating göster, oda/banyo gizle | C | Şartlı render |
| P33 | Onaylı seviye 3 rozet detayı | V | "Seviye 3" yazısı |
| P34 | TRY ilan: tüm fiyatlar ₺ ile | C | Currency-aware |
| P35 | Mortgage TRY ilan'da TRY göster | C | Symbol = ₺ |

## D. Dashboard (user-basic / premium)

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| DB1 | `/dashboard` açılış | A | Overview tab |
| DB2 | `/dashboard?tab=favorites` | A | Favorites tab açık |
| DB3 | `/dashboard?tab=xxx` (geçersiz) | A | Overview'e düşer |
| DB4 | 7 tab arası geçiş | V | URL ve içerik güncellenir |
| DB5 | Bildirimler: tek tek "İşaretle" | V | Read state |
| DB6 | Bildirimler: "Tümünü okundu işaretle" | V | Hepsi read |
| DB7 | Bildirimler: link tıkla | A | Hedef sayfa 200 |
| DB8 | Karşılaştırma tablosu render | V | 3 ilan + 9 satır |
| DB9 | AI Eşleşmeler tab | V | Boş state + CTA |
| DB10 | Kayıtlı aramalar | V | 3 kart |
| DB11 | İlanlarım | V | 3 mock ilan |
| DB12 | "İlan Ekle" buton → /new-listing | A | 200 |
| DB13 | Premium kart sidebar | V | "Profili Tamamla" link |
| DB14 | Portföy performans bar grafik | V | 7 bar |

## E. AI Match Wizard

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| AM1 | 0 hedef seçili → İleri disabled | V | Disabled |
| AM2 | Yatırım+Kira seç → İleri | V | Step 1'e geç |
| AM3 | Ülke yok seç → İleri disabled | V | Disabled |
| AM4 | Bütçe=50000 (çok düşük) | V | Hiç ilan kalmayabilir |
| AM5 | Bütçe=10000000 | V | Tüm ilanlar uyar |
| AM6 | Ufuk=1 yıl → arsa cezalanır | C | mock-ai logic |
| AM7 | Ufuk=10 yıl → arsa primlenir | C | mock-ai logic |
| AM8 | "AI Önerilerini Getir" | V | 5 sonuç + pros/cons |
| AM9 | Sonuçlar: kart tıkla → detaya git | A | 200 |
| AM10 | "Yeniden başlat" | V | Step 0'a döner |

## F. WhatsApp Assistant

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| W1 | İlk mesaj örnek tıkla | V | AI taslak oluşturur |
| W2 | "Beşiktaş 3+1 980000 USD" yaz | A | price/rooms/city extract |
| W3 | Eksik bilgi → AI sorar | V | Foto gerekli sorusu |
| W4 | Yeni sohbet butonu | V | State sıfır |
| W5 | İlan taslağı paneli güncellenir | V | Sağda canlı |
| W6 | İlanı Yayınla butonu | V | Toast |
| W7 | Boş mesaj gönder | V | Bir şey olmaz |
| W8 | Çok uzun mesaj (1000 kar.) | C | Crash etmemeli |

## G. New Listing (Agent)

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| N1 | Tüm 8 adımda navigasyon | V | İleri/Geri |
| N2 | Konum: şehir boş → İleri | V | Error toast |
| N3 | Detay: fiyat=0 → İleri | V | Error toast |
| N4 | Detay: net m²=0 → İleri | V | Error toast |
| N5 | Medya: 0 foto → İleri | V | Error toast |
| N6 | Medya: 6 slot dolu | V | Append etmez |
| N7 | Medya: X ile sil | V | Slot boşalır |
| N8 | Kapak: foto seç + select | V | KAPAK rozeti |
| N9 | Kapak: video URL boş → İleri | V | Error toast |
| N10 | Kapak: video URL girilir | V | Önizleme oynar |
| N11 | Bölge profili: toplam=120 → İleri | V | Error toast (>100) |
| N12 | Bölge profili: toplam=70 | V | Diğer=30 göster |
| N13 | AI Düzelt buton | V | Title/desc üret |
| N14 | Seviye: Standart/Güçlü/Premium | V | Seçim |
| N15 | Yayınla → toast | V | Success |
| N16 | Geri-İleri 2-3 kez | V | State korunur |

## H. Private Portfolio

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| PP1 | Kilitli görüntüleme | V | Bulanık foto |
| PP2 | "Profili Tamamla & Aç" tıkla | V | Modal aç |
| PP3 | Modal onayla | V | Unlock, toast |
| PP4 | Kilitli ilana tıkla (locked) | V | Modal açılır |
| PP5 | Açıldıktan sonra ilana git | A | 200 |
| PP6 | Sayfa refresh → tekrar locked | C | localStorage yok, intentional |

## I. Auth — Sign-up

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| S1 | Sign-up sayfası açılışı | A | 200 |
| S2 | Boş form → Submit disabled | V | Disabled |
| S3 | Geçersiz email "abc" | V | "Geçerli e-posta gir" |
| S4 | Şifre 5 kar. | V | "min 8 karakter" |
| S5 | KVKK onay yok | V | Submit disabled |
| S6 | Ülke kodu seçici aç | V | 16 ülke listesi |
| S7 | Ülke kodu seç → dial güncellenir | V | +90 → +994 vb. |
| S8 | Telefon 5 hane | V | Submit disabled |
| S9 | Tüm form geçerli → Submit | V | Verify ekranı |
| S10 | "Linke tıklamış gibi devam et" | V | Done state |
| S11 | "Bilgileri düzenle" | V | Form'a döner |
| S12 | Panele git butonu | A | `/dashboard` |
| S13 | Email regex: `a@b.c` (limit) | C | Geçerli |
| S14 | Email regex: `a@b` | C | Geçersiz |

## J. Auth — Sign-in (mock)

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| SI1 | Email tab + magic link | V | Toast |
| SI2 | Telefon tab + OTP | V | Toast |
| SI3 | Google/Apple butonları | V | Boş (no-op mock) |
| SI4 | Sign-up linkine git | A | 200 |

## K. Admin — Auth & Layout

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| K1 | `/admin` (no session) | V | `/admin/login`'e redirect |
| K2 | Login: yanlış şifre | V | Error mesajı |
| K3 | Login: admin@istbaku.com/Admin2026! | V | Toast + /admin |
| K4 | Login: demo@/Demo123 | V | Aynı |
| K5 | Login: ülke şifresi kopyala butonları | V | Clipboard kopya |
| K6 | Çıkış yap → login'e | V | Redirect |
| K7 | Admin'de global header GIZLI | V | Yok |
| K8 | Admin'de chatbot GIZLI | V | Yok |
| K9 | Bildirim badge → /admin/reports | A | 200 |
| K10 | Sidebar "Siteye dön" | A | `/` |

## L. Admin — İlan Onay

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| AP1 | `/admin/approvals` | A | 200, 5 bekleyen |
| AP2 | Tab: Onaylı/Reddedildi | V | Boş başlar |
| AP3 | "Onayla" tıkla | V | Tab değişimi |
| AP4 | "Reddet" tıkla | V | Toast |
| AP5 | "İlanı Aç" → yeni sekme | V | /property/... |
| AP6 | AI bayrakları görünür | V | duplicate-suspect vb |
| AP7 | AI Kalite skoru renk | V | <80 ise gold |

## M. Admin — KYC

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| KY1 | `/admin/kyc` | A | 200, 3 başvuru |
| KY2 | Sol listeden seç | V | Sağda detay |
| KY3 | "Onayla & Rozet Ver" | V | Toast |
| KY4 | "Reddet" | V | Toast |
| KY5 | Belge tıkla | V | href='#' (mock) |
| KY6 | "Bilgi İste" | V | Hiçbir şey (henüz) |

## N. Admin — Users / Agents

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| U1 | `/admin/users` | A | 200, 8 kullanıcı |
| U2 | Arama "Mehmet" | V | 0-1 sonuç |
| U3 | Rol filtresi: agent | V | 3 kayıt |
| U4 | Durum filtresi: askıda | V | 1 kayıt |
| U5 | Mail butonu | V | Henüz no-op |
| U6 | Ban butonu | V | Henüz no-op |
| AG1 | `/admin/agents` 5 kart | V | Render |
| AG2 | Ajan dil rozetleri | V | TR/AZ/EN |

## O. Admin — Reports / Payments / Analytics

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| AR1 | `/admin/reports` 4 şikayet | A | 200 |
| AR2 | Sekme: open/reviewing/resolved | V | Geçişler |
| AR3 | "Çöz" butonu | V | Toast + state |
| AR4 | "Askıya al" | V | No-op |
| PM1 | `/admin/payments` 12 satır | A | 200 |
| PM2 | "CSV indir" | V | No-op (henüz) |
| AN1 | `/admin/analytics` grafikler | V | Render |

## P. Admin — Country Guides

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| CG1 | `/admin/country-guides` | A | 200, 6 kart |
| CG2 | "Yeni Rehber" → modal | V | Açılır |
| CG3 | Yeni ülke seç → name+flag güncellenir | V | İlk seçim çalışır |
| CG4 | "Kaydet" | V | Toast |
| CG5 | "Düzenle" → modal aç | V | Mevcut değerler |
| CG6 | "Sil" | V | confirm |
| CG7 | "Varsayılana sıfırla" | V | confirm + reset |
| CG8 | Ana sayfa rehber bölümü güncellenir | C | loadGuides() |

## Q. Chatbot

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| C1 | FAB tıkla → panel açılır | V | Bottom-right |
| C2 | "Merhaba" yaz | V | Karşılama intent |
| C3 | "AI skor nedir?" | V | ai_score intent |
| C4 | "Bakü'de yatırımlık" | V | cities_az |
| C5 | "WhatsApp ile ilan" | V | whatsapp intent |
| C6 | "Hukuki rehber" | V | legal intent |
| C7 | Follow-up tıkla | V | Yeni mesaj atar |
| C8 | Action chip "İlanları gör" | A | `/listings` |
| C9 | "Sıfırla" buton | V | Tek welcome msg |
| C10 | Küçült (sm+) | V | h-14 |
| C11 | Kapat | V | Panel kaybolur |
| C12 | Boş mesaj gönder | V | No-op |
| C13 | Çok uzun mesaj (2000 kar.) | C | Crash etmeyebilir |
| C14 | XSS denemesi: `<script>` | V | Escaped render |
| C15 | Admin'de chatbot YOK | V | FAB gözükmez |

## R. API Contract Tests

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| API1 | POST /api/ai/match {} | A | 200, default goals |
| API2 | POST /api/ai/match goals=[] | A | 200, all properties |
| API3 | POST /api/ai/match maxBudget=0 | A | Tüm ilan cezalanır |
| API4 | POST /api/ai/match invalid JSON | A | 200 with defaults (catch) |
| API5 | POST /api/ai/match maxResults=100 | A | Tüm property dönmeli |
| API6 | POST /api/ai/describe {} | A | 200, empty input |
| API7 | POST /api/ai/describe text=long | A | 200, truncate? |
| API8 | POST /api/ai/whatsapp {} | A | 200, tüm fields missing |
| API9 | POST /api/ai/whatsapp message="" | A | 200 |
| API10 | POST /api/ai/explain p1 | A | 200 + 5 satır |
| API11 | POST /api/ai/explain xxx | A | 404 not_found |
| API12 | GET /api/country-guide?iso=TR | A | 200 text |
| API13 | GET /api/country-guide?iso=XX | A | 200 (mock üretir) |
| API14 | GET /api/country-guide (no iso) | A | 200 default TR |
| API15 | API GET methods (yanlış metod) | A | 405 Method Not Allowed |

## S. Edge Cases

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| E1 | Çok uzun URL (?q=abcdef..×5000) | A | Çalışır, paramı keser |
| E2 | UTF-8 / emoji search | A | Çalışır |
| E3 | Property: olmayan slug | A | 404 |
| E4 | XSS: search ?q=`<script>` | V | Escape edilir |
| E5 | Localstorage devre dışı | C | Graceful degrade |
| E6 | Slow 3G / yavaş network | V | Skeleton/loader |
| E7 | 0 ilan sonuç | V | EmptyState |
| E8 | Premium iken /admin'e git | V | Login'e atar |
| E9 | Refresh /admin → session korunur | V | localStorage çalışır |
| E10 | Mobile portrait (375px) tüm sayfalar | V | Responsive |
| E11 | Çok geniş ekran (2560px) | V | max-w-7xl center |
| E12 | Tab açıkken localStorage clear | V | session kaybeder |
| E13 | İki tab açık → birinde logout | V | Storage event çalışır |
| E14 | Tarayıcı geri/ileri | V | State korunur |

## T. Performance / SEO

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| T1 | İlk yükleme < 5s | A | curl time |
| T2 | Image lazy load | C | loading="lazy" |
| T3 | Meta description | C | layout.tsx |
| T4 | OpenGraph tags | C | layout.tsx |
| T5 | hreflang (TR/AZ/EN) | C | YOK (not implemented) |
| T6 | Static params for /property/[slug] | A | generateStaticParams var |

## U. A11y

| # | Senaryo | Tip | Beklenen |
|---|---|---|---|
| A1 | Tüm input'ların label'ı | C | <Label> kullanımı |
| A2 | Aria-label butonlarda | C | Çoğu var, kontrol et |
| A3 | Focus-visible ring | V | globals.css'te tanımlı |
| A4 | Modal ESC kapat | V | Modal.tsx |
| A5 | Lightbox klavye nav | V | PropertyGallery |
| A6 | Color contrast | V | Tailwind tokens |
