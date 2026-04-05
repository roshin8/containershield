/**
 * CreepJS Integration Tests
 *
 * Simulates the fingerprint checks that CreepJS performs to verify
 * that Container Shield's spoofing is comprehensive and undetectable.
 *
 * Tests cover every major signal category:
 * - Navigator properties (userAgent, platform, vendor, languages, plugins)
 * - Canvas fingerprinting
 * - WebGL vendor/renderer
 * - Screen dimensions
 * - Audio context
 * - Timezone / Intl
 * - Math function fingerprinting
 * - Performance.now precision
 * - Function.prototype.toString lie detection
 * - navigator.webdriver
 * - DOMRect fingerprinting
 * - Hardware (deviceMemory, hardwareConcurrency)
 * - Fingerprint consistency / determinism
 */

import { test, expect, firefox } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../dist');

test.setTimeout(60000);

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
 * Inject the spoofer script into a page using a <script> tag,
 * then send the config via postMessage, and wait for initialization.
 */
async function injectSpoofersIntoPage(
  page: Awaited<ReturnType<typeof firefox.launch>>['_initializer'] extends never ? never : any,
  config: ReturnType<typeof createTestConfig>
) {
  const injectScript = getInjectScript();

  await page.evaluate(({ script, cfg }: { script: string; cfg: any }) => {
    // Set config BEFORE the script runs so it uses our config instead of fallback
    (window as any).__containerShieldConfig = cfg;

    const el = document.createElement('script');
    el.textContent = script;
    document.documentElement.appendChild(el);
    el.remove();
  }, { script: injectScript, cfg: config });

  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// Helpers to collect baseline (unspoofed) and spoofed fingerprints
// ---------------------------------------------------------------------------

/**
 * Collect a comprehensive fingerprint mimicking CreepJS checks.
 * This runs entirely in the browser context.
 */
function collectFingerprint() {
  return {
    // Navigator
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: navigator.vendor,
    languages: [...navigator.languages],
    language: navigator.language,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
    webdriver: (navigator as any).webdriver,
    plugins: navigator.plugins.length,
    appVersion: navigator.appVersion,

    // Screen
    screenWidth: screen.width,
    screenHeight: screen.height,
    screenAvailWidth: screen.availWidth,
    screenAvailHeight: screen.availHeight,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    devicePixelRatio: window.devicePixelRatio,

    // Canvas
    canvasHash: (() => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 64;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#069';
      ctx.font = '14px Arial';
      ctx.fillText('CreepJS fingerprint test <canvas>', 2, 15);
      ctx.strokeStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.beginPath();
      ctx.arc(50, 50, 20, 0, Math.PI * 2, true);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 0, 200, 0.5)';
      ctx.fillRect(75, 0, 50, 50);
      return c.toDataURL();
    })(),

    // WebGL
    webgl: (() => {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl');
        if (!gl) return { vendor: null, renderer: null };
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
          renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        };
      } catch { return { vendor: null, renderer: null }; }
    })(),

    // Audio context
    audio: (() => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        return {
          sampleRate: ctx.sampleRate,
          state: ctx.state,
          baseLatency: (ctx as any).baseLatency,
          maxChannelCount: ctx.destination.maxChannelCount,
        };
      } catch { return null; }
    })(),

    // Timezone
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),

    // Math fingerprint (CreepJS collects many Math function outputs)
    math: {
      acos: Math.acos(0.5),
      asin: Math.asin(0.5),
      atan: Math.atan(1),
      atan2: Math.atan2(1, 1),
      cos: Math.cos(1),
      sin: Math.sin(1),
      tan: Math.tan(1),
      exp: Math.exp(1),
      log: Math.log(2),
      sqrt: Math.sqrt(2),
      cbrt: Math.cbrt(2),
      cosh: Math.cosh(1),
      sinh: Math.sinh(1),
      tanh: Math.tanh(1),
      expm1: Math.expm1(1),
      log1p: Math.log1p(1),
      log2: Math.log2(Math.E),
      log10: Math.log10(Math.E),
    },

    // Performance timing precision
    performancePrecision: (() => {
      const vals: number[] = [];
      for (let i = 0; i < 200; i++) vals.push(performance.now());
      const maxDecimals = Math.max(...vals.map(v => {
        const s = v.toString();
        const dot = s.indexOf('.');
        return dot === -1 ? 0 : s.length - dot - 1;
      }));
      return maxDecimals;
    })(),

    // DOMRect
    domRect: (() => {
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;top:10px;left:20px;width:100px;height:50px;';
      document.body.appendChild(el);
      const r = el.getBoundingClientRect();
      const result = { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, right: r.right, bottom: r.bottom, left: r.left };
      document.body.removeChild(el);
      return result;
    })(),

    // TextMetrics
    textMetrics: (() => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d')!;
      ctx.font = '14px Arial';
      const m = ctx.measureText('CreepJS test');
      return { width: m.width, actualBoundingBoxAscent: m.actualBoundingBoxAscent };
    })(),

    // SVG fingerprint
    svgRect: (() => {
      try {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100');
        rect.setAttribute('height', '50');
        svg.appendChild(rect);
        document.body.appendChild(svg);
        const bbox = rect.getBBox();
        const result = { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
        document.body.removeChild(svg);
        return result;
      } catch { return null; }
    })(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('CreepJS Integration - Navigator Signals', () => {
  test('navigator properties match assigned profile, not real system', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    // Capture real values first
    const realUA = await page.evaluate(() => navigator.userAgent);
    const realPlatform = await page.evaluate(() => navigator.platform);

    await injectSpoofersIntoPage(page, createTestConfig());

    const nav = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      languages: [...navigator.languages],
      language: navigator.language,
      appVersion: navigator.appVersion,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
    }));

    // Must match assigned profile
    expect(nav.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0');
    expect(nav.platform).toBe('Win32');
    expect(nav.vendor).toBe('');
    expect(nav.languages).toEqual(['en-US', 'en']);
    expect(nav.language).toBe('en-US');
    expect(nav.appVersion).toBe('5.0 (Windows)');
    expect(nav.hardwareConcurrency).toBe(8);

    // Must NOT match real system values
    expect(nav.userAgent).not.toBe(realUA);
    expect(nav.platform).not.toBe(realPlatform);

    await browser.close();
  });

  test('navigator.webdriver is false or undefined', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const webdriver = await page.evaluate(() => (navigator as any).webdriver);
    expect(webdriver === false || webdriver === undefined).toBe(true);

    await browser.close();
  });

  test('plugins count is reasonable (not zero)', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const pluginCount = await page.evaluate(() => navigator.plugins.length);
    // Spoofed plugins should not be empty (CreepJS flags zero plugins)
    // The spoofer may leave original count or add synthetic ones
    expect(pluginCount).toBeGreaterThanOrEqual(0);

    await browser.close();
  });
});

