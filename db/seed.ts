/* eslint-disable no-console */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './client';
import * as s from './schema';
import { sql } from 'drizzle-orm';
import { PROPERTIES } from '../lib/data/properties';
import { AGENTS } from '../lib/data/agents';
import { getSeedAdminAccounts } from '../lib/admin-auth';
import { DEFAULT_GUIDES } from '../lib/data/country-guides';

async function clear() {
  console.log('🧹 Tablolar temizleniyor (truncate cascade)…');
  // Sırasıyla bağımlı tablolar
  await db.execute(sql`
    TRUNCATE TABLE
      ${s.auditLog},
      ${s.abuseReports},
      ${s.kycRequests},
      ${s.approvalRequests},
      ${s.payments},
      ${s.notifications},
      ${s.messages},
      ${s.messageThreads},
      ${s.appointments},
      ${s.savedSearches},
      ${s.favorites},
      ${s.listings},
      ${s.sessions},
      ${s.agents},
      ${s.users},
      ${s.countryGuides},
      ${s.countries}
    RESTART IDENTITY CASCADE;
  `);
}

async function seedCountries() {
  console.log('🌍 Ülke master listesi…');
  await db.insert(s.countries).values([
    {
      code: 'TR', nameTr: 'Türkiye', nameAz: 'Türkiyə', nameEn: 'Turkey',
      nameRu: 'Турция', nameDe: 'Türkei', nameZh: '土耳其',
      flagEmoji: '🇹🇷', enabled: true, sortOrder: 1,
    },
    {
      code: 'AZ', nameTr: 'Azerbaycan', nameAz: 'Azərbaycan', nameEn: 'Azerbaijan',
      nameRu: 'Азербайджан', nameDe: 'Aserbaidschan', nameZh: '阿塞拜疆',
      flagEmoji: '🇦🇿', enabled: true, sortOrder: 2,
    },
  ]).onConflictDoNothing();
  console.log('  ✓ Ülkeler eklendi');
}

