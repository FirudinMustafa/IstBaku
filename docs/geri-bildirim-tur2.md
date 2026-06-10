# IstBaku — Sahip Geri Bildirim (Tur 2) — 2026-06-10

> Statü: 🔴 yeni bug · 🟠 tekrar · 🟡 tasarım/karar · 🔵 strateji · ✅ karar verildi

## SAHİP KARARLARI (2026-06-10)
- **Test zamanı:** Yeni deploy (af738c4) BİTTİKTEN sonra test edildi → bu buglar GERÇEK, deploy-gap değil.
- **D2 Güçlü ilan:** "Güçlü ilan diye bir şeyimiz yok" → tier `guclu`'yu **UI'dan tamamen KALDIR** (DB enum kalır, ama hiçbir yerde sunulmaz/gösterilmez).
- **G3 "Belge durumu":** Aslında kasıt = **belge/dosya YÜKLEME her yerde bozuk**. → TÜM upload akışlarını (ilan foto, KYC, ofis belge, avatar, blog görsel) baştan sona DENETLE, uçtan uca çalıştığından emin ol. **EN ÖNCELİKLİ.**
- **M1 gerçek veri (homora.ai):** ERTELE — önce buglar.
- **M2 gizli portföy:** Mevcut akış (KYC onaylı → talep → admin onay) korunur; sadece düzgün çalıştığından emin ol.
- **M3 blog yazıcı:** YENİ akış — kullanıcı **başvurur → admin onaylar** → blog_publisher rolü. (Şu an sadece admin elle hesap açıyor.)
- **D6 taslak:** Otomatik taslak (lokal/tarayıcı) + "taslaktan devam mı, yeni mi?" sorusu + taslak silinebilir.

## ÖNCELİK SIRASI (yürütme)
1. **Belge/dosya yükleme sistemi** (B1, B2, E1, E2, G3) — tam denetim + onarım. **[EN KRİTİK]**
2. **Admin yetki hataları** (F1, F2) — on/red + fiyatlandırma "yetki yok".
3. **İlan wizard buglar** (D3 adresten-bul, D4 doğrulama, D5 mail seviye-2, D7 5-default-foto).
4. **Watermark** (A1) — tüm fotolar + lightbox + mevcut ilanlar için backfill.
5. **i18n + header** (C1, C2 RU/DE header karışması).
6. **AI fokus** (I4), **raporlar** (K1 PDF, K2 demo), **format** (L1 kart, L2 tarih).
7. **'Güçlü' kaldır** (D2), **rozet belirginlik** (J3), **filtre eşyalı/site** (G2), **mahalle listeleme** (G1).
8. **UX** (I1 geri buton, I2 0-yorum link, I3 scroll-to-top), **arka plan** (J1, J2).
9. **Taslak sistemi** (D6).
10. **Kasma** (H1, H2 harita, H3 foto değişimi).
11. **Stratejik sonraki tur:** M1 gerçek veri.