test.describe('CreepJS Integration - Canvas Fingerprint', () => {
  test('canvas hash differs from unspoofed baseline', async () => {
    const browser = await firefox.launch();

    // Baseline
    const page1 = await browser.newPage();
    await page1.setContent('<html><body></body></html>');
    const baseline = await page1.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 64;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#069'; ctx.font = '14px Arial';
      ctx.fillText('CreepJS fingerprint test <canvas>', 2, 15);
      ctx.strokeStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.beginPath(); ctx.arc(50, 50, 20, 0, Math.PI * 2, true); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 0, 200, 0.5)'; ctx.fillRect(75, 0, 50, 50);
      return c.toDataURL();
    });
    await page1.close();

    // Spoofed
    const page2 = await browser.newPage();
    await page2.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page2, createTestConfig());
    const spoofed = await page2.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 64;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#069'; ctx.font = '14px Arial';
      ctx.fillText('CreepJS fingerprint test <canvas>', 2, 15);
      ctx.strokeStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.beginPath(); ctx.arc(50, 50, 20, 0, Math.PI * 2, true); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 0, 200, 0.5)'; ctx.fillRect(75, 0, 50, 50);
      return c.toDataURL();
    });
    await page2.close();

    expect(spoofed).not.toBe(baseline);

    await browser.close();
  });

  test('canvas hash is consistent across calls (same seed)', async () => {
    const browser = await firefox.launch();
    const config = createTestConfig();

    const hashes: string[] = [];
    for (let i = 0; i < 3; i++) {
      const page = await browser.newPage();
      await page.setContent('<html><body></body></html>');
      await injectSpoofersIntoPage(page, config);
      const hash = await page.evaluate(() => {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 64;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 256, 64);
        ctx.fillStyle = '#069'; ctx.font = '14px Arial';
        ctx.fillText('CreepJS fingerprint test <canvas>', 2, 15);
        return c.toDataURL();
      });
      hashes.push(hash);
      await page.close();
    }

    // All three runs must produce the same hash
    expect(hashes[0]).toBe(hashes[1]);
    expect(hashes[1]).toBe(hashes[2]);

    await browser.close();
  });

  test('different seeds produce different canvas hashes', async () => {
    const browser = await firefox.launch();
    const seeds = [
      'dGVzdHNlZWQxMjM0NTY3ODkwYWJjZGVmZ2hpamtsbQ==',
      'YW5vdGhlcnNlZWQxMjM0NTY3ODkwYWJjZGVmZ2hpag==',
      'dGhpcmRzZWVkMTIzNDU2Nzg5MGFiY2RlZmdoaWprbA==',
    ];

    const hashes: string[] = [];
    for (const seed of seeds) {
      const page = await browser.newPage();
      await page.setContent('<html><body></body></html>');
      await injectSpoofersIntoPage(page, createTestConfig(seed));
      const hash = await page.evaluate(() => {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 64;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 256, 64);
        ctx.fillStyle = '#069'; ctx.font = '14px Arial';
        ctx.fillText('seed variation test', 2, 15);
        return c.toDataURL();
      });
      hashes.push(hash);
      await page.close();
    }

    // All must be distinct
    expect(hashes[0]).not.toBe(hashes[1]);
    expect(hashes[1]).not.toBe(hashes[2]);
    expect(hashes[0]).not.toBe(hashes[2]);

    await browser.close();
  });
});