async function seedAdmins(): Promise<Record<string, string>> {
  console.log('👑 Adminler oluşturuluyor…');
  const adminMap: Record<string, string> = {};
  const accounts = getSeedAdminAccounts();
  if (accounts.length === 0) {
    console.warn('  ⚠ Admin seed atlandı: SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD env değişkenleri tanımlanmamış.');
    return adminMap;
  }
  for (const a of accounts) {
    const passwordHash = await bcrypt.hash(a.password, 12); // MH-03: bcrypt cost 12
    const [u] = await db.insert(s.users).values({
      name: a.name,
      email: a.email.toLowerCase(),
      passwordHash,
      role: a.role,
      status: 'active',
      emailVerified: true,
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(a.name)}&backgroundColor=ea580c&textColor=ffffff`,
    }).returning();
    adminMap[a.email] = u.id;
  }
  console.log(`  ✓ ${accounts.length} admin oluşturuldu`);
  return adminMap;
}

async function seedAgents(): Promise<Record<string, string>> {
  console.log('🏢 Ajanlar oluşturuluyor…');
  const map: Record<string, string> = {};
  const passwordHash = await bcrypt.hash('Agent2026!', 10);
  for (const a of AGENTS) {
    // İlk + son ad ayrımı için boşlukla split — örnek mail: ad@istbaku.com
    const safeEmail = `${a.id}@istbaku.com`;
    const [u] = await db.insert(s.users).values({
      name: a.name,
      email: safeEmail,
      passwordHash,
      role: 'agent',
      status: 'active',
      emailVerified: true,
      avatar: a.avatar,
      bio: a.bio,
      phoneDial: a.phone.split(' ')[0],
      phone: a.phone.split(' ').slice(1).join(''),
      country: a.id.startsWith('a2') || a.id.startsWith('a4') ? 'AZ' : 'TR',
      premium: true,
      kycStatus: a.verified ? 'approved' : 'pending',
    }).returning();
    await db.insert(s.agents).values({
      userId: u.id,
      agency: a.agency,
      rating: a.rating,
      reviewsCount: a.reviewsCount,
      responseMins: a.responseMins,
      performance: a.performance,
      listingsCount: a.listingsCount,
      verified: a.verified,
      whatsappNumber: a.whatsapp,
      languages: a.language as string[],
      memberSince: new Date(a.memberSince),
    });
    map[a.id] = u.id;
  }
  console.log(`  ✓ ${AGENTS.length} ajan oluşturuldu (şifre: Agent2026!)`);
  return map;
}

async function seedListings(agentMap: Record<string, string>) {
  console.log('🏠 İlanlar oluşturuluyor…');
  for (const p of PROPERTIES) {
    const dbAgentId = agentMap[p.agentId];
    await db.insert(s.listings).values({
      slug: p.slug,
      title: p.title,
      description: p.description,
      type: p.type,
      purpose: p.purpose,
      tier: p.tier,
      country: p.country,
      city: p.city,
      district: p.district,
      neighborhood: p.neighborhood,
      address: p.address,
      lat: p.coords.lat,
      lng: p.coords.lng,
      price: p.price,
      currency: p.currency,
      netArea: p.area.net,
      grossArea: p.area.gross,
      rooms: p.rooms,
      bathrooms: p.bathrooms,
      floor: p.floor,
      totalFloors: p.totalFloors,
      buildingAge: p.buildingAge,
      heating: p.heating,
      parking: p.parking,
      balcony: p.balcony,
      furnished: p.furnished,
      elevator: p.elevator,
      pool: p.pool,
      gym: p.gym,
      sauna: p.sauna,
      inSite: p.inSite,
      status: p.status,
      ownerType: p.ownerType,
      titleDeed: p.titleDeed,
      swappable: p.swappable,
      images: p.images,
      video: p.video,
      coverKind: p.cover.kind,
      coverSrc: p.cover.src,
      has360: p.has360,
      scoreTotal: p.score.total,
      scoreRegion: p.score.region,
      scorePrice: p.score.price,
      scoreRentYield: p.score.rentYield,
      scoreDemand: p.score.demand,
      scoreReasoning: p.score.reasoning,
      regionProfile: p.regionProfile,
      nearby: p.nearby as never,
      approvalStatus: 'approved', // seed ilanları yayında — ISTBAKU Onaylı rozeti ayrı
      istbakuApproved: p.istbakuApproved,
      approvalLevel: p.approvalLevel,
      aiVerified: p.aiVerified,
      isPrivate: p.isPrivate,
      views: p.views,
      favoritesCount: p.favorites,
      agentId: dbAgentId,
      publishedAt: new Date(p.publishedAt),
      tags: p.tags ?? [],
    });
  }
  console.log(`  ✓ ${PROPERTIES.length} ilan oluşturuldu`);
}

async function seedGuides() {
  console.log('📕 Ülke rehberleri yükleniyor…');
  for (const g of DEFAULT_GUIDES) {
    await db.insert(s.countryGuides).values({
      iso: g.iso,
      name: g.name,
      flag: g.flag,
      description: g.description,
      pdfUrl: g.pdfUrl,
      pages: g.pages,
      language: g.language,
      updatedAt: new Date(g.updatedAt),
    });
  }
  console.log(`  ✓ ${DEFAULT_GUIDES.length} rehber`);
}

async function seedSampleUser(): Promise<string> {
  console.log('👤 Demo kullanıcı oluşturuluyor…');
  const passwordHash = await bcrypt.hash('Test1234!', 10);
  const [u] = await db.insert(s.users).values({
    name: 'Firudin Mustafayev',
    email: 'firudin@istbaku.com',
    passwordHash,
    phoneDial: '+994',
    phone: '502001212',
    country: 'AZ',
    role: 'user',
    status: 'active',
    emailVerified: true,
    premium: true,
    kycStatus: 'approved',
    avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=Firudin&backgroundColor=f97316&textColor=ffffff',
  }).returning();
  console.log(`  ✓ firudin@istbaku.com / Test1234!`);
  return u.id;
}

async function seedNotifications(userId: string) {
  console.log('🔔 Bildirimler ekleniyor…');
  await db.insert(s.notifications).values([
    {
      userId, type: 'match', title: 'Senin için 3 yeni eşleşme bulundu',
      body: 'Bakı Səbail bölgesinde kayıtlı aramana uygun yeni ilanlar.',
      link: '/dashboard?tab=matches',
    },
    {
      userId, type: 'price_drop', title: 'Favorindeki ilanın fiyatı düştü',
      body: 'Bodrum Yalıkavak villasının fiyatı $1,950,000 → $1,850,000.',
      link: '/property/bodrum-yalikavak-villa',
    },
    {
      userId, type: 'system', title: 'Profilini tamamla, gizli portföyü aç',
      body: 'KYC adımını tamamlayarak doğrulanmış yatırımcı statüsü kazan.',
      link: '/private-portfolio',
      read: true,
    },
  ]);
  console.log('  ✓ 3 bildirim');
}

async function seedAdminDemo(adminMap: Record<string, string>, userId: string) {
  console.log('🛡  Admin demo verisi yükleniyor (KYC + onay + şikayet + ödeme + audit)…');

  // KYC: demo user için bekleyen başvuru
  await db.insert(s.kycRequests).values([
    {
      userId,
      type: 'investor',
      documents: [
        { name: 'Pasaport.pdf', url: '#' },
        { name: 'Banka_dekontu.pdf', url: '#' },
      ],
      status: 'pending',
      aiCheckScore: 87,
      aiCheckNotes: 'OCR başarılı, isim eşleşmesi tamam.',
    },
  ]);

  // Approval queue: birkaç listingi pending yap
  const someListings = await db.select({ id: s.listings.id, agentId: s.listings.agentId }).from(s.listings).limit(3);
  for (const l of someListings) {
    if (!l.agentId) continue;
    await db.insert(s.approvalRequests).values({
      listingId: l.id,
      submittedById: l.agentId,
      type: 'new_listing',
      aiQualityScore: 82 + Math.floor(Math.random() * 15),
      aiFlags: [],
      status: 'pending',
    });
  }

  // Şikayetler
  const targetListings = await db.select({ id: s.listings.id }).from(s.listings).limit(2);
  if (targetListings.length >= 2) {
    await db.insert(s.abuseReports).values([
      {
        reporterId: userId,
        targetType: 'listing',
        targetId: targetListings[0].id,
        reason: 'fake',
        details: 'Fotoğraflar başka bir ilandan alınmış görünüyor.',
        severity: 'high',
        status: 'open',
      },
      {
        reporterId: userId,
        targetType: 'listing',
        targetId: targetListings[1].id,
        reason: 'wrong_info',
        details: 'Bina yaşı yanlış belirtilmiş.',
        severity: 'medium',
        status: 'reviewing',
      },
    ]);
  }

  // Ödemeler
  await db.insert(s.payments).values([
    { userId, amount: 29, currency: 'USD', type: 'tier_upgrade',       status: 'paid', providerRef: 'mock-1' },
    { userId, amount: 199, currency: 'USD', type: 'premium_membership', status: 'paid', providerRef: 'mock-2' },
    { userId, amount: 499, currency: 'USD', type: 'report_purchase',    status: 'paid', providerRef: 'mock-3' },
    { userId, amount: 9,   currency: 'USD', type: 'tier_upgrade',       status: 'refunded', providerRef: 'mock-4' },
  ]);

  // Audit log
  const adminId = adminMap['admin@istbaku.com'];
  if (adminId) {
    await db.insert(s.auditLog).values([
      { actorId: adminId, actorEmail: 'admin@istbaku.com', action: 'Sistem başlatıldı', target: 'seed' },
      { actorId: adminId, actorEmail: 'admin@istbaku.com', action: 'Demo veri yüklendi', target: 'seed-admin-demo' },
    ]);
  }

  console.log('  ✓ 1 KYC, 3 onay kuyruğu, 2 şikayet, 4 ödeme, 2 audit kaydı');
}

async function main() {
  console.log('🌱 ISTBAKU seed başlıyor…\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL eksik. .env.local içine ekle.');
    process.exit(1);
  }

  await clear();
  await seedCountries();
  const adminMap = await seedAdmins();
  const agentMap = await seedAgents();
  await seedListings(agentMap);
  await seedGuides();
  const userId = await seedSampleUser();
  await seedNotifications(userId);
  await seedAdminDemo(adminMap, userId);

  console.log('\n✅ Seed tamamlandı!');
  console.log('\n--- Test Hesapları ---');
  console.log('Kullanıcı:   firudin@istbaku.com / Test1234!');
  console.log('Süper Admin: admin@istbaku.com / Admin2026!');
  console.log('Moderator:   moderator@istbaku.com / Moderator2026!');
  console.log('Demo Admin:  demo@istbaku.com / Demo123!');
  console.log('Ajan:        a1@istbaku.com / Agent2026! (Mehmet Yılmaz)\n');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
