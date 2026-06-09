# İstBaku — Tam Backlog & Açık Sorular (Tur 6 hazırlık)

> Amaç: tüm maddeleri (yapılan + yeni) tek yerde durumuyla tutmak, "yapıldı" denenleri
> tekrar teyit etmek, yeni maddelerdeki belirsizlikleri netleştirip eyleme geçmek.
> Durum: ✅ yapıldı+doğrulandı · 🟡 yapıldı/teyit gerek · 🟠 kısmi · ❌ yeni/yapılmadı · ❓ soru gerek

## A) ÖNCEKİ TURLARDA YAPILANLAR (tekrar teyit edilecek)
1. İpotek kiralık/günlükte gizli — ✅ (canlı doğrulandı)
2. İlan sayfası "Geri" butonu — ✅ (canlı var) — AMA kullanıcı "site içinde geri tuşu yok" diyor → KAPSAM? (bkz B1)
3. Mahalle filtre + site adı arama — 🟠 (seed veri + serbest metin + otomatik site önerisi; tam TR mahalle YOK)
4. Ödeme bug refactor — 🟡 (kod doğru; canlı uçtan uca ödeme test edilmedi)
5. Foto lightbox ölçü — ✅
6. İlan numarası pill — ✅ (ama yeni istek: rozet-only + tooltip, bkz C3)
7. Randevu (TZ + onay/red + takip + alternatif saat) — ✅ (10:00 doğrulandı)
8a. "Kullanım durumu" — ✅
8b. Eşyalı/site ayrı + site arama — ✅
8c. Konut tipi sıra + Giriş Kat — ✅
9. Tapu "Sözleşme" — ✅
10. Video 9:16/yatay + ölçü yazısı — 🟡 (rehber metni var; canlı wizard test edilmedi)
11. "İstBaku Onaylı Yap" owner barda — ✅
12. Hakkımızda AZ "hopub" — ✅
13. Ana sayfa arka plan — 🟠 (mobilde renk katmanı; kullanıcı hâlâ "boş" diyor → C8/C9)
14. Hafif kasma/performans — 🟠 (kod kazanımları; map hızı ayrı, bkz C6)
tur3#2 Ofise geç (her ajan) — ✅ (canlı: ofis-olmayan ajanda da link var) — kullanıcı yine şikayet etti → TEYİT (bkz B2)
tur3#3 Arsa/bina tipe göre form — ✅ (Bina seçilebilir; alan gizleme formShows) — kullanıcı "farklılık olmamış" → TEYİT
tur3#4/5 Ofis KYC (TR/AZ) — ✅ (AZ form canlı doğrulandı)
i18n tam sweep (tur4) — ✅ (~900 anahtar; EN'de sızıntı yok) — kullanıcı "hâlâ değişmeyen var" → KALANLAR? (bkz B3)
Responsive/taşma (tur5) — ✅ (tüm sayfa × 3 genişlik sıfır taşma) — AMA Mac'te küçük/boşluk (bkz C2 — FARKLI sorun!)

## B) "YAPILDI AMA KULLANICI HÂLÂ ŞİKAYET" — İNCELENECEK
- B1. Geri butonu: property'de var. Kullanıcı "site içinde geri tuşu yok" → istek SİTE GENELİ geri butonu mu, yoksa property'deki görünmüyor mu? ❓
- B2. Ofise geç: kodda tüm ajanlarda var (canlı doğruladım). Kullanıcı hâlâ "sadece kendi ilanımda" diyor → CANLIDA deploy gecikmesi mi, yoksa farklı bir "ofis bilgileri" alanı mı? ❓ (deploy sonrası tekrar bakılacak)
- B3. Diller: tur4'te public+authed+admin çevrildi. KALAN: SEO `<title>`/metadata (statik TR), loading.tsx "Yükleniyor…", olası kaçaklar → tam tarama yapılacak.

## C) YENİ MADDELER
- C1. İlan onaylanınca foto üstüne **soluk logo watermark** (ss alınsa bile iz). ❌ Yeni.
- C2. **Mac'te site küçük + sağ/sol boşluk** (Windows-odaklı görünüyor). Yazılar okunmuyor. ❌ Yeni — ÖNEMLİ (muhtemel: max-width/temel font/zoom). ❓ ekran çözünürlüğü?
- C3. İlan kartı/sayfasında "İstBaku Onaylı" **buton yazısı yerine sadece rozet** + hover'da tooltip (belirtilen metin). ❌ Yeni.
- C4. **Airbnb tarzı harita-odaklı arama**: haritayı oynattıkça sol liste o bölgenin ilanlarını göstersin. ❌ Yeni — büyük.
- C5. **Harita hızı/zoom** (Airbnb gibi pürüzsüz). ❌ Yeni — map kütüphanesi/ayar.
- C6. Ana sayfa + AI eşleme arka plan **canlılık** (düz beyaz). 🟠/❌.
- C7. **Aile yaşam profili gerçek data** + AI skor **fiyat gerçekliği** (homora.ai referans). ❌ Yeni — VERİ KAYNAĞI sorunu. ❓
- C8. **Gizli portföy erişim yöntemi** (sistematik). ❌ Yeni — tasarım kararı. ❓
- C9. Raporlar: **şehri isteğe göre değiştirme**. ❌ Yeni.
- C10. **"Demo talep et" / "Örnek gör" butonları çalışmıyor**. ❌ Yeni — bug/işlev.
- C11. **Blog yazıcıları erişim** + içerik (video+foto+metin). 🟠 (publisher var; rich content?). ❓
- C12. **Site geneli geri tuşu** (B1 ile aynı olabilir). ❓
- C13. **Google/iOS (OAuth) ile hesap açma**. ❌ Yeni — büyük auth.
- C14. **Ofis profil foto: yuvarlak içine redakte (crop)** + **arka kapak fotoğrafı** (Facebook tarzı). ❌ Yeni.
- C15. **Favoriler sekmeleri (koleksiyon)** + favoriye atınca sekme seçimi (sahibinden tarzı). ❌ Yeni — feature.
- C16. Ana sayfada **döviz ↔ blog yer değişimi**. ❓ tercih.
- C17. **Admin fiyatlandırma kaydet → "yetki yok" hatası**. ❌ Yeni — BUG (öncelik).
- C18. **Telefonda ilan skoru açıklaması gözükmüyor**. ❌ Yeni — responsive bug.

## D) AÇIK SORULAR (netleşince eyleme geçilecek)
(AskUserQuestion ile sorulacak — cevaplar buraya işlenecek.)
