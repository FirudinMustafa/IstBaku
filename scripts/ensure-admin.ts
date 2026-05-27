/**
 * PB-02 — ensure-admin.ts
 *
 * Upserts the seed super-admin row from environment variables so the admin
 * console can be reached without running a full destructive seed.
 *
 * Idempotent: existing row (matched by lowercased email) is updated with the
 * new bcrypt hash + name + role + verified flag; missing row is inserted.
 *
 * Required env (typically in `.env.local`):
 *   SUPER_ADMIN_EMAIL     e.g. admin@istbaku.test
 *   SUPER_ADMIN_PASSWORD  e.g. Admin2026!QA
 * Optional env:
 *   SUPER_ADMIN_NAME      default: 'Süper Admin'
 *
 * Run with: `npx tsx scripts/ensure-admin.ts`  (or via your existing tsx runner)
 */
/* eslint-disable no-console */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import * as s from '../db/schema';
import { getSeedAdminAccounts } from '../lib/admin-auth';

async function main(): Promise<void> {
  const accounts = getSeedAdminAccounts();
  if (accounts.length === 0) {
    console.error(
      '✗ SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set. Add them to .env.local and retry.',
    );
    process.exit(1);
  }

  for (const a of accounts) {
    const email = a.email.toLowerCase();
    const passwordHash = await bcrypt.hash(a.password, 12); // MH-03: bcrypt cost 12.

    const [existing] = await db
      .select({ id: s.users.id, role: s.users.role })
      .from(s.users)
      .where(sql`lower(${s.users.email}) = ${email}`)
      .limit(1);

    if (existing) {
      await db
        .update(s.users)
        .set({
          name: a.name,
          passwordHash,
          role: a.role,
          status: 'active',
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(sql`${s.users.id} = ${existing.id}`);
      console.log(`✓ updated admin: ${email} (role=${a.role})`);
    } else {
      await db.insert(s.users).values({
        name: a.name,
        email,
        passwordHash,
        role: a.role,
        status: 'active',
        emailVerified: true,
        avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(a.name)}&backgroundColor=ea580c&textColor=ffffff`,
      });
      console.log(`✓ inserted admin: ${email} (role=${a.role})`);
    }
  }

  console.log('Done. You can now sign in at /admin/login.');
}

main().catch((err) => {
  console.error('ensure-admin failed:', err);
  process.exit(1);
});
