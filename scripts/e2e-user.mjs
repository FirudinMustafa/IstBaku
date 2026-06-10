/** Gerçek kullanıcı oluştur → DB'den kod al → doğrula → giriş → authenticated sweep. */
import { chromium, devices } from 'playwright';
import postgres from 'postgres';
import { config } from 'dotenv';
import fs from 'fs';
config({ path: '.env.local' });

const BASE = 'https://ist-baku.vercel.app';
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const TS = process.argv[2] || String(Math.floor(Math.parse ? 0 : 0));

function uniq() { return process.env.QA_TS || ('' + Math.floor(Date.now ? 0 : 0)); }

const log = (...a) => console.log(...a);

async function main() {
  const stamp = process.env.STAMP; // dışarıdan verilecek (Date.now yasak)
  const email = `qa${stamp}@example.com`;
  const password = 'QaTest1234';
  const name = 'QA Test Kullanıcı';
  log('TEST EMAIL:', email);

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR@' + page.url().replace(BASE, '') + ': ' + e.message.slice(0, 90)));

  // ---- SIGN UP ----
  await page.goto(`${BASE}/auth/sign-up`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#signup-name', name);
  await page.fill('#signup-email', email);
  await page.fill('#signup-password', password);
  await page.fill('#signup-phone', '5551234567').catch(() => log('  phone alanı bulunamadı'));
  await page.click('[data-testid="role-user"]').catch(() => log('  role-user yok'));
  // terms
  await page.check('#terms').catch(async () => { await page.click('[data-testid="terms-accept"]').catch(() => log('  terms yok')); });
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);

  const afterSignup = await page.locator('body').innerText();
  const onVerify = /#signup-code/.test(await page.content()) || /kodun|code|doğrula/i.test(afterSignup);
  log('SIGNUP sonrası verify adımı:', onVerify ? '✅' : '❌ — ekran: ' + afterSignup.split('\n').filter(Boolean).slice(0, 6).join(' | '));

  // ---- DB'den kod ----
  let code = null;
  for (let i = 0; i < 5 && !code; i++) {
    const rows = await sql`SELECT code FROM email_verification_tokens WHERE lower(email)=lower(${email}) AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`;
    if (rows[0]) code = rows[0].code; else await new Promise(r => setTimeout(r, 1500));
  }
  log('DOĞRULAMA KODU (DB):', code || '❌ BULUNAMADI');

  if (code) {
    await page.fill('#signup-code', code).catch(() => log('  signup-code alanı yok'));
    await page.click('button[type="submit"]').catch(() => {});
    await page.waitForTimeout(3500);
    log('VERIFY sonrası url:', page.url().replace(BASE, ''));
  }

  // ---- SIGN IN ----
  await page.goto(`${BASE}/auth/sign-in`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#signin-email', email).catch(async () => { await page.fill('input[type="email"]', email); });
  await page.fill('#signin-password', password).catch(async () => { await page.fill('input[type="password"]', password); });
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  const cookies = await ctx.cookies();
  const hasSession = cookies.some(c => c.name === 'istbaku-session');
  log('GİRİŞ:', hasSession ? '✅ session cookie var, url=' + page.url().replace(BASE, '') : '❌ session yok, url=' + page.url().replace(BASE, ''));

  if (hasSession) {
    await ctx.storageState({ path: 'e2e-out/qa-state.json' });
    log('  session kaydedildi → e2e-out/qa-state.json');
  }

  // DB'de kullanıcı durumu
  const u = await sql`SELECT id, role, email_verified, status FROM users WHERE lower(email)=lower(${email}) LIMIT 1`;
  log('DB kullanıcı:', u[0] ? `id=${u[0].id.slice(0,8)} rol=${u[0].role} verified=${u[0].email_verified} status=${u[0].status}` : 'YOK');
  if (u[0]) fs.writeFileSync('e2e-out/qa-userid.txt', u[0].id + '\n' + email);

  log('\nPAGEERR:', errors.length ? errors.join('\n  ') : '(yok)');
  await browser.close();
  await sql.end();
}
main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
