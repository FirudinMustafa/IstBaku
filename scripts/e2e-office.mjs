/** Office/agent kaydı (M5): ofis alanları + belge → agents tablosu doğrulama. */
import { chromium } from 'playwright';
import postgres from 'postgres';
import { config } from 'dotenv';
import fs from 'fs';
config({ path: '.env.local' });
const BASE = 'https://ist-baku.vercel.app';
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const log = (...a) => console.log(...a);

async function main() {
  const stamp = process.env.STAMP;
  const email = `qaoffice${stamp}@example.com`;
  const password = 'QaOffice1234';
  log('OFFICE EMAIL:', email);
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 80)));

  await page.goto(`${BASE}/auth/sign-up`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#signup-name', 'QA Ofis Sahibi');
  await page.fill('#signup-email', email);
  await page.fill('#signup-password', password);
  await page.fill('#signup-phone', '5559876543').catch(() => {});
  // office rolü seç
  const roleOk = await page.click('[data-testid="role-office"]').then(() => true).catch(() => false);
  log('role-office seçildi:', roleOk);
  await page.waitForTimeout(1200);
  // ofis alanları çıktı mı
  const officeFieldCount = await page.locator('#office-company, #office-national-id, #office-tax-id, #office-city').count();
  log('ofis alanları görünüyor mu:', officeFieldCount >= 3 ? `✅ (${officeFieldCount})` : `❌ (${officeFieldCount})`);
  await page.selectOption('#office-country', 'TR').catch(() => log('  office-country seçilemedi'));
  await page.fill('#office-company', 'QA Emlak Ofisi Ltd').catch(() => {});
  await page.fill('#office-national-id', '12345678901').catch(() => {});
  await page.fill('#office-tax-id', '9876543210').catch(() => {});
  await page.fill('#office-city', 'İstanbul').catch(() => {});
  await page.fill('#office-district', 'Kadıköy').catch(() => {});
  await page.fill('#office-address', 'Test Mah. QA Sok. No:1').catch(() => {});
  // belge yükle (küçük bir png üret)
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f7c0000000049454e44ae426082', 'hex');
  fs.writeFileSync('e2e-out/qa-doc.png', png);
  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count()) { await fileInput.setInputFiles('e2e-out/qa-doc.png').catch(() => {}); await page.waitForTimeout(3000); log('belge yüklendi (dene)'); }
  await page.check('#terms').catch(async () => { await page.click('[data-testid="terms-accept"]').catch(() => {}); });
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  const onVerify = /#signup-code/.test(await page.content());
  log('signup→verify:', onVerify ? '✅' : '❌ ' + (await page.locator('body').innerText()).split('\n').filter(Boolean).slice(0, 5).join(' | '));

  // kod + verify
  let code = null;
  for (let i = 0; i < 5 && !code; i++) { const r = await sql`SELECT code FROM email_verification_tokens WHERE lower(email)=lower(${email}) AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`; if (r[0]) code = r[0].code; else await new Promise(z => setTimeout(z, 1500)); }
  if (code) { await page.fill('#signup-code', code); await page.click('button[type="submit"]'); await page.waitForTimeout(3000); }

  // DB doğrulama: users + agents
  const u = await sql`SELECT id, role, bio, country FROM users WHERE lower(email)=lower(${email}) LIMIT 1`;
  log('users:', u[0] ? `rol=${u[0].role} bio=${u[0].bio} country=${u[0].country}` : 'YOK');
  if (u[0]) {
    const a = await sql`SELECT company_name, national_id, tax_id, office_city, office_district, office_address, office_country, jsonb_array_length(coalesce(office_docs,'[]'::jsonb)) docs FROM agents WHERE user_id=${u[0].id} LIMIT 1`;
    log('agents:', a[0] ? `şirket=${a[0].company_name} tc=${a[0].national_id} vkn=${a[0].tax_id} il=${a[0].office_city} ilçe=${a[0].office_district} ülke=${a[0].office_country} belge=${a[0].docs}` : '❌ agent profili YOK');
    fs.writeFileSync('e2e-out/qa-office.txt', u[0].id + '\n' + email);
  }
  log('PAGEERR:', errs.length ? [...new Set(errs)].join('; ') : '(yok)');
  await browser.close(); await sql.end();
}
main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
