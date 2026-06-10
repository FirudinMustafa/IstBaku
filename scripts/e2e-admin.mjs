/** Admin sweep: QA(super_admin) /admin/login → tüm admin sayfaları + kritik aksiyonlar. */
import { chromium } from 'playwright';
import postgres from 'postgres';
import { config } from 'dotenv';
import fs from 'fs';
config({ path: '.env.local' });
const BASE = 'https://ist-baku.vercel.app';
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const log = (...a) => console.log(...a);

const ADMIN_PAGES = ['/admin', '/admin/listings', '/admin/approvals', '/admin/reviews', '/admin/kyc', '/admin/publishers', '/admin/pricing', '/admin/users', '/admin/offices', '/admin/agents', '/admin/payments', '/admin/blog', '/admin/cross-border', '/admin/country-guides', '/admin/analytics', '/admin/audit', '/admin/reports', '/admin/rpa-reports'];

async function main() {
  const email = fs.readFileSync('e2e-out/qa-userid.txt', 'utf8').split('\n')[1].trim();
  const password = 'QaTest1234';
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // ADMIN LOGIN
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('input[type="email"]', email).catch(async () => { await page.fill('#admin-email', email); });
  await page.fill('input[type="password"]', password).catch(async () => { await page.fill('#admin-password', password); });
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  const cookies = await ctx.cookies();
  log('ADMIN GİRİŞ:', cookies.some(c => c.name === 'istbaku-session') ? '✅ url=' + page.url().replace(BASE, '') : '❌ url=' + page.url().replace(BASE, ''));

  // SAYFA SWEEP
  log('\n--- admin sayfa sweep ---');
  for (const p of ADMIN_PAGES) {
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', e => errs.push(e.message.slice(0, 60)));
    pg.on('console', m => { if (m.type() === 'error') errs.push('con:' + m.text().slice(0, 50)); });
    let url = '';
    try { await pg.goto(`${BASE}${p}`, { waitUntil: 'networkidle', timeout: 40000 }); await pg.waitForTimeout(1200); url = pg.url().replace(BASE, ''); } catch (e) { errs.push('goto'); }
    const redirected = url && !url.startsWith(p);
    log(`[${p}] → ${url}${redirected ? ' ⚠️REDIRECT' : ''}${errs.length ? ' ⚠️ ' + [...new Set(errs)].join(';') : ' ok'}`);
    await pg.close();
  }

  // AKSIYON 1: review moderasyon (eğer bekleyen varsa)
  log('\n--- review moderasyon (fix doğrula) ---');
  const rp = await ctx.newPage();
  await rp.goto(`${BASE}/admin/reviews`, { waitUntil: 'networkidle', timeout: 40000 });
  await rp.waitForTimeout(1500);
  const approveBtn = rp.locator('button:has-text("Onayla"), button:has-text("Approve")').first();
  if (await approveBtn.count()) {
    await approveBtn.click().catch(() => {});
    await rp.waitForTimeout(2500);
    const body = await rp.locator('body').innerText();
    log('review onay:', /yetkin yok|yetkiniz yok/i.test(body) ? '❌ HÂLÂ yetki hatası' : '✅ yetki hatası yok');
  } else log('review onay: bekleyen yorum yok (test edilemedi; fix mantıksal)');
  await rp.close();

  // AKSIYON 2: pricing kaydet (F2)
  log('\n--- pricing kaydet (F2) ---');
  const pp = await ctx.newPage();
  await pp.goto(`${BASE}/admin/pricing`, { waitUntil: 'networkidle', timeout: 40000 });
  await pp.waitForTimeout(1500);
  const saveBtn = pp.locator('button:has-text("Kaydet"), button:has-text("Save")').first();
  if (await saveBtn.count()) { await saveBtn.click().catch(() => {}); await pp.waitForTimeout(2500); const b = await pp.locator('body').innerText(); log('pricing kaydet:', /yetki/i.test(b) ? '❌ yetki hatası' : '✅ yetki hatası yok'); }
  else log('pricing: kaydet butonu yok');
  await pp.close();

  // AKSIYON 3: watermark backfill (A1)
  log('\n--- watermark backfill (A1) ---');
  const wp = await ctx.newPage();
  await wp.goto(`${BASE}/admin/listings`, { waitUntil: 'networkidle', timeout: 40000 });
  await wp.waitForTimeout(1500);
  const wmBtn = wp.locator('button:has-text("damgala"), button:has-text("watermark"), button:has-text("Damgala")').first();
  if (await wmBtn.count()) { log('watermark butonu bulundu ✅ (tıklanıyor)'); await wmBtn.click().catch(() => {}); await wp.waitForTimeout(6000); const b = await wp.locator('body').innerText(); log('  sonuç:', /yetki/i.test(b) ? '❌ yetki' : (/damgalandı|tamam|işlendi|güncellendi/i.test(b) ? '✅ çalıştı' : 'belirsiz (hata yok)')); }
  else log('watermark butonu bulunamadı');
  await wp.close();

  // AKSIYON 4: publisher başvuru onayı (M3) — EN SON (QA'yı blog_publisher yapar)
  log('\n--- publisher başvuru onayı (M3) ---');
  const bp = await ctx.newPage();
  await bp.goto(`${BASE}/admin/publishers`, { waitUntil: 'networkidle', timeout: 40000 });
  await bp.waitForTimeout(1500);
  const bbody = await bp.locator('body').innerText();
  log('bekleyen başvuru görünüyor mu:', /bekleyen başvuru|QA Test/i.test(bbody) ? '✅' : '⚠️ görünmüyor');
  await bp.close();

  await browser.close();
  await sql.end();
}
main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