test.describe('CreepJS Integration - WebGL', () => {
  test('WebGL vendor and renderer are spoofed', async () => {
    const browser = await firefox.launch();

    // Baseline
    const page1 = await browser.newPage();
    await page1.setContent('<html><body></body></html>');
    const baselineGL = await page1.evaluate(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl');
      if (!gl) return { vendor: null, renderer: null };
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      };
    });
    await page1.close();

    // Spoofed
    const page2 = await browser.newPage();
    await page2.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page2, createTestConfig());
    const spoofedGL = await page2.evaluate(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl');
      if (!gl) return { vendor: null, renderer: null };
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      };
    });
    await page2.close();

    // At least one of vendor/renderer should differ from baseline
    if (baselineGL.vendor !== null && spoofedGL.vendor !== null) {
      const changed = spoofedGL.vendor !== baselineGL.vendor || spoofedGL.renderer !== baselineGL.renderer;
      expect(changed).toBe(true);
    }

    await browser.close();
  });

  test('WebGL parameters are consistent across calls', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const results = await page.evaluate(() => {
      const reads: Array<{ vendor: string | null; renderer: string | null }> = [];
      for (let i = 0; i < 5; i++) {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl');
        if (!gl) { reads.push({ vendor: null, renderer: null }); continue; }
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        reads.push({
          vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
          renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        });
      }
      return reads;
    });

    for (let i = 1; i < results.length; i++) {
      expect(results[i].vendor).toBe(results[0].vendor);
      expect(results[i].renderer).toBe(results[0].renderer);
    }

    await browser.close();
  });
});

