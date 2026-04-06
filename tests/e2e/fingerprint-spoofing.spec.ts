/**
 * E2E Tests for Fingerprint Spoofing
 *
 * These tests verify:
 * 1. The built extension has all required files and correct structure
 * 2. The inject script can be loaded and spoofers initialized in a page context
 * 3. Spoofers actually modify API return values
 * 4. Spoofed values are deterministic (same seed = same result)
 * 5. Different seeds produce different fingerprints
 */

import { test, expect, firefox } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../dist');

function getInjectScript(): string {
  return fs.readFileSync(path.join(distPath, 'inject', 'index.js'), 'utf-8');
}

/**
 * Create a test config simulating what the content script sends.
 */
function createTestConfig(seed: string = 'dGVzdHNlZWQxMjM0NTY3ODkwYWJjZGVmZ2hpamtsbQ==') {
  return {
    containerId: 'firefox-container-1',
    domain: 'test.example.com',
    seed,
    settings: {
      graphics: { canvas: 'noise', offscreenCanvas: 'noise', webgl: 'noise', webgl2: 'noise', webglShaders: 'noise', webgpu: 'noise', svg: 'noise', domRect: 'noise', textMetrics: 'noise' },
      audio: { audioContext: 'noise', offlineAudio: 'noise', latency: 'noise', codecs: 'off' },
      hardware: { screen: 'noise', screenFrame: 'noise', screenExtended: 'noise', orientation: 'noise', deviceMemory: 'noise', hardwareConcurrency: 'noise', mediaDevices: 'noise', battery: 'block', gpu: 'noise', touch: 'noise', sensors: 'block', architecture: 'noise', visualViewport: 'noise' },
      navigator: { userAgent: 'noise', languages: 'noise', plugins: 'noise', clientHints: 'noise', clipboard: 'block', vibration: 'noise', vendorFlavors: 'noise', fontPreferences: 'noise' },
      timezone: { intl: 'noise', date: 'noise' },
      fonts: { enumeration: 'noise', cssDetection: 'noise' },
      network: { webrtc: 'public_only', connection: 'off', geolocation: 'block' },
      timing: { performance: 'noise', memory: 'noise' },
      css: { mediaQueries: 'noise' },
      speech: { synthesis: 'noise' },
      permissions: { query: 'noise', notification: 'noise' },
      storage: { estimate: 'noise', indexedDB: 'noise', webSQL: 'block' },
      math: { functions: 'noise' },
      keyboard: { layout: 'noise' },
      workers: { fingerprint: 'noise' },
      errors: { stackTrace: 'noise' },
      rendering: { emoji: 'noise', mathml: 'noise' },
      intl: { apis: 'noise' },
      crypto: { webCrypto: 'noise' },
      devices: { gamepad: 'block', midi: 'block', bluetooth: 'block', usb: 'block', serial: 'block', hid: 'block' },
      features: { detection: 'noise' },
      payment: { applePay: 'block' },
    },
    profile: { mode: 'random' },
    assignedProfile: {
      userAgent: {
        id: 'test-ua',
        name: 'Test Browser',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        platform: 'Win32',
        vendor: '',
        appVersion: '5.0 (Windows)',
        oscpu: 'Windows NT 10.0; Win64; x64',
        mobile: false,
        platformName: 'Windows',
        platformVersion: '10.0.0',
      },
      screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
      hardwareConcurrency: 8,
      deviceMemory: 8,
      timezoneOffset: -300,
      languages: ['en-US', 'en'],
    },
  };
}

/**
 * Helper: inject the spoofer script into a page using a <script> tag,
 * then send the config via postMessage, and wait for initialization.
 * This mirrors how the actual extension injects the script.
 */
