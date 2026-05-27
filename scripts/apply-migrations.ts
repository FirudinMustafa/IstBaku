import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

async function main() {
  // Ensure drizzle.__drizzle_migrations exists
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;

  const applied = await sql`SELECT hash FROM drizzle.__drizzle_migrations`;
  const appliedHashes = new Set(applied.map(r => r.hash as string));

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    if (appliedHashes.has(hash)) {
      console.log(`[skip] ${file} (already applied)`);
      continue;
    }

    // For 0000_keen_unicorn.sql and 0001/0002 (existing manual ones), the schema is already in place.
    // Try to apply; statements that conflict (already exists) will fail unless they're IF NOT EXISTS.
    // For safety, we only auto-apply 0003 and 0004 here.
    const isNewMigration = file.startsWith('0003') || file.startsWith('0004');
    if (!isNewMigration) {
      console.log(`[skip] ${file} (existing infrastructure; not re-applying)`);
      // Record hash so drizzle doesn't try later
      await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${Date.now()})`;
      continue;
    }

    console.log(`[apply] ${file}`);
    // Run as a single unprepared statement (split by statement-breakpoint if needed; otherwise raw)
    const statements = content.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
    try {
      if (statements.length > 1) {
        for (const stmt of statements) {
          await sql.unsafe(stmt);
        }
      } else {
        await sql.unsafe(content);
      }
      await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${Date.now()})`;
      console.log(`  ✓ applied`);
    } catch (e: any) {
      console.error(`  ✗ FAILED: ${e.message}`);
      throw e;
    }
  }

  console.log('\nDone.');
  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
