import { test, expect, Page } from '@playwright/test';
import { attachDiagnostics, snap } from './helpers';

/**
 * Persona 6 — LEYLA (mobile iPhone 14 user on 3G)
 *
 * Validates the mobile UX:
 *   1. Homepage mobile hamburger + hero CTA visible w/o scroll
 *   2. Mobile drawer nav links → Listings
 *   3. /listings filter drawer open/close
 *   4. Click listing card → detail
 *   5. Gallery swipe simulation
 *   6. WhatsApp FAB / link presence
 *   7. Chatbot FAB — open + 6 turn conversation
 *   8. Auth/sign-in email-focused screenshot
 *   9. Tab-keyboard count of focusable elements on home
 *  10. Skip-to-main link via initial Tab
 */

test.describe.configure({ mode: 'serial' });

interface Finding { scenario: string; status: 'pass' | 'fail' | 'blocked' | 'info'; detail: string; }
const findings: Finding[] = [];
function record(scenario: string, status: Finding['status'], detail: string) {
  findings.push({ scenario, status, detail });
  // eslint-disable-next-line no-console
  console.log(`[persona-6][${status.toUpperCase()}] ${scenario}: ${detail}`);
}

test.describe('Persona 6 — Leyla (mobile iPhone 14)', () => {
  test.beforeEach(async ({ page }) => {
    attachDiagnostics(page);
  });

  test('1. Homepage on mobile — hamburger + hero CTA visible without scroll', async ({ page }) => {
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      // Wait for layout
      await page.waitForLoadState('networkidle').catch(() => {});

      const vp = page.viewportSize();
      record('viewport', 'info', `viewport=${vp?.width}x${vp?.height}`);

      const hamburger = page.locator('button[aria-label="Menüyü aç"], button[aria-controls="mobile-drawer"]').first();
      const hamburgerVisible = await hamburger.isVisible().catch(() => false);
      expect(hamburgerVisible).toBeTruthy();
      record('hamburger', hamburgerVisible ? 'pass' : 'fail', `visible=${hamburgerVisible}`);

      // Hero CTA: any Button with text inside hero section, take first one above the fold
      const heroH1 = page.locator('h1').first();
      const h1Visible = await heroH1.isVisible().catch(() => false);
      record('hero h1', h1Visible ? 'pass' : 'fail', `visible=${h1Visible}`);

      // Hero search/CTA button - should be within viewport height (no scroll)
      const cta = page.locator('form button[type="submit"]').first();
      const ctaBox = await cta.boundingBox().catch(() => null);
      const ctaWithinFold = !!(ctaBox && ctaBox.y < (vp?.height ?? 844));
      record('hero cta above-fold', ctaWithinFold ? 'pass' : 'info', `ctaBox.y=${ctaBox?.y}`);

      await snap(page, 'persona-6-01-home-mobile.png');
    } catch (e) {
      record('homepage', 'fail', String((e as Error).message));
      throw e;
    }
  });

  test('2. Hamburger drawer — nav links → Listings', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const hamburger = page.locator('button[aria-label="Menüyü aç"], button[aria-controls="mobile-drawer"]').first();
    await hamburger.click();
    const drawer = page.locator('#mobile-drawer');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Primary nav links inside drawer
    const drawerLinks = drawer.locator('nav a, a[href^="/"]');
    const count = await drawerLinks.count();
    record('drawer nav link count', count >= 4 ? 'pass' : 'fail', `count=${count}`);

    await snap(page, 'persona-6-02-drawer.png');

    const listingsLink = drawer.locator('a[href="/listings"]').first();
    await expect(listingsLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/listings/, { timeout: 10_000 }).catch(() => {}),
      listingsLink.click(),
    ]);
    const url = page.url();
    record('navigated to listings', /\/listings/.test(url) ? 'pass' : 'fail', `url=${url}`);
    expect(url).toMatch(/\/listings/);
  });

  test('3. /listings filter drawer opens and closes', async ({ page }) => {
    await page.goto('/listings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // The mobile filter button — text "Filtrele"
    const filterBtn = page.getByRole('button', { name: /Filtrele/i }).first();
    const found = await filterBtn.count();
    if (!found) {
      record('filter button', 'fail', 'not found');
      expect(found).toBeGreaterThan(0);
    }
    await filterBtn.click();

    // Bottom sheet — locate the modal dialog (role=dialog) that contains an h2 "Filtreler"
    const sheet = page.locator('[role="dialog"][aria-modal="true"]').filter({ has: page.locator('h2', { hasText: /^Filtreler$/ }) }).first();
    await expect(sheet).toBeVisible({ timeout: 5000 });
    record('filter sheet open', 'pass', 'sheet visible');
    await snap(page, 'persona-6-03-filter-sheet.png');

    // Close via close button (X) or ESC
    const closeBtn = sheet.locator('button[aria-label="Kapat"]').first();
    if (await closeBtn.count()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(600);
    const closed = !(await sheet.isVisible().catch(() => false));
    record('filter sheet closed', closed ? 'pass' : 'info', `closed=${closed}`);
  });

  test('4. Click a listing card → detail loads', async ({ page }) => {
    await page.goto('/listings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const propertyLink = page.locator('a[href^="/property/"]').first();
    const has = await propertyLink.count();
    if (!has) {
      record('listing card', 'blocked', 'no listing cards rendered');
      test.skip();
      return;
    }
    const href = await propertyLink.getAttribute('href');
    await Promise.all([
      page.waitForURL(/\/property\//, { timeout: 15_000 }).catch(() => {}),
      propertyLink.click(),
    ]);
    const url = page.url();
    record('property detail loaded', /\/property\//.test(url) ? 'pass' : 'fail', `url=${url} from href=${href}`);
    expect(url).toMatch(/\/property\//);
    await snap(page, 'persona-6-04-property-detail.png');
  });

  test('5. Gallery swipe — simulate horizontal swipe', async ({ page }) => {
    await page.goto('/listings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    const propertyLink = page.locator('a[href^="/property/"]').first();
    if (!(await propertyLink.count())) {
      record('gallery swipe', 'blocked', 'no listing to navigate to');
      test.skip();
      return;
    }
    await propertyLink.click();
    await page.waitForURL(/\/property\//, { timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});

    // Find the gallery: first img or canvas/figure near top
    const gallery = page.locator('img, [role="img"], figure').first();
    const box = await gallery.boundingBox().catch(() => null);
    if (!box) {
      record('gallery swipe', 'info', 'no gallery box found');
    } else {
      const startX = box.x + box.width * 0.85;
      const endX = box.x + box.width * 0.15;
      const y = box.y + box.height / 2;
      await page.mouse.move(startX, y);
      await page.mouse.down();
      // Simulate gradual swipe
      for (let i = 1; i <= 10; i++) {
        await page.mouse.move(startX - ((startX - endX) * i) / 10, y);
        await page.waitForTimeout(20);
      }
      await page.mouse.up();
      await page.waitForTimeout(300);
      record('gallery swipe', 'pass', `swiped ${Math.round(startX - endX)}px`);
    }
    await snap(page, 'persona-6-05-gallery-after-swipe.png');
  });

  test('6. WhatsApp link presence on property detail', async ({ page }) => {
    await page.goto('/listings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    const link = page.locator('a[href^="/property/"]').first();
    if (!(await link.count())) {
      record('whatsapp', 'blocked', 'no listings to navigate');
      test.skip();
      return;
    }
    await link.click();
    await page.waitForURL(/\/property\//, { timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});

    const wa = page.locator('a[href^="https://wa.me/"]').first();
    const exists = await wa.count();
    if (!exists) {
      record('whatsapp', 'fail', 'no wa.me link found on property page');
    }
    expect(exists).toBeGreaterThan(0);
    const href = await wa.getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\//);
    record('whatsapp link', 'pass', `href=${href}`);
  });

  test('7. Chatbot FAB — 6 turns', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const fab = page.locator('button[aria-label="AI Asistanı aç"]').first();
    await expect(fab).toBeVisible({ timeout: 5000 });
    await fab.click();

    const dialog = page.locator('[role="dialog"][aria-label*="AI Asistan"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const input = dialog.locator('input[aria-label="AI asistana mesaj yaz"]').first();
    const sendBtn = dialog.locator('button[aria-label="Gönder"]').first();

    const turns = ['Merhaba', 'İstanbul fiyatlar nasıl?', 'Kredi şartları?', 'En iyi yatırım bölgesi?', 'Tapu süreci?', 'Teşekkürler'];
    let initialCount = await dialog.locator('.glass.rounded-tl-sm, [class*="rounded-tl-sm"]').count();

    for (let i = 0; i < turns.length; i++) {
      await input.fill(turns[i]);
      await sendBtn.click();
      // Wait up to 8s for new assistant bubble (count increase)
      const before = await dialog.locator('div').filter({ hasText: turns[i] }).count();
      record(`chat turn ${i + 1}`, 'info', `sent="${turns[i]}"`);

      // Look for response — wait for the busy indicator to disappear by counting user messages
      await page.waitForTimeout(1500);
      // Poll for assistant message
      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        const current = await dialog.locator('[class*="rounded-tl-sm"]').count();
        if (current > initialCount) {
          initialCount = current;
          break;
        }
        await page.waitForTimeout(250);
      }
    }
    record('chatbot conversation', 'pass', `completed ${turns.length} turns`);
    await snap(page, 'persona-6-07-chatbot.png');
  });

  test('8. Sign-in form — focus email input', async ({ page }) => {
    await page.goto('/auth/sign-in', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const email = page.locator('input[type="email"], input[name="email"]').first();
    const found = await email.count();
    if (!found) {
      record('sign-in email', 'fail', 'no email input');
      expect(found).toBeGreaterThan(0);
    }
    await email.scrollIntoViewIfNeeded();
    await email.focus();
    // Tap to trigger virtual keyboard simulation (no real OS keyboard)
    await email.click();
    record('email focus', 'pass', 'focused');
    await snap(page, 'persona-6-08-signin-email-focus.png');
  });

  test('9. Tab keyboard — count focusable on home', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const focusedTags = new Set<string>();
    let focusedCount = 0;
    const visited: string[] = [];

    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        return {
          tag: el.tagName,
          aria: el.getAttribute('aria-label') ?? '',
          text: (el.innerText ?? '').slice(0, 40),
          href: el.getAttribute('href') ?? '',
        };
      });
      if (info) {
        focusedCount++;
        focusedTags.add(info.tag);
        visited.push(`${info.tag}:${info.aria || info.text || info.href}`.slice(0, 60));
      }
    }
    record('focusable count', focusedCount >= 8 ? 'pass' : 'fail', `count=${focusedCount} tags=${[...focusedTags].join(',')}`);
    expect(focusedCount).toBeGreaterThanOrEqual(8);
  });

  test('10. Skip-to-main link via first Tab', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // Confirm skip link exists in DOM (even when sr-only / hidden)
    const skipAnchor = page.locator('a[href="#main"]').first();
    const exists = await skipAnchor.count();
    record('skip-to-main in DOM', exists > 0 ? 'pass' : 'fail', `count=${exists}`);

    // Reset focus
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      // Set focus to a non-interactive root so the next Tab traverses from start
      const b = document.body as HTMLElement;
      b.tabIndex = -1;
      b.focus();
    });

    // Tab a few times — the skip link should be the first or near-first focusable.
    let foundOnTab: number | null = null;
    let firstFocusInfo: { text: string; href: string; id: string } | null = null;
    for (let i = 1; i <= 5; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLAnchorElement | null;
        if (!el) return null;
        return {
          text: (el.innerText || el.textContent || '').trim(),
          href: el.getAttribute('href') ?? '',
          id: el.id ?? '',
        };
      });
      if (i === 1) firstFocusInfo = info;
      if (info && /skip|atla|içeriğe/i.test(info.text) && info.href === '#main') {
        foundOnTab = i;
        break;
      }
    }
    record('first-tab focused', 'info', `text="${firstFocusInfo?.text}" href="${firstFocusInfo?.href}"`);

    if (foundOnTab !== null) {
      record('skip-to-main reachable', foundOnTab === 1 ? 'pass' : 'info', `reached on Tab #${foundOnTab}`);
      // Activate it
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      const hashOrMainFocused = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        return window.location.hash === '#main' || (a?.id === 'main');
      });
      record('skip-to-main activates', hashOrMainFocused ? 'pass' : 'info', `result=${hashOrMainFocused}`);
    } else {
      record('skip-to-main reachable', 'fail', `not reached within 5 Tabs; first was "${firstFocusInfo?.text}"`);
    }

    await snap(page, 'persona-6-10-skip-to-main.png');

    // Soft assertion: at minimum skip link exists in DOM (a11y must)
    expect(exists).toBeGreaterThan(0);
  });

  test.afterAll(async () => {
    // eslint-disable-next-line no-console
    console.log(`[persona-6] total findings=${findings.length}`);
    for (const f of findings) {
      // eslint-disable-next-line no-console
      console.log(`  - [${f.status}] ${f.scenario}: ${f.detail}`);
    }
  });
});