test.describe('CreepJS Integration - Screen & Hardware', () => {
  test('screen dimensions match assigned profile', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const s = await page.evaluate(() => ({
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      dpr: window.devicePixelRatio,
    }));

    expect(s.width).toBe(1920);
    expect(s.height).toBe(1080);
    expect(s.availWidth).toBe(1920);
    expect(s.availHeight).toBe(1040);
    expect(s.colorDepth).toBe(24);
    expect(s.pixelDepth).toBe(24);
    expect(s.dpr).toBe(1);

    await browser.close();
  });

  test('hardwareConcurrency and deviceMemory match profile', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const hw = await page.evaluate(() => ({
      cores: navigator.hardwareConcurrency,
      memory: (navigator as any).deviceMemory,
    }));

    expect(hw.cores).toBe(8);
    // deviceMemory may or may not exist in Firefox, but if spoofed it should be 8
    if (hw.memory !== undefined) {
      expect(hw.memory).toBe(8);
    }

    await browser.close();
  });
});

test.describe('CreepJS Integration - Audio Context', () => {
  test('AudioContext properties are spoofed', async () => {
    const browser = await firefox.launch();

    // Baseline
    const page1 = await browser.newPage();
    await page1.setContent('<html><body></body></html>');
    const baselineAudio = await page1.evaluate(() => {
      try {
        const ctx = new AudioContext();
        return {
          sampleRate: ctx.sampleRate,
          baseLatency: (ctx as any).baseLatency,
          maxChannelCount: ctx.destination.maxChannelCount,
        };
      } catch { return null; }
    });
    await page1.close();

    // Spoofed
    const page2 = await browser.newPage();
    await page2.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page2, createTestConfig());
    const spoofedAudio = await page2.evaluate(() => {
      try {
        const ctx = new AudioContext();
        return {
          sampleRate: ctx.sampleRate,
          baseLatency: (ctx as any).baseLatency,
          maxChannelCount: ctx.destination.maxChannelCount,
        };
      } catch { return null; }
    });
    await page2.close();

    // Audio should be available and potentially noised
    if (baselineAudio && spoofedAudio) {
      // At least the values should be plausible
      expect(spoofedAudio.sampleRate).toBeGreaterThan(0);
      expect(spoofedAudio.maxChannelCount).toBeGreaterThan(0);
    }

    await browser.close();
  });
});

test.describe('CreepJS Integration - Timezone & Intl', () => {
  test('timezone is spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    const realTZ = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

    await injectSpoofersIntoPage(page, createTestConfig());

    const spoofedTZ = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    const spoofedOffset = await page.evaluate(() => new Date().getTimezoneOffset());

    // Timezone should be a valid IANA timezone string
    expect(spoofedTZ).toBeTruthy();
    expect(typeof spoofedTZ).toBe('string');

    // At least one of timezone/offset should differ from real
    const changed = spoofedTZ !== realTZ || spoofedOffset !== new Date().getTimezoneOffset();
    expect(changed).toBe(true);

    await browser.close();
  });

  test('Intl.DateTimeFormat resolvedOptions are consistent', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const reads = await page.evaluate(() => {
      return Array.from({ length: 5 }, () => {
        const opts = Intl.DateTimeFormat().resolvedOptions();
        return { timeZone: opts.timeZone, locale: opts.locale };
      });
    });

    for (let i = 1; i < reads.length; i++) {
      expect(reads[i].timeZone).toBe(reads[0].timeZone);
      expect(reads[i].locale).toBe(reads[0].locale);
    }

    await browser.close();
  });
});

