# ISTBAKU.COM

Yatırım odaklı emlak platformu. **Production-ready** — Postgres, gerçek auth, foto/video upload.

## Stack

| Katman | Teknoloji |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind v4 (Sky/Turuncu paleti, Amber Premium aksanı) |
| DB | **Postgres** (Neon önerilir) |
| ORM | **Drizzle** |
| Auth | **bcrypt** + **iron-session** (httpOnly cookies, AES-CBC encrypted) |
| Storage | **Vercel Blob** (token yoksa `public/uploads`'a fallback) |
| Map | Leaflet (OpenStreetMap tiles) |
| Charts | Recharts |

## Hızlı Başlangıç

### 1. Postgres veritabanı (~5 dk)

**Seçenek A: Neon (önerilen — ücretsiz, Vercel uyumlu)**
1. [console.neon.tech](https://console.neon.tech) — hesap aç (GitHub ile)
2. Yeni proje oluştur (region: AWS Frankfurt veya US East)
3. "Connection string" tab → "Pooled connection" → kopyala

**Seçenek B: Lokal Postgres**
```bash
# Docker ile
docker run -d --name istbaku-pg \
  -e POSTGRES_USER=istbaku -e POSTGRES_PASSWORD=istbaku -e POSTGRES_DB=istbaku \
  -p 5432:5432 postgres:16
# DATABASE_URL=postgres://istbaku:istbaku@localhost:5432/istbaku
```

### 2. Environment

```bash
cp .env.example .env.local
# .env.local içine:
#   DATABASE_URL=...        (Adım 1'den)
#   SESSION_PASSWORD=...    (`openssl rand -base64 32` veya 32+ karakter random)
#   BLOB_READ_WRITE_TOKEN=  (boş bırakabilirsin — public/uploads kullanır)
```

### 3. Kurulum + DB

```bash
npm install
npm run db:push        # Tabloları oluştur (drizzle-kit push)
npm run db:seed        # Mock verileri yükle (ilanlar, adminler, demo kullanıcı)
npm run dev            # http://localhost:3000
```

> İlk `db:push` Postgres'e tüm tabloları açar. Şema değişikliğinden sonra tekrar çalıştır.

### 4. Test hesapları (seed sonrası)

| Rol | E-posta | Şifre |
|---|---|---|
| Kullanıcı | `firudin@istbaku.com` | `Test1234!` |
| Süper Admin | `admin@istbaku.com` | `Admin2026!` |
| Moderator | `moderator@istbaku.com` | `Moderator2026!` |
| Demo Admin | `demo@istbaku.com` | `Demo123!` |
| Ajan (Mehmet) | `a1@istbaku.com` | `Agent2026!` |
| Ajan (Elnur) | `a2@istbaku.com` | `Agent2026!` |

## Komutlar

```bash
npm run dev           # Geliştirme sunucusu
npm run build         # Production build
npm run start         # Production sunucusu
npm run typecheck     # TypeScript kontrolü
npm run db:push       # Schema'yı DB'ye uygula (geliştirme)
npm run db:generate   # Migration oluştur (production sürümleme)
npm run db:migrate    # Migration'ları uygula
npm run db:studio     # Drizzle Studio (web UI ile DB tarayıcısı)
npm run db:seed       # Mock veriyi DB'ye yükle (sıfırlar!)
```

## Mimari

```
app/
  layout.tsx              Root (Header + Footer + Chatbot + MobileNav)
  page.tsx                Hero, kur çevirici, AI bento, featured (DB'den), bridge, hesaplayıcı, ülke rehberi
  auth/sign-up/           Server action: signUpAction → DB INSERT + auto sign-in
  auth/sign-in/           Server action: signInAction → bcrypt verify + session
  listings/               DB'den public listings → client'ta filtre
  property/[slug]/        Server-side DB query + map + agent kartı + randevu
  dashboard/              Auth-gated (server check), tab system
  new-listing/            7 adım form → createListingAction → DB INSERT + Blob upload
  private-portfolio/      Premium-only DB query
  ai-match/, reports/,    Diğer flow'lar
  legal-guide/
  admin/
    layout.tsx            Server check: getCurrentAdmin() → redirect /admin/login
    login/                Server action: adminSignInAction
    approvals/, kyc/, ... Admin moderation pages (DB-backed)
    country-guides/       PDF rehberi CRUD
  api/
    auth/me/              Current session → client useUser
    country-guide/        PDF redirect
    ai/{match,describe,explain}/  Mock AI endpoints

db/
  schema.ts               Drizzle şema (15+ tablo, tüm enum'lar, indexler)
  client.ts               postgres-js connection + Drizzle instance
  seed.ts                 npm run db:seed
  migrations/             drizzle-kit generate çıktıları

lib/
  auth-actions.ts         signUp, signIn, signOut, getCurrentUser, adminSignIn, getCurrentAdmin
  listing-actions.ts      createListing, getMyListings (server actions)
  notification-actions.ts mark read, unread count
  appointment-actions.ts  create + agent calendar
  guide-actions.ts        upsert/delete country guides
  admin-actions.ts        approve/reject listing+kyc+abuse, suspend user
  storage.ts              uploadFile / uploadDataUrl (Vercel Blob ↔ fs fallback)
  db-queries.ts           getPublicListings, getListingBySlug, searchListings, getAgentById...
  db-mappers.ts           DB row → UI Property/Agent

middleware.ts             x-pathname header (server components için)
```

## Auth Akışı

```
KULLANICI:
1. /auth/sign-up           → signUpAction()
   - validation (regex, password length)
   - bcrypt.hash(password, 10)
   - INSERT users
   - iron-session.save() (httpOnly cookie)
2. "Mail linkine tıkla"    → verifyEmailAction() → emailVerified=true
3. Otomatik /dashboard

DASHBOARD/NEW-LISTING:
- Server component: const user = await getCurrentUser()
- if (!user) redirect('/auth/sign-in')
- initialUser prop olarak client'a geçer

LOGOUT:
- Server action: signOutAction() → session.destroy()
- window.location.href = '/'

ADMIN (ayrı scope):
1. /admin/login            → adminSignInAction()
   - role kontrolü: admin/moderator/super_admin
   - iron-session.adminScope = true
2. /admin/* layout         → getCurrentAdmin() → redirect /admin/login if null
3. Logout                  → signOutAction() + redirect /admin/login

ÖNEMLİ: Admin oturumu kullanıcı sayılmaz (adminScope flag).
Admin'den çıkış yapan kullanıcı siteye gidince giriş yapmamış görünür.
```

## DB Şema Özeti

| Tablo | Amaç |
|---|---|
| `users` | Tüm kullanıcılar (user/agent/admin), bcrypt hash, KYC, premium |
| `agents` | Agent meta (rating, performance, agency, languages) |
| `sessions` | DB-backed session opsiyonel (iron-session yeterli) |
| `listings` | İlanlar — score, region profile, nearby POI, approval state |
| `favorites` | user ↔ listing many-to-many |
| `saved_searches` | Kullanıcı arama filtreleri + yeni eşleşme sayacı |
| `appointments` | Gezinti randevuları, paylaşımlı takvim (agent slot unique) |
| `message_threads` + `messages` | Alıcı ↔ ajan mesajlaşma |
| `notifications` | Kullanıcı bildirimleri |
| `approval_requests` | İlan onay kuyruğu (admin) |
| `kyc_requests` | KYC inceleme |
| `abuse_reports` | Şikayet/moderasyon |
| `payments` | Premium üyelik, tier upgrade, rapor satışı |
| `audit_log` | Tüm admin aksiyonları (append-only) |
| `country_guides` | Ülke bazlı PDF rehberleri (admin CRUD) |

## Vercel'e Deploy

```bash
# Vercel CLI ile (önerilir)
npm i -g vercel
vercel link
vercel env add DATABASE_URL
vercel env add SESSION_PASSWORD
vercel env add BLOB_READ_WRITE_TOKEN
vercel --prod
```

Veya **Vercel Marketplace**'ten:
1. Vercel Dashboard → Storage → **Neon Postgres** ekle (otomatik DATABASE_URL set)
2. Vercel Dashboard → Storage → **Blob** ekle (otomatik BLOB_READ_WRITE_TOKEN set)
3. Settings → Environment → **SESSION_PASSWORD** elle ekle (32+ char)
4. Deploy

Build sırasında otomatik:
- `drizzle-kit push` çalıştırmak istersen `vercel.json`'a build hook ekle
- Veya prod'a deploy sonrası `vercel exec npm run db:push` bir kez çalıştır
- Seed'i de bir kez `vercel exec npm run db:seed` ile yap

## Production'da kaldı

Aşağıdaki mock'lar gerçek entegrasyon bekliyor:

- **`/api/ai/*` endpoint'leri** — Mock AI yanıtları → Vercel AI Gateway + Claude Sonnet
- **Email gönderimi** — `signUpAction` mail göndermiyor → Resend entegrasyonu
- **Phone OTP** — Şu an yok (kullanıcı tercihi: numara doğrulaması yok)
- **Ödeme** — Mock payments → iyzico (TR) + AzeriCard (AZ) + Stripe (global)
- **WhatsApp ofis iletişimi** — `wa.me` link (dış servis, OK)

## Test

```bash
npm run typecheck          # TS doğrulama
bash scripts/qa-runner.sh  # Desktop HTTP + API contract testleri (DB gerekir)
bash scripts/qa-mobile.sh  # Mobil viewport/UA testleri
```

## Lisans

Kapalı kaynak. © ISTBAKU 2026.
