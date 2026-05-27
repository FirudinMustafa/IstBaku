// Gerçek tarayıcı gezintisi: sayfa sayfa screenshot + console + network log
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'http://localhost:3000';
const OUT_DIR = path.resolve('audit-out');
const EMAIL = `audit-${Date.now()}@maildrop.cc`;
const NAME = 'Audit Tester';
const PASSWORD = 'AuditPass1234!';

const issues = [];
const reports = [];

function recordIssue(page, severity, msg) {
  issues.push({ page, severity, msg });
  console.log(`  [${severity.toUpperCase()}] ${msg}`);
}

async function shot(page, label) {
  const file = path.join(OUT_DIR, `${label}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false, animations: 'disabled', timeout: 8000 });
  } catch (e) {
    console.warn(`  ! screenshot fail ${label}: ${e.message}`);
  }
  return file;
}

async function visit(browser, label, url, { auth = null } = {}) {
  const consoleErrors = [];
  const networkFails = [];
  const pageErrors = [];

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (auth) await ctx.addCookies(auth);
  const page = await ctx.newPage();

  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      const text = m.text();
      // Tipik gürültüleri filtrele
      if (text.includes('DevTools') || text.includes('favicon')) return;
      consoleErrors.push({ type: m.type(), text });
    }
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('response', (r) => {
    if (r.status() >= 400) {
      networkFails.push(`${r.status()} ${r.url()}`);
    }
  });

  let nav;
  try {
    nav = await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 20000 });
  } catch (e) {
    recordIssue(label, 'high', `Sayfa yüklenemedi: ${e.message}`);
    await ctx.close();
    return null;
  }

  // Settle animations
  await page.waitForTimeout(800);
  const file = await shot(page, label);
  const title = await page.title();

  if (nav && nav.status() >= 400) recordIssue(label, 'high', `HTTP ${nav.status()} ${url}`);
  for (const e of pageErrors) recordIssue(label, 'high', `JS hata: ${e}`);
  for (const c of consoleErrors) recordIssue(label, c.type === 'error' ? 'med' : 'low', `Console ${c.type}: ${c.text.slice(0, 200)}`);
  for (const n of networkFails) recordIssue(label, 'med', `Network: ${n.slice(0, 160)}`);

  // Görsel sağlık: yatay overflow var mı?
  const overflow = await page.evaluate(() => {
    const w = document.documentElement.scrollWidth;
    const cw = document.documentElement.clientWidth;
    return { scrollWidth: w, clientWidth: cw, hasOverflow: w > cw + 2 };
  });
  if (overflow.hasOverflow) recordIssue(label, 'med', `Yatay overflow: ${overflow.scrollWidth - overflow.clientWidth}px`);

  // Boş sayfa kontrolü
  const bodyText = await page.evaluate(() => document.body.innerText.trim());
  if (bodyText.length < 60) recordIssue(label, 'high', `Sayfa neredeyse boş (${bodyText.length} char)`);

  // Buton sağlık: onClick yok ama tıklanabilir görünen
  const dummyButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button:not([disabled])'));
    return btns
      .filter((b) => !b.onclick && !b.closest('form') && !b.getAttribute('data-noclick'))
      .filter((b) => {
        // React: onClick bind'i element üzerinde değil — bu kontrol yetersiz olabilir, sadece info
        const has = b.dataset.testid || b.getAttribute('aria-label');
        return false; // disable noise
      })
      .map((b) => b.innerText.trim().slice(0, 30))
      .slice(0, 3);
  });

  reports.push({ label, url, title, file, consoleErrors: consoleErrors.length, pageErrors: pageErrors.length, networkFails: networkFails.length, overflow });
  console.log(`✓ ${label.padEnd(28)} title="${title.slice(0, 50)}" overflow=${overflow.hasOverflow} c-err=${consoleErrors.length} js-err=${pageErrors.length} net=${networkFails.length}`);

  return { ctx, page, file };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ channel: 'chromium', args: ['--disable-dev-shm-usage'] });

  // ---- Anonim gezinti ----
  console.log('\n=== Anonim sayfalar ===');
  await visit(browser, '01-home', '/').then((r) => r?.ctx.close());
  await visit(browser, '02-listings', '/listings').then((r) => r?.ctx.close());
  await visit(browser, '03-listings-filter', '/listings?city=İstanbul&purpose=sale').then((r) => r?.ctx.close());
  await visit(browser, '04-property-detail', '/property/besiktas-bogaz-manzarali-luks-konut').then((r) => r?.ctx.close());
  await visit(browser, '05-ai-match', '/ai-match').then((r) => r?.ctx.close());
  await visit(browser, '06-private-portfolio', '/private-portfolio').then((r) => r?.ctx.close());
  await visit(browser, '07-reports', '/reports').then((r) => r?.ctx.close());
  await visit(browser, '08-legal-guide', '/legal-guide').then((r) => r?.ctx.close());
  await visit(browser, '09-compare-empty', '/compare').then((r) => r?.ctx.close());
  await visit(browser, '10-sign-in', '/auth/sign-in').then((r) => r?.ctx.close());
  await visit(browser, '11-sign-up', '/auth/sign-up').then((r) => r?.ctx.close());
  await visit(browser, '12-forgot-password', '/auth/forgot-password').then((r) => r?.ctx.close());
  await visit(browser, '13-admin-login', '/admin/login').then((r) => r?.ctx.close());

  // ---- Sign-up flow (manuel form doldurma) ----
  console.log('\n=== Sign-up form akışı ===');
  let ctx, page;
  try {
    ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text().slice(0, 200)}`); });

    await page.goto(`${BASE}/auth/sign-up`, { waitUntil: 'networkidle' });
    // Inputlara dolduralım
    await page.fill('input[placeholder*="Firudin"], input[placeholder*="Adınız"], input[placeholder*="Ad Soyad"]', NAME).catch(async () => {
      // Fallback: ilk text input
      const inputs = await page.locator('input[type="text"], input:not([type])').all();
      if (inputs[0]) await inputs[0].fill(NAME);
    });
    await page.fill('input[type="email"]', EMAIL);
    // Telefon
    const phoneInputs = await page.locator('input').all();
    for (const inp of phoneInputs) {
      const ph = await inp.getAttribute('placeholder');
      if (ph && /5/.test(ph)) { await inp.fill('5559876543'); break; }
    }
    // Password
    await page.fill('input[type="password"]', PASSWORD);
    // Checkbox tıkla
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.count()) await checkbox.check();

    await shot(page, '20-signup-filled');

    // Submit
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2500);
    await shot(page, '21-signup-verify-screen');
    const verifyTxt = await page.evaluate(() => document.body.innerText);

    // Beklediğimiz: "6 haneli kod" yazısı
    if (!verifyTxt.includes('6 haneli') && !verifyTxt.includes('Doğrulama Kodu')) {
      recordIssue('signup-flow', 'high', 'Verify ekranı kod input içermiyor.');
    }
    // OLMAMASI gerekenler:
    if (verifyTxt.includes('Mail birkaç dakika')) recordIssue('signup-flow', 'med', '"Mail birkaç dakika içinde gelmezse" metni hâlâ var');
    if (verifyTxt.includes('Maili Tekrar Gönder')) recordIssue('signup-flow', 'med', '"Maili Tekrar Gönder" butonu hâlâ var');
    if (verifyTxt.includes('Panele Geç')) recordIssue('signup-flow', 'med', '"Panele Geç" butonu hâlâ var');
    if (verifyTxt.includes('Bilgileri düzenle')) recordIssue('signup-flow', 'med', '"Bilgileri düzenle" linki hâlâ var');

    for (const e of errs) recordIssue('signup-flow', 'high', e);
    console.log('✓ Sign-up form akışı tamamlandı.');
  } catch (e) {
    recordIssue('signup-flow', 'high', `Akış kırıldı: ${e.message}`);
  } finally {
    await ctx?.close();
  }

  // ---- Auth'lu: seed admin ile login + admin paneli gezisi ----
  console.log('\n=== Admin oturum gezintisi ===');
  try {
    // Playwright request context: Set-Cookie'leri otomatik tutar
    const reqCtx = await browser.newContext();
    const apiResp = await reqCtx.request.post(`${BASE}/api/dev/sign-in`, {
      data: { email: 'admin@istbaku.com', password: 'Admin2026!', admin: true },
    });
    const cookies = await reqCtx.cookies();
    if (cookies.length === 0) {
      recordIssue('admin-auth', 'high', `Admin cookie alınamadı (status ${apiResp.status()})`);
    } else {
      const auth = cookies;
      for (const [label, url] of [
        ['30-admin-overview', '/admin'],
        ['31-admin-approvals', '/admin/approvals'],
        ['32-admin-users', '/admin/users'],
        ['33-admin-agents', '/admin/agents'],
        ['34-admin-kyc', '/admin/kyc'],
        ['35-admin-payments', '/admin/payments'],
        ['36-admin-analytics', '/admin/analytics'],
        ['37-admin-reports', '/admin/reports'],
        ['38-admin-audit', '/admin/audit'],
        ['39-admin-country-guides', '/admin/country-guides'],
      ]) {
        await visit(browser, label, url, { auth }).then((r) => r?.ctx.close());
      }
    }
  } catch (e) {
    recordIssue('admin-auth', 'high', `Admin akışı kırıldı: ${e.message}`);
  }

  // ---- Agent oturumu ----
  console.log('\n=== Agent oturum gezintisi ===');
  try {
    const reqCtx = await browser.newContext();
    const apiResp = await reqCtx.request.post(`${BASE}/api/dev/sign-in`, {
      data: { email: 'a1@istbaku.com', password: 'Agent2026!' },
    });
    const cookies = await reqCtx.cookies();
    if (cookies.length > 0) {
      const auth = cookies;
      for (const [label, url] of [
        ['50-agent-dashboard', '/dashboard'],
        ['51-agent-messages', '/messages'],
        ['52-agent-crm', '/agent'],
        ['53-agent-new-listing', '/new-listing'],
      ]) {
        await visit(browser, label, url, { auth }).then((r) => r?.ctx.close());
      }
    } else {
      recordIssue('agent-auth', 'high', `Agent cookie alınamadı (status ${apiResp.status()})`);
    }
  } catch (e) {
    recordIssue('agent-auth', 'high', `Agent akışı kırıldı: ${e.message}`);
  }

  // ---- Mobil viewport ----
  console.log('\n=== Mobil viewport (iPhone) ===');
  for (const [label, url] of [
    ['70-mobile-home', '/'],
    ['71-mobile-listings', '/listings'],
    ['72-mobile-property', '/property/besiktas-bogaz-manzarali-luks-konut'],
    ['73-mobile-sign-up', '/auth/sign-up'],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text().slice(0, 200)}`); });
    try {
      await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(600);
      const overflow = await page.evaluate(() => {
        const w = document.documentElement.scrollWidth;
        return { scrollWidth: w, clientWidth: document.documentElement.clientWidth, hasOverflow: w > document.documentElement.clientWidth + 2 };
      });
      if (overflow.hasOverflow) recordIssue(label, 'med', `Yatay overflow: ${overflow.scrollWidth - overflow.clientWidth}px`);
      for (const e of errs) recordIssue(label, 'high', e);
      await shot(page, label);
      console.log(`✓ ${label} overflow=${overflow.hasOverflow}`);
    } catch (e) {
      recordIssue(label, 'high', `Mobil yüklenemedi: ${e.message}`);
    } finally {
      await ctx.close();
    }
  }

  await browser.close();

  console.log('\n\n========================================');
  console.log(`ÖZET: ${issues.length} bulgular`);
  console.log('========================================');
  const bySev = issues.reduce((a, i) => { (a[i.severity] = a[i.severity] || []).push(i); return a; }, {});
  for (const sev of ['high', 'med', 'low']) {
    if (!bySev[sev]?.length) continue;
    console.log(`\n--- ${sev.toUpperCase()} (${bySev[sev].length}) ---`);
    for (const i of bySev[sev]) console.log(`  [${i.page}] ${i.msg}`);
  }

  await writeFile(path.join(OUT_DIR, 'report.json'), JSON.stringify({ reports, issues }, null, 2));
  console.log(`\n→ Tüm screenshotlar: ${OUT_DIR}\\`);
}

main().catch((e) => { console.error(e); process.exit(1); });
