import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.request.post('http://localhost:3000/api/dev/sign-in', {
  data: { email: 'a1@istbaku.com', password: 'Agent2026!' },
});
const page = await ctx.newPage();
await page.goto('http://localhost:3000/messages', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'audit-out/51b-agent-messages-FULL.png', fullPage: true });
console.log('ok full page');
await browser.close();