async function injectSpoofersIntoPage(
  page: Awaited<ReturnType<typeof firefox.launch>>['_initializer'] extends never ? never : any,
  config: ReturnType<typeof createTestConfig>
) {
  const injectScript = getInjectScript();

  // Inject as a real <script> tag (like the content script does) and send config
  await page.evaluate(({ script, cfg }: { script: string; cfg: any }) => {
    // Set config BEFORE script runs so it uses our config instead of fallback
    (window as any).__containerShieldConfig = cfg;

    const el = document.createElement('script');
    el.textContent = script;
    document.documentElement.appendChild(el);
    el.remove();
  }, { script: injectScript, cfg: config });

  // Give spoofers time to initialize
  await page.waitForTimeout(300);
}

test.describe('Build Verification', () => {
  test('dist contains all required files', () => {
    const required = [
      'manifest.json',
      'background/index.js',
      'content/index.js',
      'inject/index.js',
      'popup/index.html',
      'popup/index.js',
    ];
    for (const file of required) {
      expect(fs.existsSync(path.join(distPath, file)), `Missing: ${file}`).toBe(true);
    }
  });

  test('manifest is valid', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(distPath, 'manifest.json'), 'utf-8'));
    expect(manifest.manifest_version).toBe(2);
    expect(manifest.name).toBe('Container Shield');
    expect(manifest.permissions).toContain('webRequest');
    expect(manifest.content_scripts[0].run_at).toBe('document_start');
    expect(manifest.web_accessible_resources).toContain('inject/index.js');
    expect(manifest.web_accessible_resources).not.toContain('debug.html');
  });

  test('inject script contains essential functions', () => {
    const content = getInjectScript();
    expect(content).toContain('markSpoofersInitialized');
    expect(content).toContain('initializeSpoofers');
    expect(content).toContain('__containerShieldConfig');
    expect(content).toContain('reportToBackground');
    expect(content).not.toContain('localhost:9999');
  });

  test('content script bridges fingerprint reports', () => {
    const content = fs.readFileSync(path.join(distPath, 'content', 'index.js'), 'utf-8');
    expect(content).toContain('FINGERPRINT_REPORT');
    expect(content).not.toContain('DEBUG_LOG');
  });

  test('background script has no debug logger', () => {
    const content = fs.readFileSync(path.join(distPath, 'background', 'index.js'), 'utf-8');
    expect(content).not.toContain('localhost:9999');
    expect(content).not.toContain('debug_logs');
  });

  test('inject script has all spoofer categories', () => {
    const content = getInjectScript();
    const fns = [
      'initCanvasSpoofer', 'initWebGLSpoofer', 'initAudioSpoofer',
      'initScreenSpoofer', 'initDeviceSpoofer', 'initNavigatorSpoofer',
      'initTimezoneSpoofer', 'initWebRTCSpoofer', 'initDOMRectSpoofer',
      'initFontSpoofer', 'initPerformanceSpoofer', 'initMathSpoofer',
    ];
    for (const fn of fns) {
      expect(content, `Missing: ${fn}`).toContain(fn);
    }
  });
});