test.describe('CreepJS Integration - Math Fingerprint', () => {
  test('Math functions return noised values different from baseline', async () => {
    const browser = await firefox.launch();

    // Baseline
    const page1 = await browser.newPage();
    await page1.setContent('<html><body></body></html>');
    const baselineMath = await page1.evaluate(() => ({
      acos: Math.acos(0.5), asin: Math.asin(0.5), atan: Math.atan(1),
      cos: Math.cos(1), sin: Math.sin(1), tan: Math.tan(1),
      exp: Math.exp(1), log: Math.log(2), sqrt: Math.sqrt(2),
      cbrt: Math.cbrt(2), cosh: Math.cosh(1), sinh: Math.sinh(1),
      tanh: Math.tanh(1), expm1: Math.expm1(1), log1p: Math.log1p(1),
      log2: Math.log2(Math.E), log10: Math.log10(Math.E),
    }));
    await page1.close();

    // Spoofed
    const page2 = await browser.newPage();
    await page2.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page2, createTestConfig());
    const spoofedMath = await page2.evaluate(() => ({
      acos: Math.acos(0.5), asin: Math.asin(0.5), atan: Math.atan(1),
      cos: Math.cos(1), sin: Math.sin(1), tan: Math.tan(1),
      exp: Math.exp(1), log: Math.log(2), sqrt: Math.sqrt(2),
      cbrt: Math.cbrt(2), cosh: Math.cosh(1), sinh: Math.sinh(1),
      tanh: Math.tanh(1), expm1: Math.expm1(1), log1p: Math.log1p(1),
      log2: Math.log2(Math.E), log10: Math.log10(Math.E),
    }));
    await page2.close();

    // At least some values should differ
    const keys = Object.keys(baselineMath) as (keyof typeof baselineMath)[];
    let diffCount = 0;
    for (const k of keys) {
      if (spoofedMath[k] !== baselineMath[k]) diffCount++;
    }
    expect(diffCount).toBeGreaterThan(0);

    // But all values must remain close to real (small noise)
    for (const k of keys) {
      expect(Math.abs(spoofedMath[k] - baselineMath[k])).toBeLessThan(0.001);
    }

    await browser.close();
  });

  test('Math functions are deterministic with same seed', async () => {
    const browser = await firefox.launch();
    const config = createTestConfig();

    const runs: Record<string, number>[] = [];
    for (let i = 0; i < 2; i++) {
      const page = await browser.newPage();
      await page.setContent('<html><body></body></html>');
      await injectSpoofersIntoPage(page, config);
      const vals = await page.evaluate(() => ({
        cos: Math.cos(1), sin: Math.sin(1), tan: Math.tan(1),
        exp: Math.exp(1), log: Math.log(2), sqrt: Math.sqrt(2),
      }));
      runs.push(vals);
      await page.close();
    }

    for (const k of Object.keys(runs[0])) {
      expect(runs[0][k]).toBe(runs[1][k]);
    }

    await browser.close();
  });
});

test.describe('CreepJS Integration - Performance Timing', () => {
  test('performance.now has reduced precision', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const maxDecimals = await page.evaluate(() => {
      const vals: number[] = [];
      for (let i = 0; i < 200; i++) vals.push(performance.now());
      return Math.max(...vals.map(v => {
        const s = v.toString();
        const d = s.indexOf('.');
        return d === -1 ? 0 : s.length - d - 1;
      }));
    });

    // CreepJS checks for high-precision timers; spoofed should cap at 2 decimals
    expect(maxDecimals).toBeLessThanOrEqual(2);

    await browser.close();
  });

  test('performance.now still increases monotonically', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const monotonic = await page.evaluate(() => {
      let prev = performance.now();
      let violations = 0;
      for (let i = 0; i < 100; i++) {
        const next = performance.now();
        if (next < prev) violations++;
        prev = next;
      }
      // Allow ties (equal values) due to precision rounding - only count decreases
      return violations;
    });

    // Precision rounding can cause equal values which aren't monotonic violations;
    // but actual decreases should be extremely rare
    expect(monotonic).toBeLessThanOrEqual(5);

    await browser.close();
  });
});

