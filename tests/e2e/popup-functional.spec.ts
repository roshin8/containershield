/**
 * Popup UI Functional Tests
 *
 * Tests every interactive feature across all 7 tabs.
 * Uses a browser API mock to render the popup outside extension context.
 */

import { test, expect, firefox, type Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getBrowserMockScript } from './helpers/browser-mock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../dist');
const popupUrl = `file://${path.join(distPath, 'popup/index.html')}`;

let browser: Awaited<ReturnType<typeof firefox.launch>>;
let page: Page;

test.beforeAll(async () => {
  browser = await firefox.launch({ headless: true });
});

test.afterAll(async () => {
  await browser?.close();
});

test.beforeEach(async () => {
  page = await browser.newPage();
  await page.addInitScript(getBrowserMockScript());
  await page.setViewportSize({ width: 440, height: 540 });
  await page.goto(popupUrl);
  await page.waitForTimeout(2000);
});

test.afterEach(async () => {
  await page?.close();
});

// Helpers
const clickTab = (name: string) => page.locator('nav button', { hasText: name }).first().click();
const getSaved = () => page.evaluate(() => (window as any).__mockState.saved);
const getSettings = () => page.evaluate(() => (window as any).__mockState.settings);

// ─── APP BOOTSTRAP ───────────────────────────────────────────────

test.describe('App Bootstrap', () => {
  test('renders without errors', async () => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const root = await page.evaluate(() => document.getElementById('root')?.innerHTML?.length || 0);
    expect(root).toBeGreaterThan(100);
    expect(errors).toHaveLength(0);
  });

  test('header shows title and protection count', async () => {
    await expect(page.locator('text=Container Shield')).toBeVisible();
    await expect(page.locator('text=protections')).toBeVisible();
  });

  test('container selector has all containers', async () => {
    const options = await page.locator('header select option').count();
    expect(options).toBe(3);
  });

  test('all 7 sidebar tabs visible', async () => {
    for (const tab of ['Home', 'Profile', 'Signals', 'Options', 'Headers', 'Rules', 'Settings']) {
      await expect(page.locator('nav button', { hasText: tab }).first()).toBeVisible();
    }
  });

  test('footer shows version', async () => {
    await expect(page.locator('text=v0.3.0')).toBeVisible();
  });
});

// ─── HOME TAB ────────────────────────────────────────────────────

test.describe('Home Tab', () => {
  test('protection toggle shows active state', async () => {
    await expect(page.locator('text=Protection Active')).toBeVisible();
    await expect(page.locator('text=signals protected')).toBeVisible();
  });

  test('toggling protection saves setting', async () => {
    await page.locator('.toggle').first().click();
    await page.waitForTimeout(300);
    const saved = await getSaved();
    expect(saved.some((s: any) => s.enabled === false)).toBe(true);
  });

  test('protection level buttons work', async () => {
    await page.locator('button', { hasText: 'Strict' }).click();
    await page.waitForTimeout(300);
    const saved = await getSaved();
    expect(saved.some((s: any) => s.protectionLevel === 3)).toBe(true);
  });

  test('quick stats display profile info', async () => {
    await expect(page.locator('text=Firefox 120 Win')).toBeVisible();
    await expect(page.locator('text=1920x1080')).toBeVisible();
    await expect(page.locator('text=en-US')).toBeVisible();
  });

  test('fingerprint monitor shows API count', async () => {
    await expect(page.locator('text=5 APIs')).toBeVisible();
  });
});

// ─── PROFILE TAB ─────────────────────────────────────────────────