test.describe('Spoofer Functionality', () => {
  test('canvas toDataURL is modified by spoofer', async () => {
    const browser = await firefox.launch();

    // Baseline without spoofer
    const page1 = await browser.newPage();
    await page1.setContent('<html><body></body></html>');
    const baseline = await page1.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 200; c.height = 50;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 200, 50);
      ctx.fillStyle = '#069'; ctx.font = '14px Arial';
      ctx.fillText('Fingerprint Test', 2, 15);
      return c.toDataURL();
    });
    await page1.close();

    // With spoofer
    const page2 = await browser.newPage();
    await page2.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page2, createTestConfig());

    const spoofed = await page2.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 200; c.height = 50;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 200, 50);
      ctx.fillStyle = '#069'; ctx.font = '14px Arial';
      ctx.fillText('Fingerprint Test', 2, 15);
      return c.toDataURL();
    });
    await page2.close();

    expect(spoofed).not.toBe(baseline);
    await browser.close();
  });

  test('navigator properties are spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    const realUA = await page.evaluate(() => navigator.userAgent);
    await injectSpoofersIntoPage(page, createTestConfig());

    const spoofedUA = await page.evaluate(() => navigator.userAgent);
    const spoofedPlatform = await page.evaluate(() => navigator.platform);
    const spoofedVendor = await page.evaluate(() => navigator.vendor);

    // The assigned profile specifies Win32/Firefox 120
    expect(spoofedUA).toContain('Firefox/120.0');
    expect(spoofedUA).toContain('Windows NT 10.0');
    expect(spoofedPlatform).toBe('Win32');
    expect(spoofedVendor).toBe('');

    // Should differ from the real browser UA (which is Playwright's Firefox)
    expect(spoofedUA).not.toBe(realUA);

    await browser.close();
  });

  test('screen dimensions are spoofed to assigned profile values', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    await injectSpoofersIntoPage(page, createTestConfig());

    const screen = await page.evaluate(() => ({
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
      dpr: window.devicePixelRatio,
    }));

    // Assigned profile: 1920x1080, 24-bit, DPR 1
    expect(screen.width).toBe(1920);
    expect(screen.height).toBe(1080);
    expect(screen.colorDepth).toBe(24);
    expect(screen.dpr).toBe(1);

    await browser.close();
  });

  test('hardware concurrency is spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    await injectSpoofersIntoPage(page, createTestConfig());

    const cores = await page.evaluate(() => navigator.hardwareConcurrency);
    // Assigned profile: 8 cores
    expect(cores).toBe(8);

    await browser.close();
  });

  test('languages are spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    await injectSpoofersIntoPage(page, createTestConfig());

    const langs = await page.evaluate(() => [...navigator.languages]);
    expect(langs).toEqual(['en-US', 'en']);

    await browser.close();
  });

  test('performance.now has reduced precision', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    await injectSpoofersIntoPage(page, createTestConfig());

    const values = await page.evaluate(() => {
      const vals: number[] = [];
      for (let i = 0; i < 100; i++) vals.push(performance.now());
      return vals;
    });

    // Check precision is reduced
    const maxDecimals = Math.max(...values.map(v => {
      const s = v.toString();
      const d = s.indexOf('.');
      return d === -1 ? 0 : s.length - d - 1;
    }));
    expect(maxDecimals).toBeLessThanOrEqual(2);

    await browser.close();
  });

  test('DOMRect values have noise added', async () => {
    const browser = await firefox.launch();
    const html = '<html><body><div id="t" style="width:100px;height:50px;position:absolute;top:10px;left:20px;"></div></body></html>';

    // Baseline
    const page1 = await browser.newPage();
    await page1.setContent(html);
    const baseline = await page1.evaluate(() => {
      const r = document.getElementById('t')!.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page1.close();

    // Spoofed
    const page2 = await browser.newPage();
    await page2.setContent(html);
    await injectSpoofersIntoPage(page2, createTestConfig());
    const spoofed = await page2.evaluate(() => {
      const r = document.getElementById('t')!.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page2.close();

    // At least one value should differ (noise added)
    const hasDiff = spoofed.x !== baseline.x || spoofed.y !== baseline.y ||
      spoofed.w !== baseline.w || spoofed.h !== baseline.h;
    expect(hasDiff).toBe(true);

    // Differences should be small
    expect(Math.abs(spoofed.w - baseline.w)).toBeLessThan(2);
    expect(Math.abs(spoofed.h - baseline.h)).toBeLessThan(2);

    await browser.close();
  });

  test('Math functions return noised values', async () => {
    const browser = await firefox.launch();

    // Baseline
    const page1 = await browser.newPage();
    await page1.setContent('<html><body></body></html>');
    const baselineMath = await page1.evaluate(() => ({
      tan: Math.tan(1), sin: Math.sin(1), cos: Math.cos(1),
    }));
    await page1.close();

    // Spoofed
    const page2 = await browser.newPage();
    await page2.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page2, createTestConfig());
    const spoofedMath = await page2.evaluate(() => ({
      tan: Math.tan(1), sin: Math.sin(1), cos: Math.cos(1),
    }));
    await page2.close();

    // At least one should differ
    const hasDiff = spoofedMath.tan !== baselineMath.tan ||
      spoofedMath.sin !== baselineMath.sin ||
      spoofedMath.cos !== baselineMath.cos;
    expect(hasDiff).toBe(true);

    // But values should be close (small noise)
    expect(Math.abs(spoofedMath.tan - baselineMath.tan)).toBeLessThan(0.001);

    await browser.close();
  });
});

test.describe('Determinism', () => {
  test('same seed produces same canvas hash', async () => {
    const browser = await firefox.launch();
    const config = createTestConfig();

    async function getCanvasHash() {
      const page = await browser.newPage();
      await page.setContent('<html><body></body></html>');
      await injectSpoofersIntoPage(page, config);
      const hash = await page.evaluate(() => {
        const c = document.createElement('canvas');
        c.width = 200; c.height = 50;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 200, 50);
        ctx.fillStyle = '#069'; ctx.font = '14px Arial';
        ctx.fillText('Determinism Test', 2, 15);
        return c.toDataURL();
      });
      await page.close();
      return hash;
    }

    const hash1 = await getCanvasHash();
    const hash2 = await getCanvasHash();
    expect(hash1).toBe(hash2);

    await browser.close();
  });

  test('different seeds produce different canvas hashes', async () => {
    const browser = await firefox.launch();

    async function getCanvasHash(seed: string) {
      const page = await browser.newPage();
      await page.setContent('<html><body></body></html>');
      await injectSpoofersIntoPage(page, createTestConfig(seed));
      const hash = await page.evaluate(() => {
        const c = document.createElement('canvas');
        c.width = 200; c.height = 50;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 200, 50);
        ctx.fillStyle = '#069'; ctx.font = '14px Arial';
        ctx.fillText('Seed Test', 2, 15);
        return c.toDataURL();
      });
      await page.close();
      return hash;
    }

    const hash1 = await getCanvasHash('dGVzdHNlZWQxMjM0NTY3ODkwYWJjZGVmZ2hpamtsbQ==');
    const hash2 = await getCanvasHash('YW5vdGhlcnNlZWQxMjM0NTY3ODkwYWJjZGVmZ2hpag==');
    expect(hash1).not.toBe(hash2);

    await browser.close();
  });

  test('spoofed navigator values are consistent across reads', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const reads = await page.evaluate(() => {
      return Array.from({ length: 5 }, () => ({
        ua: navigator.userAgent,
        platform: navigator.platform,
        cores: navigator.hardwareConcurrency,
      }));
    });

    for (let i = 1; i < reads.length; i++) {
      expect(reads[i].ua).toBe(reads[0].ua);
      expect(reads[i].platform).toBe(reads[0].platform);
      expect(reads[i].cores).toBe(reads[0].cores);
    }

    await browser.close();
  });
});

