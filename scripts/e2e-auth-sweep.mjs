/** Authenticated sweep: kayıtlı user session ile tüm sayfalar + etkileşimler. */
import { chromium } from 'playwright';
const BASE = 'https://ist-baku.vercel.app';
const log = (...a) => console.log(...a);

const PAGES = ['/dashboard', '/become-publisher', '/new-listing', '/messages', '/reports', '/private-portfolio', '/kyc'];

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ storageState: 'e2e-out/qa-state.json' });

  // 1) sayfa sweep — hata + içerik
  for (const path of PAGES) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 70)));
    page.on('console', m => { if (m.type() === 'error') errs.push('con:' + m.text().slice(0, 60)); });
    let finalUrl = '';
    try { await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 }); await page.waitForTimeout(1500); finalUrl = page.url().replace(BASE, ''); }
    catch (e) { errs.push('goto:' + e.message.slice(0, 50)); }
    const txt = (await page.locator('body').innerText().catch(() => '')).split('\n').filter(Boolean).slice(0, 3).join(' | ');
    log(`[${path}] → ${finalUrl}${errs.length ? ' ⚠️ ' + [...new Set(errs)].join('; ') : ' ok'}`);
    log(`     içerik: ${txt.slice(0, 110)}`);
    await page.close();
  }

  // 2) BECOME-PUBLISHER başvuru (M3) — user rolüyle form çıkmalı, gönder
  log('\n--- M3: blog yazıcı başvuru ---');
  const bp = await ctx.newPage();
  await bp.goto(`${BASE}/become-publisher`, { waitUntil: 'networkidle', timeout: 45000 });
  await bp.waitForTimeout(2000);
  const hasForm = await bp.locator('#pub-note').count();
  log('başvuru formu (user için) görünüyor mu:', hasForm ? '✅' : '❌ (' + (await bp.locator('body').innerText()).split('\n').filter(Boolean).slice(0, 4).join(' | ') + ')');
  if (hasForm) {
    await bp.fill('#pub-note', 'QA test başvurusu — emlak içeriği üretmek istiyorum, deneyimliyim.');
    await bp.click('button:has-text("Başvur"), button:has-text("Apply")').catch(() => {});
    await bp.waitForTimeout(3000);
    const after = await bp.locator('body').innerText();
    log('başvuru sonrası:', /inceleniyor|alındı|pending|review/i.test(after) ? '✅ başvuru alındı/pending' : after.split('\n').filter(Boolean).slice(2, 5).join(' | '));
  }
  await bp.close();

  // 3) NEW-LISTING taslak (D6) — birkaç alan doldur, çık, geri gel → taslak sorusu
  log('\n--- D6: taslak sistemi ---');
  const nl = await ctx.newPage();
  await nl.goto(`${BASE}/new-listing`, { waitUntil: 'networkidle', timeout: 45000 });
  await nl.waitForTimeout(2500);
  log('new-listing yüklendi mi:', /yeni ilan|ilan ver|adım|step|başlık|wizard/i.test(await nl.locator('body').innerText()) ? '✅' : '❌');
  // başlık benzeri bir input doldur
  const firstInput = nl.locator('input[type="text"], textarea').first();
  if (await firstInput.count()) { await firstInput.fill('QA taslak testi ' + Math.round(performance.now())).catch(() => {}); await nl.waitForTimeout(2500); }
  // çık ve geri gel
  await nl.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' }); await nl.waitForTimeout(800);
  await nl.goto(`${BASE}/new-listing`, { waitUntil: 'networkidle', timeout: 45000 }); await nl.waitForTimeout(2500);
  const draftPrompt = /taslak|devam et|yeni başla|draft|resume/i.test(await nl.locator('body').innerText());
  log('geri gelince taslak sorusu (D6):', draftPrompt ? '✅ taslak banner görünüyor' : '⚠️ taslak banner yok');
  await nl.close();

  // 4) FAVORİ — bir ilanı favorile, dashboard favorilerde görün
  log('\n--- favori akışı ---');
  const fav = await ctx.newPage();
  await fav.goto(`${BASE}/listings`, { waitUntil: 'networkidle', timeout: 45000 });
  await fav.waitForTimeout(2500);
  const favBtn = fav.locator('[aria-label*="favori" i], button:has(svg.lucide-heart), [data-testid*="favorite"]').first();
  if (await favBtn.count()) { await favBtn.click().catch(() => {}); await fav.waitForTimeout(2000); log('favori butonu tıklandı'); }
  else log('favori butonu bulunamadı (selector)');
  await fav.close();

  await browser.close();
}
main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
