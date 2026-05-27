import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chromium' });
// Auth as agent
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.request.post('http://localhost:3000/api/dev/sign-in', {
  data: { email: 'a1@istbaku.com', password: 'Agent2026!' },
});
const page = await ctx.newPage();
page.on('console', (m) => console.log(`[${m.type()}]`, m.text().slice(0, 250)));
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:3000/messages', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Get DOM info
const info = await page.evaluate(() => {
  const h1 = document.querySelector('h1')?.innerText;
  const empty = document.querySelector('p')?.innerText;
  // Find thread items
  const buttons = Array.from(document.querySelectorAll('button')).map((b) => b.innerText.trim()).filter(Boolean).slice(0, 10);
  const allText = document.body.innerText.slice(0, 800);
  return { h1, empty, buttons, allText };
});
console.log('\n=== H1:', info.h1);
console.log('=== First paragraph:', info.empty);
console.log('=== Buttons:', info.buttons);
console.log('=== Body text (ilk 800):');
console.log(info.allText);
await browser.close();