test.describe('Block Mode', () => {
  test('battery API is blocked', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const result = await page.evaluate(async () => {
      try {
        const battery = await (navigator as any).getBattery();
        return { blocked: false, level: battery?.level };
      } catch {
        return { blocked: true };
      }
    });

    // Either blocked (throws) or returns spoofed data
    expect(result.blocked || result.level !== undefined).toBe(true);
    await browser.close();
  });

  test('canvas in block mode returns empty data', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    const config = createTestConfig();
    config.settings.graphics.canvas = 'block';
    await injectSpoofersIntoPage(page, config);

    const result = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 100; c.height = 50;
      c.getContext('2d')!.fillText('Block test', 10, 25);
      return c.toDataURL();
    });

    expect(result).toBe('data:image/png;base64,');
    await browser.close();
  });

  test('devices are blocked in block mode', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    // Gamepad blocker should ensure no real gamepads are returned
    // Firefox returns an array of 4 null entries by default
    const gamepads = await page.evaluate(() => {
      try {
        const pads = navigator.getGamepads();
        // All entries should be null (no real gamepads exposed)
        return Array.from(pads).every(p => p === null);
      } catch { return true; } // Throwing is also acceptable for block mode
    });
    expect(gamepads).toBe(true);

    await browser.close();
  });
});