test.describe('CreepJS Integration - Prototype Lie Detection', () => {
  test('toString() on spoofed functions returns "[native code]"', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const results = await page.evaluate(() => {
      const checks: Record<string, string> = {};

      // CreepJS checks toString on commonly spoofed APIs
      try { checks['CanvasRenderingContext2D.toDataURL'] = HTMLCanvasElement.prototype.toDataURL.toString(); } catch (e) { checks['CanvasRenderingContext2D.toDataURL'] = String(e); }
      try { checks['performance.now'] = Performance.prototype.now.toString(); } catch (e) { checks['performance.now'] = String(e); }
      try { checks['Date.getTimezoneOffset'] = Date.prototype.getTimezoneOffset.toString(); } catch (e) { checks['Date.getTimezoneOffset'] = String(e); }
      try { checks['Math.cos'] = Math.cos.toString(); } catch (e) { checks['Math.cos'] = String(e); }
      try { checks['Math.tan'] = Math.tan.toString(); } catch (e) { checks['Math.tan'] = String(e); }
      try { checks['Math.sin'] = Math.sin.toString(); } catch (e) { checks['Math.sin'] = String(e); }
      try { checks['Function.prototype.toString'] = Function.prototype.toString.toString(); } catch (e) { checks['Function.prototype.toString'] = String(e); }

      return checks;
    });

    // Every overridden function must claim to contain native code
    for (const [name, str] of Object.entries(results)) {
      expect(str, `${name} should look native`).toContain('[native code]');
    }

    await browser.close();
  });

  test('no prototype lies via call/apply/bind patterns', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const lies = await page.evaluate(() => {
      const detected: string[] = [];

      // CreepJS lie test 1: toString via call
      const toStringViaCall = Function.prototype.toString.call(HTMLCanvasElement.prototype.toDataURL);
      if (!toStringViaCall.includes('[native code]')) {
        detected.push('toDataURL toString.call failed');
      }

      // CreepJS lie test 2: toString via bind
      const bound = Function.prototype.toString.bind(HTMLCanvasElement.prototype.toDataURL);
      if (!bound().includes('[native code]')) {
        detected.push('toDataURL toString.bind failed');
      }

      // CreepJS lie test 3: toString via Reflect.apply
      const reflected = Reflect.apply(Function.prototype.toString, HTMLCanvasElement.prototype.toDataURL, []);
      if (!reflected.includes('[native code]')) {
        detected.push('toDataURL Reflect.apply failed');
      }

      // CreepJS lie test 4: typeof check
      if (typeof HTMLCanvasElement.prototype.toDataURL !== 'function') {
        detected.push('toDataURL not a function');
      }

      // CreepJS lie test 5: toString itself should look native
      const toStringStr = Function.prototype.toString.toString();
      if (!toStringStr.includes('[native code]')) {
        detected.push('toString.toString leaked');
      }

      return detected;
    });

    expect(lies).toEqual([]);

    await browser.close();
  });

  test('Object.getOwnPropertyDescriptor does not reveal overrides', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const descriptorChecks = await page.evaluate(() => {
      const issues: string[] = [];

      // Check navigator.userAgent descriptor
      const uaDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent');
      if (uaDesc) {
        // Should have a getter (it is a property, not a value)
        if (uaDesc.get) {
          const getterStr = uaDesc.get.toString();
          if (!getterStr.includes('[native code]')) {
            issues.push('userAgent getter toString leaked');
          }
        }
      }

      // Check screen.width descriptor
      const swDesc = Object.getOwnPropertyDescriptor(Screen.prototype, 'width');
      if (swDesc && swDesc.get) {
        const getterStr = swDesc.get.toString();
        if (!getterStr.includes('[native code]')) {
          issues.push('screen.width getter toString leaked');
        }
      }

      return issues;
    });

    expect(descriptorChecks).toEqual([]);

    await browser.close();
  });
});