test.describe('Profile Tab', () => {
  test.beforeEach(async () => { await clickTab('Profile'); });

  test('randomize button exists', async () => {
    await expect(page.locator('button', { hasText: 'Randomize' })).toBeVisible();
  });

  test('randomize generates a real profile', async () => {
    await page.locator('button', { hasText: 'Randomize' }).click();
    await page.waitForTimeout(500);
    const saved = await getSaved();
    const profile = saved[saved.length - 1]?.profile;
    expect(profile).toBeDefined();
    expect(profile.userAgent).toBeTruthy();
    expect(profile.platform).toBeTruthy();
    expect(profile.screen).toBeDefined();
    expect(profile.hardwareConcurrency).toBeGreaterThan(0);
    expect(profile.deviceMemory).toBeGreaterThan(0);
    expect(profile.language).toBeTruthy();
    expect(profile.mode).toBe('preset');
  });

  test('randomize shows summary', async () => {
    await page.locator('button', { hasText: 'Randomize' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=UA:')).toBeVisible();
    await expect(page.locator('text=Platform:')).toBeVisible();
    await expect(page.locator('text=CPU:')).toBeVisible();
  });

  test('OS filter pills filter the user agent list', async () => {
    await page.locator('.pill', { hasText: 'Android' }).click();
    await page.waitForTimeout(300);
    const items = page.locator('main button', { hasText: /Android/ });
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('search filters user agents', async () => {
    await page.locator('input[placeholder*="Search"]').fill('Firefox');
    await page.waitForTimeout(300);
    const items = page.locator('main button', { hasText: /Firefox/ });
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('selecting a user agent saves profile', async () => {
    const firstUA = page.locator('main button', { hasText: /Chrome \d+/ }).first();
    await firstUA.click();
    await page.waitForTimeout(300);
    const saved = await getSaved();
    const profile = saved[saved.length - 1]?.profile;
    expect(profile?.mode).toBe('preset');
    expect(profile?.userAgent).toContain('Chrome');
  });

  test('screen size dropdowns exist', async () => {
    const selects = page.locator('main select');
    expect(await selects.count()).toBeGreaterThanOrEqual(4); // desktop, laptop, tablet, mobile + language + timezone + hardware
  });

  test('language dropdown has options', async () => {
    const langSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'English' }) }).first();
    expect(await langSelect.count()).toBe(1);
    const optionCount = await langSelect.locator('option').count();
    expect(optionCount).toBeGreaterThan(10);
  });

  test('hardware dropdowns work', async () => {
    // Find CPU cores dropdown and change it
    const cpuSelect = page.locator('select').filter({ has: page.locator('option[value="16"]') }).first();
    await cpuSelect.selectOption('16');
    await page.waitForTimeout(300);
    const saved = await getSaved();
    const profile = saved[saved.length - 1]?.profile;
    expect(profile?.hardwareConcurrency).toBe(16);
  });
});

// ─── SIGNALS TAB ─────────────────────────────────────────────────

test.describe('Signals Tab', () => {
  test.beforeEach(async () => { await clickTab('Signals'); });

  test('all signal groups rendered', async () => {
    for (const group of ['GRAPHICS', 'AUDIO', 'HARDWARE', 'NAVIGATOR', 'NETWORK', 'TIMING', 'FONTS']) {
      await expect(page.locator(`text=${group}`).first()).toBeVisible();
    }
  });

  test('signal rows have Off/Spoof/Block buttons', async () => {
    const offButtons = page.locator('button.pill', { hasText: 'Off' });
    const spoofButtons = page.locator('button.pill', { hasText: 'Spoof' });
    const blockButtons = page.locator('button.pill', { hasText: 'Block' });
    expect(await offButtons.count()).toBeGreaterThan(20);
    expect(await spoofButtons.count()).toBeGreaterThan(20);
    expect(await blockButtons.count()).toBeGreaterThan(20);
  });

  test('clicking Off disables a signal', async () => {
    // Click the first Off button (Canvas)
    await page.locator('button.pill', { hasText: 'Off' }).first().click();
    await page.waitForTimeout(300);
    const saved = await getSaved();
    expect(saved.some((s: any) => s.spoofers?.graphics?.canvas === 'off')).toBe(true);
  });

  test('value dropdowns appear for supported signals', async () => {
    // Canvas should have a dropdown with noise levels
    const canvasDropdown = page.locator('select').filter({ has: page.locator('option', { hasText: 'Minimal' }) }).first();
    expect(await canvasDropdown.count()).toBe(1);
  });

  test('has 19+ value dropdowns', async () => {
    const selects = page.locator('main select');
    expect(await selects.count()).toBeGreaterThanOrEqual(19);
  });

  test('WebRTC uses custom select mode', async () => {
    const rtcSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Public IP only' }) }).first();
    expect(await rtcSelect.count()).toBe(1);
  });

  test('WebSocket uses custom select mode', async () => {
    // Need to scroll down to Network section
    await page.evaluate(() => document.querySelector('main')?.scrollBy(0, 999));
    await page.waitForTimeout(200);
    const wsSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Block 3rd party' }) }).first();
    expect(await wsSelect.count()).toBe(1);
  });
});

// ─── OPTIONS TAB ─────────────────────────────────────────────────

test.describe('Options Tab', () => {
  test.beforeEach(async () => { await clickTab('Options'); });

  test('has 3 sub-tabs', async () => {
    await expect(page.locator('.subtab', { hasText: 'Injection' })).toBeVisible();
    await expect(page.locator('.subtab', { hasText: 'Standard' })).toBeVisible();
    await expect(page.locator('.subtab', { hasText: 'Cookie' })).toBeVisible();
  });

  test('injection sub-tab has toggles', async () => {
    await expect(page.locator('text=Spoof Canvas Fingerprint')).toBeVisible();
    await expect(page.locator('text=Spoof Audio Context')).toBeVisible();
    await expect(page.locator('text=Protect Window.name')).toBeVisible();
  });

  test('toggling a spoofer saves settings', async () => {
    // Find the "Spoof Canvas Fingerprint" toggle and click it
    const canvasToggle = page.locator('.row', { hasText: 'Spoof Canvas' }).locator('.toggle');
    await canvasToggle.click();
    await page.waitForTimeout(300);
    const saved = await getSaved();
    expect(saved.some((s: any) => s.spoofers?.graphics?.canvas === 'off')).toBe(true);
  });

  test('standard sub-tab has WebRTC and device controls', async () => {
    await page.locator('.subtab', { hasText: 'Standard' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=WebRTC Policy')).toBeVisible();
    await expect(page.locator('text=Block Device APIs')).toBeVisible();
    await expect(page.locator('text=WebSockets')).toBeVisible();
  });

  test('cookie sub-tab shows storage controls', async () => {
    await page.locator('.subtab', { hasText: 'Cookie' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Spoof Storage Estimate')).toBeVisible();
    await expect(page.locator('text=Spoof IndexedDB')).toBeVisible();
  });
});

// ─── HEADERS TAB ─────────────────────────────────────────────────

test.describe('Headers Tab', () => {
  test.beforeEach(async () => { await clickTab('Headers'); });

  test('shows request header toggles', async () => {
    await expect(page.locator('text=Spoof User-Agent Header')).toBeVisible();
    await expect(page.locator('text=Spoof Accept-Language')).toBeVisible();
    await expect(page.locator('text=Send Do Not Track')).toBeVisible();
    await expect(page.locator('text=Disable ETag Tracking')).toBeVisible();
  });

  test('shows proxy header controls', async () => {
    await expect(page.locator('text=Spoof X-Forwarded-For')).toBeVisible();
    await expect(page.locator('text=Spoof Via Header')).toBeVisible();
  });

  test('enabling X-Forwarded-For shows IP mode options', async () => {
    const xffToggle = page.locator('.row', { hasText: 'X-Forwarded-For' }).locator('.toggle');
    await xffToggle.click();
    await page.waitForTimeout(300);
    await expect(page.locator('.pill', { hasText: 'Random' })).toBeVisible();
    await expect(page.locator('.pill', { hasText: 'Custom' })).toBeVisible();
    await expect(page.locator('.pill', { hasText: 'Range' })).toBeVisible();
  });

  test('custom mode shows IP input', async () => {
    const xffToggle = page.locator('.row', { hasText: 'X-Forwarded-For' }).locator('.toggle');
    await xffToggle.click();
    await page.waitForTimeout(200);
    await page.locator('.pill', { hasText: 'Custom' }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('input[placeholder*="203"]')).toBeVisible();
  });

  test('referer policy dropdown works', async () => {
    await page.evaluate(() => document.querySelector('main')?.scrollBy(0, 999));
    await page.waitForTimeout(200);
    const refSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Origin only' }) }).first();
    await refSelect.selectOption('origin');
    await page.waitForTimeout(300);
    const saved = await getSaved();
    expect(saved.some((s: any) => s.headers?.refererPolicy === 'origin')).toBe(true);
  });
});

// ─── RULES TAB ───────────────────────────────────────────────────

test.describe('Rules Tab', () => {
  test.beforeEach(async () => { await clickTab('Rules'); });

  test('shows empty state', async () => {
    await expect(page.locator('text=No domain rules configured')).toBeVisible();
  });

  test('can add a domain rule', async () => {
    await page.locator('input[placeholder*="example"]').fill('test.com');
    await page.locator('button', { hasText: 'Add' }).click();
    await page.waitForTimeout(300);
    const saved = await getSaved();
    expect(saved.some((s: any) => s.domainRules?.['test.com'])).toBe(true);
  });

  test('enter key adds a rule', async () => {
    await page.locator('input[placeholder*="example"]').fill('enter-test.com');
    await page.locator('input[placeholder*="example"]').press('Enter');
    await page.waitForTimeout(300);
    const saved = await getSaved();
    expect(saved.some((s: any) => s.domainRules?.['enter-test.com'])).toBe(true);
  });

  test('empty domain is not added', async () => {
    const savedBefore = await getSaved();
    await page.locator('button', { hasText: 'Add' }).click();
    await page.waitForTimeout(200);
    const savedAfter = await getSaved();
    expect(savedAfter.length).toBe(savedBefore.length);
  });
});

// ─── SETTINGS TAB ────────────────────────────────────────────────

test.describe('Settings Tab', () => {
  test.beforeEach(async () => { await clickTab('Settings'); });

  test('shows all sections', async () => {
    await expect(page.locator('text=SYNC TO CONTAINERS')).toBeVisible();
    await expect(page.locator('text=BACKUP & RESTORE')).toBeVisible();
    await expect(page.locator('text=DANGER ZONE')).toBeVisible();
  });

  test('apply settings button opens modal', async () => {
    await page.locator('button', { hasText: 'Apply Settings' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Apply Settings To')).toBeVisible();
  });

  test('modal shows other containers', async () => {
    await page.locator('button', { hasText: 'Apply Settings' }).click();
    await page.waitForTimeout(300);
    // Should show Personal and Work (not Default which is current)
    await expect(page.locator('span', { hasText: 'Personal' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'Work' })).toBeVisible();
  });

  test('export button exists', async () => {
    await expect(page.locator('button', { hasText: 'Export' })).toBeVisible();
  });

  test('import button exists', async () => {
    await expect(page.locator('text=Import')).toBeVisible();
  });

  test('version shown', async () => {
    await expect(page.locator('text=Container Shield v0.3.0')).toBeVisible();
  });
});

// ─── CROSS-TAB & THEME ──────────────────────────────────────────

test.describe('Cross-Tab & Theme', () => {
  test('switching tabs changes content', async () => {
    await clickTab('Profile');
    await expect(page.locator('text=USER AGENT')).toBeVisible();

    await clickTab('Signals');
    await expect(page.locator('text=GRAPHICS')).toBeVisible();

    await clickTab('Options');
    await expect(page.locator('text=Injection')).toBeVisible();

    await clickTab('Headers');
    await expect(page.locator('text=REQUEST HEADERS')).toBeVisible();

    await clickTab('Rules');
    await expect(page.locator('text=Add Domain Exception')).toBeVisible();

    await clickTab('Settings');
    await expect(page.locator('text=SYNC TO CONTAINERS')).toBeVisible();

    await clickTab('Home');
    await expect(page.locator('text=Protection Active')).toBeVisible();
  });

  test('theme toggle switches dark/light', async () => {
    // Default is dark
    const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(themeBefore).toBe('dark');

    // Click theme toggle (last button in nav)
    await page.locator('nav button').last().click();
    await page.waitForTimeout(300);

    const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(themeAfter).toBe('light');

    // Toggle back
    await page.locator('nav button').last().click();
    await page.waitForTimeout(300);

    const themeBack = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(themeBack).toBe('dark');
  });

  test('all tabs have consistent width', async () => {
    const widths: number[] = [];
    for (const tab of ['Home', 'Profile', 'Signals', 'Options', 'Headers', 'Rules', 'Settings']) {
      await clickTab(tab);
      await page.waitForTimeout(200);
      const w = await page.evaluate(() => {
        const content = document.getElementById('root')?.firstElementChild?.children[1];
        return Math.round(content?.getBoundingClientRect().width || 0);
      });
      widths.push(w);
    }
    // All widths should be identical
    const unique = new Set(widths);
    expect(unique.size).toBe(1);
    expect(widths[0]).toBeGreaterThan(300);
  });
});