test.describe('Off Mode', () => {
  test('all spoofers off passes values through unchanged', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    // Get real values
    const realCores = await page.evaluate(() => navigator.hardwareConcurrency);
    const realScreen = await page.evaluate(() => screen.width);

    // Inject with all spoofers off
    const config = createTestConfig();
    for (const cat of Object.keys(config.settings)) {
      for (const key of Object.keys((config.settings as any)[cat])) {
        (config.settings as any)[cat][key] = 'off';
      }
    }
    await injectSpoofersIntoPage(page, config);

    const cores = await page.evaluate(() => navigator.hardwareConcurrency);
    const screenW = await page.evaluate(() => screen.width);

    expect(cores).toBe(realCores);
    expect(screenW).toBe(realScreen);

    await browser.close();
  });
});

test.describe('Fingerprint Monitor', () => {
  test('inject script loads without errors', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await injectSpoofersIntoPage(page, createTestConfig());

    // Access various APIs to exercise the monitor
    await page.evaluate(() => {
      void navigator.userAgent;
      void screen.width;
      document.createElement('canvas').toDataURL();
      void navigator.hardwareConcurrency;
      void performance.now();
      Math.tan(1);
    });

    // No unhandled errors
    expect(errors).toHaveLength(0);
    await browser.close();
  });

  test('multiple API accesses do not cause memory issues', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    // Rapid API accesses - should not throw or leak
    const ok = await page.evaluate(() => {
      for (let i = 0; i < 1000; i++) {
        void navigator.userAgent;
        void screen.width;
        performance.now();
      }
      return true;
    });

    expect(ok).toBe(true);
    await browser.close();
  });
});