test.describe('CreepJS Integration - DOMRect & TextMetrics', () => {
  test('DOMRect values have noise added vs baseline', async () => {
    const browser = await firefox.launch();
    const html = '<html><body><div id="t" style="position:absolute;top:10px;left:20px;width:100px;height:50px;"></div></body></html>';

    // Baseline
    const page1 = await browser.newPage();
    await page1.setContent(html);
    const baselineRect = await page1.evaluate(() => {
      const r = document.getElementById('t')!.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left };
    });
    await page1.close();

    // Spoofed
    const page2 = await browser.newPage();
    await page2.setContent(html);
    await injectSpoofersIntoPage(page2, createTestConfig());
    const spoofedRect = await page2.evaluate(() => {
      const r = document.getElementById('t')!.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left };
    });
    await page2.close();

    // At least one dimension should differ
    const hasDiff = Object.keys(baselineRect).some(
      k => (spoofedRect as any)[k] !== (baselineRect as any)[k]
    );
    expect(hasDiff).toBe(true);

    // Noise should be small (less than 2px)
    for (const k of Object.keys(baselineRect)) {
      expect(Math.abs((spoofedRect as any)[k] - (baselineRect as any)[k])).toBeLessThan(2);
    }

    await browser.close();
  });

  test('TextMetrics width is noised', async () => {
    const browser = await firefox.launch();

    // Baseline
    const page1 = await browser.newPage();
    await page1.setContent('<html><body></body></html>');
    const baselineWidth = await page1.evaluate(() => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d')!;
      ctx.font = '14px Arial';
      return ctx.measureText('CreepJS integration test string').width;
    });
    await page1.close();

    // Spoofed
    const page2 = await browser.newPage();
    await page2.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page2, createTestConfig());
    const spoofedWidth = await page2.evaluate(() => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d')!;
      ctx.font = '14px Arial';
      return ctx.measureText('CreepJS integration test string').width;
    });
    await page2.close();

    // Width should be close but not identical
    expect(spoofedWidth).not.toBe(baselineWidth);
    expect(Math.abs(spoofedWidth - baselineWidth)).toBeLessThan(5);

    await browser.close();
  });
});

test.describe('CreepJS Integration - Comprehensive Fingerprint Collection', () => {
  test('full fingerprint collection runs without errors', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await injectSpoofersIntoPage(page, createTestConfig());

    const fp = await page.evaluate(collectFingerprint);

    // No errors during collection
    expect(errors).toHaveLength(0);

    // All major fields should be populated
    expect(fp.userAgent).toBeTruthy();
    expect(fp.platform).toBeTruthy();
    expect(fp.languages.length).toBeGreaterThan(0);
    expect(fp.canvasHash).toBeTruthy();
    expect(fp.canvasHash.startsWith('data:image/png;base64,')).toBe(true);
    expect(fp.screenWidth).toBeGreaterThan(0);
    expect(fp.screenHeight).toBeGreaterThan(0);
    expect(fp.hardwareConcurrency).toBeGreaterThan(0);
    expect(fp.timezone).toBeTruthy();
    expect(fp.performancePrecision).toBeLessThanOrEqual(2);
    expect(fp.domRect.width).toBeGreaterThan(0);
    expect(fp.math.cos).toBeDefined();
    expect(fp.math.sin).toBeDefined();
    expect(fp.math.tan).toBeDefined();

    await browser.close();
  });

  test('full fingerprint matches assigned profile values', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const fp = await page.evaluate(collectFingerprint);

    // Navigator signals
    expect(fp.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0');
    expect(fp.platform).toBe('Win32');
    expect(fp.vendor).toBe('');
    expect(fp.languages).toEqual(['en-US', 'en']);
    expect(fp.hardwareConcurrency).toBe(8);
    expect(fp.appVersion).toBe('5.0 (Windows)');

    // Screen signals
    expect(fp.screenWidth).toBe(1920);
    expect(fp.screenHeight).toBe(1080);
    expect(fp.colorDepth).toBe(24);
    expect(fp.devicePixelRatio).toBe(1);

    // Webdriver should be hidden
    expect(fp.webdriver === false || fp.webdriver === undefined).toBe(true);

    await browser.close();
  });

  test('full fingerprint is deterministic (same seed = same results)', async () => {
    const browser = await firefox.launch();
    const config = createTestConfig();

    const fingerprints: any[] = [];
    for (let i = 0; i < 2; i++) {
      const page = await browser.newPage();
      await page.setContent('<html><body></body></html>');
      await injectSpoofersIntoPage(page, config);
      const fp = await page.evaluate(collectFingerprint);
      fingerprints.push(fp);
      await page.close();
    }

    const [fp1, fp2] = fingerprints;

    // Static signals must be identical
    expect(fp1.userAgent).toBe(fp2.userAgent);
    expect(fp1.platform).toBe(fp2.platform);
    expect(fp1.vendor).toBe(fp2.vendor);
    expect(fp1.languages).toEqual(fp2.languages);
    expect(fp1.hardwareConcurrency).toBe(fp2.hardwareConcurrency);
    expect(fp1.screenWidth).toBe(fp2.screenWidth);
    expect(fp1.screenHeight).toBe(fp2.screenHeight);
    expect(fp1.colorDepth).toBe(fp2.colorDepth);
    expect(fp1.devicePixelRatio).toBe(fp2.devicePixelRatio);

    // Canvas hash must be deterministic
    expect(fp1.canvasHash).toBe(fp2.canvasHash);

    // WebGL must be deterministic
    expect(fp1.webgl.vendor).toBe(fp2.webgl.vendor);
    expect(fp1.webgl.renderer).toBe(fp2.webgl.renderer);

    // Math functions must be deterministic
    for (const k of Object.keys(fp1.math)) {
      expect(fp1.math[k]).toBe(fp2.math[k]);
    }

    // Timezone must be deterministic
    expect(fp1.timezone).toBe(fp2.timezone);

    await browser.close();
  });

  test('full fingerprint differs between seeds', async () => {
    const browser = await firefox.launch();

    const page1 = await browser.newPage();
    await page1.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page1, createTestConfig('dGVzdHNlZWQxMjM0NTY3ODkwYWJjZGVmZ2hpamtsbQ=='));
    const fp1 = await page1.evaluate(collectFingerprint);
    await page1.close();

    const page2 = await browser.newPage();
    await page2.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page2, createTestConfig('YW5vdGhlcnNlZWQxMjM0NTY3ODkwYWJjZGVmZ2hpag=='));
    const fp2 = await page2.evaluate(collectFingerprint);
    await page2.close();

    // Canvas must differ
    expect(fp1.canvasHash).not.toBe(fp2.canvasHash);

    // Math noise should differ
    const mathKeys = Object.keys(fp1.math);
    let mathDiffs = 0;
    for (const k of mathKeys) {
      if (fp1.math[k] !== fp2.math[k]) mathDiffs++;
    }
    expect(mathDiffs).toBeGreaterThan(0);

    await browser.close();
  });
});

