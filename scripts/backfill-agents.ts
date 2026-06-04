/**
 * Backfill: agent/ofis rolündeki kullanıcılar için eksik `agents` profili oluşturur.
 *
 * NEDEN: Eski sign-up akışı "office" kaydında `agents` satırı yaratmıyordu.
 * Tüm agent/ofis sorguları (property AgentCard, admin offices) `agents` tablosuna
 * INNER JOIN attığından bu kullanıcılar HİÇBİR YERDE agent/ofis olarak görünmüyordu.
 * Sign-up artık bu satırı kendisi oluşturuyor; bu script ESKİ kullanıcıları düzeltir.
 *
 * Çalıştır:  npx tsx scripts/backfill-agents.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { db } from '../db/client';
import * as s from '../db/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const missing = await db
    .select({ id: s.users.id, name: s.users.name, email: s.users.email, bio: s.users.bio })
    .from(s.users)
    .leftJoin(s.agents, eq(s.agents.userId, s.users.id))
    .where(sql`${s.users.role} = 'agent' AND ${s.agents.userId} IS NULL`);

  console.log(`Eksik agents profili olan agent/ofis sayısı: ${missing.length}`);
  for (const u of missing) {
    const isOffice = (u.bio ?? '').includes('[office]');
    await db
      .insert(s.agents)
      .values({ userId: u.id, agency: isOffice ? u.name : null })
      .onConflictDoNothing();
    console.log(`  + ${isOffice ? 'OFİS' : 'agent'}: ${u.email} (${u.name})`);
  }
  console.log('Tamamlandı.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('HATA:', e.message); process.exit(1); });