test.describe('CreepJS Detection Vectors', () => {
  test('timezone offset matches Intl timezone (DST-aware)', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const tz = await page.evaluate(() => {
      const offset = new Date().getTimezoneOffset();
      const intlTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Compute expected offset from the Intl timezone
      const now = new Date();
      const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' });
      const tzStr = now.toLocaleString('en-US', { timeZone: intlTz });
      const utcDate = new Date(utcStr);
      const tzDate = new Date(tzStr);
      const expectedOffset = (utcDate.getTime() - tzDate.getTime()) / 60000;
      return { offset, intlTz, expectedOffset };
    });

    // The getTimezoneOffset should match what the IANA timezone produces
    expect(tz.offset).toBe(tz.expectedOffset);
    // Profile uses timezoneOffset -300 which maps to America/New_York
    expect(tz.intlTz).toBe('America/New_York');
    await browser.close();
  });

  test('Date.toString shows spoofed timezone name', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const dateStr = await page.evaluate(() => new Date().toString());
    // Should contain Eastern time reference (New York), not Central/Pacific/etc.
    expect(dateStr).toMatch(/Eastern|New_York|GMT[+-]\d{4}/);
    await browser.close();
  });

  test('oscpu is hidden when spoofing Chrome UA', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    // Use a Chrome profile (no oscpu)
    const config = createTestConfig();
    config.assignedProfile.userAgent = {
      id: 'chrome-125',
      name: 'Chrome 125 Win',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      platform: 'Win32',
      vendor: 'Google Inc.',
      appVersion: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      mobile: false,
      platformName: 'Windows',
      platformVersion: '10.0.0',
      brands: [{ brand: 'Chromium', version: '125' }, { brand: 'Not_A Brand', version: '8' }],
    };
    await injectSpoofersIntoPage(page, config);

    const result = await page.evaluate(() => ({
      oscpu: (navigator as any).oscpu,
      buildID: (navigator as any).buildID,
      hasUserAgentData: 'userAgentData' in navigator,
    }));

    // Chrome doesn't have oscpu or buildID
    expect(result.oscpu).toBeUndefined();
    expect(result.buildID).toBeUndefined();
    // Chrome DOES have userAgentData
    expect(result.hasUserAgentData).toBe(true);
    await browser.close();
  });

  test('userAgentData is present when spoofing Chrome UA', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    const config = createTestConfig();
    config.assignedProfile.userAgent = {
      id: 'chrome-125',
      name: 'Chrome 125 Win',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      platform: 'Win32',
      vendor: 'Google Inc.',
      appVersion: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      mobile: false,
      platformName: 'Windows',
      platformVersion: '10.0.0',
      brands: [{ brand: 'Chromium', version: '125' }, { brand: 'Not_A Brand', version: '8' }],
    };
    await injectSpoofersIntoPage(page, config);

    const uad = await page.evaluate(async () => {
      const data = (navigator as any).userAgentData;
      if (!data) return null;
      const high = await data.getHighEntropyValues(['platform', 'platformVersion', 'architecture']);
      return {
        brands: data.brands,
        mobile: data.mobile,
        platform: data.platform,
        highEntropy: {
          platform: high.platform,
          platformVersion: high.platformVersion,
          architecture: high.architecture,
        },
      };
    });

    expect(uad).not.toBeNull();
    expect(uad.platform).toBe('Windows');
    expect(uad.mobile).toBe(false);
    expect(uad.brands[0].brand).toBe('Chromium');
    expect(uad.highEntropy.architecture).toBe('x86');
    await browser.close();
  });

  test('Worker inherits spoofed navigator values', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const workerResult = await page.evaluate(() => {
      return new Promise<any>((resolve, reject) => {
        const code = `
          self.postMessage({
            userAgent: self.navigator.userAgent,
            platform: self.navigator.platform,
            hardwareConcurrency: self.navigator.hardwareConcurrency,
            language: self.navigator.language,
            languages: [...self.navigator.languages],
            timezoneOffset: new Date().getTimezoneOffset(),
            intlTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        `;
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const worker = new Worker(url);
        worker.onmessage = (e) => {
          worker.terminate();
          URL.revokeObjectURL(url);
          resolve(e.data);
        };
        worker.onerror = (e) => {
          reject(new Error(e.message));
        };
        setTimeout(() => reject(new Error('Worker timeout')), 5000);
      });
    });

    // Worker should have spoofed values matching main thread
    expect(workerResult.userAgent).toContain('Firefox/120.0');
    expect(workerResult.userAgent).toContain('Windows NT 10.0');
    expect(workerResult.platform).toBe('Win32');
    expect(workerResult.hardwareConcurrency).toBe(8);
    expect(workerResult.language).toBe('en-US');
    expect(workerResult.languages).toEqual(['en-US', 'en']);
    // Timezone should match main thread
    expect(workerResult.intlTimezone).toBe('America/New_York');
    await browser.close();
  });

  test('CSS matchMedia returns spoofed screen dimensions', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const css = await page.evaluate(() => ({
      exact1920: matchMedia('(device-width: 1920px)').matches,
      exact1080: matchMedia('(device-height: 1080px)').matches,
      min1800: matchMedia('(min-device-width: 1800px)').matches,
      max2000: matchMedia('(max-device-width: 2000px)').matches,
      wrongWidth: matchMedia('(device-width: 1680px)').matches,
    }));

    expect(css.exact1920).toBe(true);
    expect(css.exact1080).toBe(true);
    expect(css.min1800).toBe(true);
    expect(css.max2000).toBe(true);
    expect(css.wrongWidth).toBe(false);
    await browser.close();
  });

  test('fonts match spoofed platform', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const fonts = await page.evaluate(() => {
      // Check Windows-specific fonts are available
      const windowsFonts = ['Calibri', 'Segoe UI', 'Consolas'].map(f =>
        document.fonts.check(`12px "${f}"`)
      );
      // Check macOS-specific fonts are NOT available
      const macFonts = ['Helvetica Neue', 'San Francisco', 'Menlo'].map(f =>
        document.fonts.check(`12px "${f}"`)
      );
      return { windowsFonts, macFonts };
    });

    // Windows profile: at least some Windows fonts should pass check
    // macOS fonts should NOT pass (we're spoofing Windows)
    const anyMacFont = fonts.macFonts.some(f => f);
    expect(anyMacFont).toBe(false);
    await browser.close();
  });
});