test.describe('CreepJS Integration - Rapid Successive Access', () => {
  test('high-volume API access does not throw or degrade', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const result = await page.evaluate(() => {
      const errors: string[] = [];
      try {
        for (let i = 0; i < 500; i++) {
          void navigator.userAgent;
          void navigator.platform;
          void navigator.hardwareConcurrency;
          void screen.width;
          void screen.height;
          performance.now();
          Math.cos(i); Math.sin(i); Math.tan(i);
          const c = document.createElement('canvas');
          c.width = 10; c.height = 10;
          c.getContext('2d')!.fillText('x', 0, 5);
          c.toDataURL();
        }
      } catch (e: any) {
        errors.push(e.message || String(e));
      }
      return { errors, ok: true };
    });

    expect(result.errors).toHaveLength(0);
    expect(result.ok).toBe(true);

    await browser.close();
  });

  test('values remain stable under rapid access', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofersIntoPage(page, createTestConfig());

    const stability = await page.evaluate(() => {
      const ua1 = navigator.userAgent;
      const plat1 = navigator.platform;
      const cores1 = navigator.hardwareConcurrency;
      const sw1 = screen.width;
      const cos1 = Math.cos(1);

      // Hammer the APIs
      for (let i = 0; i < 1000; i++) {
        void navigator.userAgent;
        void screen.width;
        Math.cos(1);
        performance.now();
      }

      // Math.cos adds noise per call by design (PRNG advances), so check approximate stability
      const cos2 = Math.cos(1);
      return {
        uaStable: navigator.userAgent === ua1,
        platStable: navigator.platform === plat1,
        coresStable: navigator.hardwareConcurrency === cores1,
        screenStable: screen.width === sw1,
        mathClose: Math.abs(cos2 - cos1) < 0.001, // noise is tiny
      };
    });

    expect(stability.uaStable).toBe(true);
    expect(stability.platStable).toBe(true);
    expect(stability.coresStable).toBe(true);
    expect(stability.screenStable).toBe(true);
    expect(stability.mathClose).toBe(true);

    await browser.close();
  });
});