## İLERLEME LOGU
- **2026-06-10 (commit 7f28cac):** Belge yükleme sağlamlık (HEIC→jpeg, private→public, net hata) — engine smoke testi geçti.
- **2026-06-10 (commit 84728d4):** ✅ **I4 chatbot/modal fokus** — FocusTrap onEscape ref'e alındı; **canlıda doğrulandı** (yazı tam, fokus korundu). ✅ **C2 RU/DE header** — nav lg→xl; **canlıda doğrulandı** (ru+de @1100px hamburger). "(yakında)" kaldırıldı. A1 backfill betiği eklendi.
- **Canlı doğrulama (Playwright, objektif):** M5 ofis kayıt belge alanları ✅ (ülke+TC/FIN+belge ekle), M8 geri buton ✅, M12 ilan no ✅.
- **AÇIK kalanlar (bilinen):** A1 watermark — mevcut ilanlar için `scripts/backfill-watermark.ts` (prod BLOB token ile çalıştırılmalı); yeni onaylar otomatik. Belge >4.5MB için client-side upload. BLOB_READ_WRITE_TOKEN Vercel'de doğrulanmalı.
- **2026-06-10 (commit ec40cac):** ✅ **F1/F2 admin 'yetki yok' KÖK NEDEN** — admin NORMAL girişte `adminScope=false` olduğundan tüm admin yazma aksiyonları reddediliyordu. `getAdminOrRole` helper'ı (adminScope yoksa DB rol fallback) eklendi; `requireAdmin` + cross-border/guide/office hepsi buna geçti → onay/red/fiyat/cross-border/ofis-metrik artık çalışır. ✅ **D2** 'güçlü' tier UI'dan kaldırıldı (yükseltme modalı yalnız İstBaku Onaylı; badge'ler dahil). ✅ **D5** ilan-onay mailindeki 'Seviye 2' → 'Durum: ISTBAKU Onaylı'. Build temiz.
  - **Mobil/masaüstü taşma kontrolü (canlı):** ofis kayıt formu mobil(390px)+masaüstü ✅ yatay taşma yok.
- **2026-06-10 (commit ef23963):** ✅ **D3** adresten-bul — geocode'a Photon fallback (Nominatim Vercel'i bloklayınca); bulunamadı toast'ı yumuşatıldı (info). ✅ **D4** doğrulama hatası — 'toplam kat' yalnız gösterilen tiplerde zorunlu (arsa artık step-2'yi geçer); schema totalFloors min(0). ✅ **D7** ilan fotosu — desktop grid sahte gri placeholder'ı kaldırdı (3 foto→3 foto). Build temiz.

---

> Ham liste (gruplanmış):

---

## A. Watermark / Görsel
- **A1** 🔴 Soldurulmuş logo sadece **tek** fotoya eklenmiş ve **büyütünce** (lightbox) kayboluyor. → **tüm** fotolarda + büyütünce de görünmeli.
  - Not: Yeni gömme tüm `images[]`'a uygulanıyor ama yalnız onay anında ve `watermarked=false` ilanlar için. **Mevcut (eski) onaylı ilanlar damgalanmıyor** → eski ilanlarda hâlâ CSS overlay (sadece hero) görünür. Backfill gerekebilir.

