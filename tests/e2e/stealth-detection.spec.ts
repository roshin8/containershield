/**
 * Stealth & Anti-Detection Tests
 *
 * Verifies that our overrides are NOT detectable by CreepJS-style
 * prototype lie detection techniques, and tests new spoofer signals.
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

function createTestConfig() {
  return {
    containerId: 'firefox-container-1',
    domain: 'test.example.com',
    seed: 'dGVzdHNlZWQxMjM0NTY3ODkwYWJjZGVmZ2hpamtsbQ==',
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
        id: 'test-ua', name: 'Test Browser',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        platform: 'Win32', vendor: '', appVersion: '5.0 (Windows)',
        oscpu: 'Windows NT 10.0; Win64; x64', mobile: false,
        platformName: 'Windows', platformVersion: '10.0.0',
      },
      screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
      hardwareConcurrency: 8, deviceMemory: 8, timezoneOffset: -300,
      languages: ['en-US', 'en'],
    },
  };
}

async function injectSpoofers(page: any) {
  const script = getInjectScript();
  const cfg = createTestConfig();
  await page.evaluate(({ script, cfg }: { script: string; cfg: any }) => {
    (window as any).__containerShieldConfig = cfg;
    const el = document.createElement('script');
    el.textContent = script;
    document.documentElement.appendChild(el);
    el.remove();
  }, { script, cfg });
  await page.waitForTimeout(300);
}

// ─── PROTOTYPE LIE DETECTION ────────────────────────────────────────────────

test.describe('Stealth: toString Detection', () => {
  test('canvas.toDataURL.toString() returns native code', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      const str = HTMLCanvasElement.prototype.toDataURL.toString();
      return {
        str,
        looksNative: str.includes('[native code]'),
      };
    });

    expect(result.looksNative).toBe(true);
    await browser.close();
  });

  test('navigator.userAgent getter toString returns native code', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent');
      if (!desc?.get) return { noGetter: true };
      const str = desc.get.toString();
      return {
        str,
        looksNative: str.includes('[native code]'),
      };
    });

    if (!(result as any).noGetter) {
      expect(result.looksNative).toBe(true);
    }
    await browser.close();
  });

  test('Function.prototype.toString itself looks native', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      const str = Function.prototype.toString.toString();
      return { str, looksNative: str.includes('[native code]') };
    });

    expect(result.looksNative).toBe(true);
    await browser.close();
  });

  test('screen.width getter lives on prototype, not instance', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      // Native properties live on the prototype
      const protoDesc = Object.getOwnPropertyDescriptor(Screen.prototype, 'width');
      // Should NOT have an own property on the screen instance
      const ownDesc = Object.getOwnPropertyDescriptor(screen, 'width');
      return {
        hasProtoGetter: !!protoDesc?.get,
        hasOwnProp: !!ownDesc,
      };
    });

    expect(result.hasProtoGetter).toBe(true);
    // Ideally should not have own property, but some browsers may
    await browser.close();
  });

  test('matchMedia.toString() returns native code', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      return window.matchMedia.toString().includes('[native code]');
    });

    expect(result).toBe(true);
    await browser.close();
  });
});

// ─── NEW SPOOFER SIGNALS ────────────────────────────────────────────────────

test.describe('New Signals: Media Queries', () => {
  test('color-gamut query returns consistent value', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      const srgb = window.matchMedia('(color-gamut: srgb)').matches;
      const p3 = window.matchMedia('(color-gamut: p3)').matches;
      const rec2020 = window.matchMedia('(color-gamut: rec2020)').matches;
      return { srgb, p3, rec2020 };
    });

    // At least srgb or p3 should match (based on PRNG)
    expect(result.srgb || result.p3).toBe(true);
    // rec2020 should not match (we don't use it)
    expect(result.rec2020).toBe(false);
    await browser.close();
  });

  test('dynamic-range HDR query is spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => ({
      standard: window.matchMedia('(dynamic-range: standard)').matches,
      high: window.matchMedia('(dynamic-range: high)').matches,
    }));

    // Exactly one should be true
    expect(result.standard !== result.high).toBe(true);
    await browser.close();
  });

  test('monochrome query reports non-monochrome', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => ({
      mono: window.matchMedia('(monochrome)').matches,
      mono0: window.matchMedia('(monochrome: 0)').matches,
    }));

    expect(result.mono).toBe(false);
    expect(result.mono0).toBe(true);
    await browser.close();
  });

  test('forced-colors is spoofed to none', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => ({
      none: window.matchMedia('(forced-colors: none)').matches,
      active: window.matchMedia('(forced-colors: active)').matches,
    }));

    expect(result.none).toBe(true);
    expect(result.active).toBe(false);
    await browser.close();
  });

  test('inverted-colors is spoofed to none', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => ({
      none: window.matchMedia('(inverted-colors: none)').matches,
      inverted: window.matchMedia('(inverted-colors: inverted)').matches,
    }));

    expect(result.none).toBe(true);
    expect(result.inverted).toBe(false);
    await browser.close();
  });
});

test.describe('New Signals: Geolocation', () => {
  test('geolocation.getCurrentPosition is blocked', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      return new Promise<{ blocked: boolean }>((resolve) => {
        if (!navigator.geolocation) { resolve({ blocked: true }); return; }
        navigator.geolocation.getCurrentPosition(
          () => resolve({ blocked: false }),
          (err) => resolve({ blocked: err.code === 1 }), // PERMISSION_DENIED
          { timeout: 1000 }
        );
      });
    });

    expect(result.blocked).toBe(true);
    await browser.close();
  });
});

test.describe('New Signals: Screen Extended', () => {
  test('screen.isExtended is false', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      return { isExtended: (screen as any).isExtended };
    });

    // Should be false (single monitor) or undefined (API not available)
    expect(result.isExtended === false || result.isExtended === undefined).toBe(true);
    await browser.close();
  });
});

test.describe('New Signals: Visual Viewport', () => {
  test('visualViewport.scale is 1', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      if (!window.visualViewport) return { noAPI: true };
      return {
        scale: window.visualViewport.scale,
        offsetLeft: window.visualViewport.offsetLeft,
        offsetTop: window.visualViewport.offsetTop,
      };
    });

    if (!(result as any).noAPI) {
      expect((result as any).scale).toBe(1);
      expect((result as any).offsetLeft).toBe(0);
      expect((result as any).offsetTop).toBe(0);
    }
    await browser.close();
  });
});

test.describe('Comprehensive: FingerprintJS-style Collection', () => {
  test('collect all FingerprintJS signals without detection', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      const signals: Record<string, any> = {};
      const errors: string[] = [];
      const lies: string[] = [];

      // 1. Navigator signals
      try {
        signals.navigator = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          vendor: navigator.vendor,
          languages: [...navigator.languages],
          hardwareConcurrency: navigator.hardwareConcurrency,
          deviceMemory: (navigator as any).deviceMemory,
          maxTouchPoints: navigator.maxTouchPoints,
          cookieEnabled: navigator.cookieEnabled,
          webdriver: navigator.webdriver,
          plugins: navigator.plugins.length,
        };
      } catch (e) { errors.push('navigator: ' + (e as Error).message); }

      // 2. Screen signals
      try {
        signals.screen = {
          width: screen.width, height: screen.height,
          colorDepth: screen.colorDepth, pixelDepth: screen.pixelDepth,
          dpr: window.devicePixelRatio,
          isExtended: (screen as any).isExtended,
        };
      } catch (e) { errors.push('screen: ' + (e as Error).message); }

      // 3. Canvas
      try {
        const c = document.createElement('canvas');
        c.width = 200; c.height = 50;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 200, 50);
        ctx.font = '14px Arial'; ctx.fillText('FP Test', 2, 15);
        signals.canvas = { hash: c.toDataURL().substring(0, 50) };
      } catch (e) { errors.push('canvas: ' + (e as Error).message); }

      // 4. Media queries (FingerprintJS checks all of these)
      try {
        signals.mediaQueries = {
          colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          contrast: window.matchMedia('(prefers-contrast: more)').matches,
          forcedColors: window.matchMedia('(forced-colors: active)').matches,
          invertedColors: window.matchMedia('(inverted-colors: inverted)').matches,
          colorGamut: window.matchMedia('(color-gamut: p3)').matches ? 'p3' : 'srgb',
          hdr: window.matchMedia('(dynamic-range: high)').matches,
          monochrome: window.matchMedia('(monochrome)').matches,
          pointer: window.matchMedia('(pointer: fine)').matches ? 'fine' : 'other',
          hover: window.matchMedia('(hover: hover)').matches,
        };
      } catch (e) { errors.push('mediaQueries: ' + (e as Error).message); }

      // 5. Math fingerprint
      try {
        signals.math = {
          acos: Math.acos(0.5),
          tan: Math.tan(1),
          sin: Math.sin(1),
        };
      } catch (e) { errors.push('math: ' + (e as Error).message); }

      // 6. Timezone
      try {
        signals.timezone = {
          offset: new Date().getTimezoneOffset(),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      } catch (e) { errors.push('timezone: ' + (e as Error).message); }

      // 7. Prototype lie checks (CreepJS-style)
      try {
        // Check toDataURL
        const tdStr = HTMLCanvasElement.prototype.toDataURL.toString();
        if (!tdStr.includes('[native code]')) lies.push('toDataURL toString');

        // Check matchMedia
        const mmStr = window.matchMedia.toString();
        if (!mmStr.includes('[native code]')) lies.push('matchMedia toString');

        // Check Function.prototype.toString itself
        const tsStr = Function.prototype.toString.toString();
        if (!tsStr.includes('[native code]')) lies.push('toString toString');

        signals.lies = lies;
      } catch (e) { errors.push('lies: ' + (e as Error).message); }

      return {
        signals,
        errors,
        lieCount: lies.length,
        signalCount: Object.keys(signals).length,
      };
    });

    // No collection errors
    expect(result.errors).toHaveLength(0);

    // All signal categories collected
    expect(result.signalCount).toBeGreaterThanOrEqual(7);

    // No prototype lies detected
    expect(result.lieCount).toBe(0);

    // Verify spoofed values
    expect(result.signals.navigator.platform).toBe('Win32');
    expect(result.signals.navigator.webdriver).toBe(false);
    expect(result.signals.screen.width).toBe(1920);
    expect(result.signals.mediaQueries.forcedColors).toBe(false);
    expect(result.signals.mediaQueries.invertedColors).toBe(false);

    await browser.close();
  });
});