## B. Belge Yükleme  — ✅ KÖK NEDEN + DÜZELTME (bu tur)
- **B1/B2** 🔴→✅ Belge yükleme. **Bulunan nedenler:** (1) KYC/ofis belgeleri **private blob**'a yazılıyordu; admin `<a href={url}>` ile açıyor → private auth ister, **açılamaz/görünmez** (karşı tarafta "gelmemiş" gibi). (2) iPhone **HEIC** foto allow-list dışıydı → reddediliyordu. (3) **BLOB_READ_WRITE_TOKEN** prod'da yoksa tüm yüklemeler sessizce başarısız.
  - **Düzeltme (`lib/storage.ts`, `lib/security.ts`):** belgeler artık **public + tahmin edilemez (72-bit) key** (yükleme+inceleme güvenilir; imzalı-URL gelince private'a dönülebilir). HEIC→jpeg otomatik dönüşüm (sharp). Private başarısızsa public'e düşme. Prod'da token yoksa **net hata**. Engine smoke testi (`scripts/upload-smoke.ts`) JPEG/PNG/PDF/aşırı-boyut/yanlış-tip/HEIC dallarını doğruladı → tümü beklendiği gibi.
  - **AÇIK (prod):** (a) **Vercel fonksiyon gövde limiti 4.5MB** → server-side upload ile >4.5MB dosya prod'da takılır; >5MB belgeler için **client-side upload** (browser→blob) gerekir (ayrı iş). (b) **BLOB_READ_WRITE_TOKEN** Vercel'de bağlı mı doğrulanmalı.

## C. Diller (i18n)
- **C1** 🟠 Hâlâ değişmeyen (çevrilmeyen) yerler var.
- **C2** 🔴 Üst kısım (header) **RU ve DE** dilinde iç içe giriyor / karışıyor.

## D. İlan Yükleme / Wizard
- **D1** 🔴 Yazılar iç içe giriyor (düzenleme kısmında).
- **D2** 🔴 İlan yükseltmede **"Güçlü ilan"** seçeneği yok.
- **D3** 🔴 Sayfa 2'de **"Adresten bul"** butonu hata veriyor.
- **D4** 🔴 İlan yüklemede **doğrulama hatası** veriyor.
- **D5** 🔴 İlan yüklerken **mailde "seviye 2"** kalıyor → güncellenmeli.
- **D6** 🟡 **Taslak / yeni ilan** seçeneği: 8 sayfanın 5'inde durduysa, tekrar "İlan yerleştir"de "taslaktan mı devam, yeni mi?" sorulmalı; taslak isteğe göre silinebilmeli.
- **D7** 🔴 3 foto koyduğu halde ilana girince **5 default/placeholder foto** görünüyor.
- **D8** 🟠 Video **9:16** ve yatayı yüklenebilmeli; kapak video alanında ölçüler yazılmalı.

## E. KYC / Ofis Kayıt
- **E1** 🟠 KYC herkesten aynı bilgi istiyor; emlak ofislerinden **yetki belgesi + ofis adresi** istenmeli.
- **E2** 🟠 Ofis kaydı: önce **ülke**, sonra ülkeye göre belgeler (şimdilik standart):
  - TR şahıs şirketi: TC, Vergi kimlik no, şirket ismi, adres, il/mahalle, yetki belge no + **görselleri**.
  - AZ fiziki şəxs: FIN kod, VÖEN, şirkət adı, açıq adres, şəhər/rayon + **rəsmi şəkilləri**.

## F. Admin
- **F1** 🔴 Admin panelde bazı yerlerde onay/red'de **"yetki yok"** hatası.
- **F2** 🟠 Fiyatlandırmada **kaydet → "yetki yok"** hatası.

## G. Filtreler / Arama
- **G1** 🔴 **Mahalle/semt** listelenmiyor — il/ilçe gibi mahalle/semt de listelensin (hem aramada hem ilan yüklerken).
- **G2** 🟠 Özellikler kısmında **eşyalı** ve **site içi** ayrı olmalı.
- **G3** 🟡 **"Belge durumu"** filtresi eklenmeli (hem ilan altında hem yüklerken).

## H. Performans / Kasma
- **H1** 🔴 Hafif kasmalar var.
- **H2** 🔴 **Harita** kasması eskisinden arttı.
- **H3** 🔴 **Foto değişiminde** ciddi kasma.

## I. Navigasyon / UX
- **I1** 🟡 Hakkımızda vb.'ye geçince **geri butonu** konumu iyi durmuyor.
- **I2** 🟡 Ofis sayfasında **"(0 yorum)"** tıklanabilir olsun → yorumlara kaydırsın.
- **I3** 🟡 Aktif sayfa linkine **tekrar basınca** en başa dön / yenile (scroll-to-top + refresh hissi).
- **I4** 🔴 **ISTBAKU AI**'da harf yazınca **fokus kayboluyor**, yazılamıyor.

## J. Tasarım / Arka Plan / Rozet
- **J1** 🟡 Ana sayfa arka planı boş — renk/doku eklensin.
- **J2** 🟡 Ana sayfa + **AI eşleme** arka planına canlılık.
- **J3** 🟡 **İstBaku Onaylı rozeti** belirgin değil.

## K. Raporlar (Hesabatlar)
- **K1** 🔴 **PDF indir** → aynı sayfayı ekliyor; sayfa geçişlerinde sorun.
- **K2** 🔴 **Demo talep** → boşlukları doldurmada hata.

## L. Format / Yerelleştirme
- **L1** 🟡 **Kart numarası** 4-4-4-4 boşluklu olmalı.
- **L2** 🟡 **Tarih aralığında "/"** olmalı (karışmasın).

## M. Veri / Strateji (konuşulacak)
- **M1** 🔵 Aile yaşam profili + AI fiyat skoru **gerçek veriden** (homora.ai benzeri) — konuşalım.
- **M2** 🔵 **Gizli portföy** erişimini sistematik olarak nasıl sağlayacağız.
- **M3** 🔵 **Blog yazıcılarına** erişim nasıl verilecek.

## N. Spesifik örnek (sahip verdi)
- `/property/i-stanbul-cekmekoy-1-1-konut` ilanı: 3 foto koymasına rağmen 5 foto görünüyor (D7 ile aynı).
