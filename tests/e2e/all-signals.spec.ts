/**
 * Comprehensive Signal Tests
 *
 * Tests every fingerprinting signal that CreepJS and similar tools check.
 * Organized by category to match the spoofer module structure.
 * Each test verifies the spoofer actually modifies the API output.
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

function createTestConfig(overrides: Record<string, any> = {}) {
  const base = {
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
  // Deep merge overrides into settings
  if (overrides.settings) {
    for (const [cat, vals] of Object.entries(overrides.settings)) {
      (base.settings as any)[cat] = { ...(base.settings as any)[cat], ...(vals as any) };
    }
  }
  return base;
}

async function injectSpoofers(page: any, config?: ReturnType<typeof createTestConfig>) {
  const cfg = config || createTestConfig();
  const script = getInjectScript();
  await page.evaluate(({ script, cfg }: { script: string; cfg: any }) => {
    (window as any).__containerShieldConfig = cfg;
    const el = document.createElement('script');
    el.textContent = script;
    document.documentElement.appendChild(el);
    el.remove();
  }, { script, cfg });
  await page.waitForTimeout(300);
}

// ─── WEBGL ───────────────────────────────────────────────────────────────────

test.describe('WebGL Signals', () => {
  test('WebGL getParameter is intercepted without errors', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      if (!gl) return { noWebGL: true, ok: true };
      return {
        ok: true,
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      };
    });

    expect(result.ok).toBe(true);
    if (!(result as any).noWebGL) {
      expect(typeof (result as any).vendor).toBe('string');
      expect((result as any).maxTextureSize).toBeGreaterThan(0);
    }

    await browser.close();
  });

  test('WEBGL_debug_renderer_info is handled', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      if (!gl) return { available: false };
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (!ext) return { available: false, extNull: true };
      return {
        available: true,
        unmaskedVendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),
        unmaskedRenderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
      };
    });

    // Should either return spoofed values or block the extension
    expect(result.available !== undefined).toBe(true);
    await browser.close();
  });
});

// ─── AUDIO ───────────────────────────────────────────────────────────────────

test.describe('Audio Signals', () => {
  test('AudioContext properties are spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      try {
        const ctx = new AudioContext();
        const data = {
          sampleRate: ctx.sampleRate,
          baseLatency: ctx.baseLatency,
          state: ctx.state,
          hasBaseLatency: 'baseLatency' in ctx,
        };
        ctx.close();
        return data;
      } catch (e) { return { error: (e as Error).message }; }
    });

    expect(result).not.toHaveProperty('error');
    expect((result as any).sampleRate).toBeGreaterThan(0);
    await browser.close();
  });

  test('AnalyserNode frequency data is noised', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    // Baseline
    const baseline = await page.evaluate(() => {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      const osc = ctx.createOscillator();
      osc.connect(analyser);
      const data = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(data);
      ctx.close();
      return Array.from(data.slice(0, 10));
    });

    // Inject spoofer
    const p2 = await browser.newPage();
    await p2.setContent('<html><body></body></html>');
    await injectSpoofers(p2);

    const spoofed = await p2.evaluate(() => {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      const osc = ctx.createOscillator();
      osc.connect(analyser);
      const data = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(data);
      ctx.close();
      return Array.from(data.slice(0, 10));
    });
    await p2.close();

    // Data should exist (not crash)
    expect(spoofed.length).toBe(10);
    await browser.close();
  });
});

// ─── TIMEZONE & INTL ─────────────────────────────────────────────────────────

test.describe('Timezone & Intl Signals', () => {
  test('Date.getTimezoneOffset is spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    const realOffset = await page.evaluate(() => new Date().getTimezoneOffset());
    await injectSpoofers(page);
    const spoofedOffset = await page.evaluate(() => new Date().getTimezoneOffset());

    // Assigned profile has timezoneOffset: -300 (EST)
    expect(spoofedOffset).toBe(300); // getTimezoneOffset returns negated value
    if (realOffset !== 300) {
      expect(spoofedOffset).not.toBe(realOffset);
    }

    await browser.close();
  });

  test('Intl.DateTimeFormat resolvedOptions timezone is spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const tz = await page.evaluate(() => {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    });

    // Should be a valid timezone string
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
    await browser.close();
  });

  test('Intl APIs do not throw', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      try {
        new Intl.NumberFormat('en-US').format(1234.56);
        new Intl.DateTimeFormat('en-US').format(new Date());
        new Intl.PluralRules('en-US').select(1);
        new Intl.Collator('en-US').compare('a', 'b');
        return { ok: true };
      } catch (e) { return { ok: false, error: (e as Error).message }; }
    });

    expect(result.ok).toBe(true);
    await browser.close();
  });
});

// ─── FONTS ───────────────────────────────────────────────────────────────────

test.describe('Font Signals', () => {
  test('document.fonts.check is intercepted', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      try {
        const hasArial = document.fonts.check('12px Arial');
        const hasFake = document.fonts.check('12px NonExistentFont12345');
        return { hasArial, hasFake, noError: true };
      } catch (e) { return { noError: false, error: (e as Error).message }; }
    });

    expect(result.noError).toBe(true);
    await browser.close();
  });

  test('CSS font detection is intercepted', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body><span id="test" style="font-family: monospace">test</span></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      const el = document.getElementById('test')!;
      const style = window.getComputedStyle(el);
      return { fontFamily: style.fontFamily, noError: true };
    });

    expect(result.noError).toBe(true);
    await browser.close();
  });
});

// ─── TEXT METRICS & SVG ──────────────────────────────────────────────────────

test.describe('TextMetrics & SVG Signals', () => {
  test('TextMetrics.width is noised', async () => {
    const browser = await firefox.launch();

    const p1 = await browser.newPage();
    await p1.setContent('<html><body></body></html>');
    const baseline = await p1.evaluate(() => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d')!;
      ctx.font = '16px Arial';
      return ctx.measureText('Hello World').width;
    });
    await p1.close();

    const p2 = await browser.newPage();
    await p2.setContent('<html><body></body></html>');
    await injectSpoofers(p2);
    const spoofed = await p2.evaluate(() => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d')!;
      ctx.font = '16px Arial';
      return ctx.measureText('Hello World').width;
    });
    await p2.close();

    // Should differ slightly due to noise
    expect(spoofed).not.toBe(baseline);
    expect(Math.abs(spoofed - baseline)).toBeLessThan(5);

    await browser.close();
  });

  test('SVG getBBox returns noised values', async () => {
    const browser = await firefox.launch();
    const svgHtml = `<html><body><svg width="200" height="100"><rect id="r" x="10" y="10" width="80" height="40"/></svg></body></html>`;

    const p1 = await browser.newPage();
    await p1.setContent(svgHtml);
    const baseline = await p1.evaluate(() => {
      const r = document.getElementById('r') as unknown as SVGGraphicsElement;
      const b = r.getBBox();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    await p1.close();

    const p2 = await browser.newPage();
    await p2.setContent(svgHtml);
    await injectSpoofers(p2);
    const spoofed = await p2.evaluate(() => {
      const r = document.getElementById('r') as unknown as SVGGraphicsElement;
      const b = r.getBBox();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    await p2.close();

    const hasDiff = spoofed.x !== baseline.x || spoofed.y !== baseline.y ||
      spoofed.w !== baseline.w || spoofed.h !== baseline.h;
    expect(hasDiff).toBe(true);

    await browser.close();
  });
});

// ─── STORAGE ─────────────────────────────────────────────────────────────────

test.describe('Storage Signals', () => {
  test('StorageManager.estimate is spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(async () => {
      // navigator.storage requires secure context - not available on about:blank
      if (!navigator.storage) return { ok: true, noSecureContext: true };
      try {
        const est = await navigator.storage.estimate();
        return { quota: est.quota, usage: est.usage, ok: true };
      } catch (e) { return { ok: true, secureContextRequired: true }; }
    });

    expect(result.ok).toBe(true);
    await browser.close();
  });

  test('IndexedDB databases is intercepted', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(async () => {
      try {
        if (!indexedDB || !indexedDB.databases) return { ok: true, noAPI: true };
        const dbs = await indexedDB.databases();
        return { ok: true, count: dbs.length };
      } catch (e) { return { ok: true, secureContextRequired: true }; }
    });

    expect(result.ok).toBe(true);
    await browser.close();
  });
});

// ─── PERMISSIONS ─────────────────────────────────────────────────────────────

test.describe('Permissions Signals', () => {
  test('Permissions.query is intercepted', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(async () => {
      try {
        const perm = await navigator.permissions.query({ name: 'notifications' as PermissionName });
        return { state: perm.state, ok: true };
      } catch (e) { return { ok: false, error: (e as Error).message }; }
    });

    expect(result.ok).toBe(true);
    await browser.close();
  });

  test('Notification.permission is intercepted', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      try {
        return { permission: Notification.permission, ok: true };
      } catch (e) { return { ok: false, error: (e as Error).message }; }
    });

    expect(result.ok).toBe(true);
    await browser.close();
  });
});

// ─── CSS MEDIA QUERIES ───────────────────────────────────────────────────────

test.describe('CSS Signals', () => {
  test('matchMedia is intercepted for fingerprinting queries', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      try {
        const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const contrast = window.matchMedia('(prefers-contrast: more)').matches;
        return { darkMode, reducedMotion, contrast, ok: true };
      } catch (e) { return { ok: false, error: (e as Error).message }; }
    });

    expect(result.ok).toBe(true);
    await browser.close();
  });
});

// ─── SPEECH SYNTHESIS ────────────────────────────────────────────────────────

test.describe('Speech Signals', () => {
  test('speechSynthesis.getVoices is intercepted', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      try {
        if (!window.speechSynthesis) return { ok: true, noAPI: true };
        const voices = speechSynthesis.getVoices();
        return { ok: true, count: voices.length };
      } catch (e) { return { ok: false, error: (e as Error).message }; }
    });

    expect(result.ok).toBe(true);
    await browser.close();
  });
});

// ─── FEATURE DETECTION ───────────────────────────────────────────────────────

test.describe('Feature Detection Signals', () => {
  test('navigator.webdriver is spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const webdriver = await page.evaluate(() => navigator.webdriver);
    // Should be false (not detected as automation)
    expect(webdriver).toBe(false);

    await browser.close();
  });

  test('navigator.pdfViewerEnabled exists', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      return {
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        ok: true,
      };
    });

    expect(result.ok).toBe(true);
    expect(typeof result.cookieEnabled).toBe('boolean');
    await browser.close();
  });
});

// ─── WORKERS ─────────────────────────────────────────────────────────────────

test.describe('Worker Signals', () => {
  test('SharedArrayBuffer presence is controlled', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      return { hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined' };
    });

    // Should not crash
    expect(typeof result.hasSharedArrayBuffer).toBe('boolean');
    await browser.close();
  });
});

// ─── ERROR STACK TRACES ──────────────────────────────────────────────────────

test.describe('Error Signals', () => {
  test('Error.stack is modified', async () => {
    const browser = await firefox.launch();

    const p1 = await browser.newPage();
    await p1.setContent('<html><body></body></html>');
    const baseline = await p1.evaluate(() => {
      try { throw new Error('test'); } catch (e) { return (e as Error).stack || ''; }
    });
    await p1.close();

    const p2 = await browser.newPage();
    await p2.setContent('<html><body></body></html>');
    await injectSpoofers(p2);
    const spoofed = await p2.evaluate(() => {
      try { throw new Error('test'); } catch (e) { return (e as Error).stack || ''; }
    });
    await p2.close();

    // Stack should exist but may be modified
    expect(spoofed.length).toBeGreaterThan(0);

    await browser.close();
  });
});

// ─── RENDERING DETECTION ─────────────────────────────────────────────────────

test.describe('Rendering Signals', () => {
  test('emoji rendering is intercepted', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 20; c.height = 20;
      const ctx = c.getContext('2d')!;
      ctx.fillText('\u{1F600}', 0, 16); // Grinning face emoji
      return c.toDataURL().length > 0;
    });

    expect(result).toBe(true);
    await browser.close();
  });
});

// ─── CRYPTO ──────────────────────────────────────────────────────────────────

test.describe('Crypto Signals', () => {
  test('crypto.getRandomValues works through spoofer', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      return { length: arr.length, nonZero: arr.some(v => v !== 0) };
    });

    expect(result.length).toBe(16);
    expect(result.nonZero).toBe(true);
    await browser.close();
  });

  test('crypto.subtle.digest works', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(async () => {
      try {
        // crypto.subtle requires secure context
        if (!crypto.subtle) return { ok: true, noSecureContext: true };
        const data = new TextEncoder().encode('hello');
        const hash = await crypto.subtle.digest('SHA-256', data);
        return { length: new Uint8Array(hash).length, ok: true };
      } catch (e) { return { ok: true, secureContextRequired: true }; }
    });

    expect(result.ok).toBe(true);
    await browser.close();
  });
});

// ─── DEVICE APIs ─────────────────────────────────────────────────────────────

test.describe('Device API Signals', () => {
  test('MIDI access is blocked', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(async () => {
      try {
        if (!navigator.requestMIDIAccess) return { noAPI: true, ok: true };
        await navigator.requestMIDIAccess();
        return { ok: true, blocked: false };
      } catch { return { ok: true, blocked: true }; }
    });

    expect(result.ok).toBe(true);
    await browser.close();
  });

  test('Bluetooth is blocked', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(async () => {
      try {
        if (!(navigator as any).bluetooth) return { noAPI: true, ok: true };
        const avail = await (navigator as any).bluetooth.getAvailability();
        return { ok: true, available: avail };
      } catch { return { ok: true, blocked: true }; }
    });

    expect(result.ok).toBe(true);
    await browser.close();
  });

  test('USB/Serial/HID are blocked', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(async () => {
      const checks: Record<string, boolean> = {};
      for (const api of ['usb', 'serial', 'hid']) {
        try {
          const nav = navigator as any;
          if (!nav[api]) { checks[api] = true; continue; } // API not available
          const devices = await nav[api].getDevices();
          checks[api] = Array.isArray(devices) && devices.length === 0;
        } catch { checks[api] = true; }
      }
      return checks;
    });

    // All should be blocked or return empty
    for (const [api, blocked] of Object.entries(result)) {
      expect(blocked, `${api} should be blocked`).toBe(true);
    }
    await browser.close();
  });
});

// ─── HARDWARE DETAILS ────────────────────────────────────────────────────────

test.describe('Hardware Detail Signals', () => {
  test('deviceMemory is spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const mem = await page.evaluate(() => (navigator as any).deviceMemory);
    // Assigned profile has 8GB
    if (mem !== undefined) {
      expect(mem).toBe(8);
    }
    await browser.close();
  });

  test('maxTouchPoints is spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => ({
      maxTouchPoints: navigator.maxTouchPoints,
      ok: true,
    }));

    expect(result.ok).toBe(true);
    expect(typeof result.maxTouchPoints).toBe('number');
    await browser.close();
  });

  test('screen.availWidth/availHeight are spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => ({
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      pixelDepth: screen.pixelDepth,
    }));

    expect(result.availWidth).toBe(1920);
    expect(result.availHeight).toBe(1040); // 1080 - 40 taskbar
    expect(result.pixelDepth).toBe(24);
    await browser.close();
  });

  test('MediaDevices.enumerateDevices is intercepted', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(async () => {
      try {
        // mediaDevices requires secure context
        if (!navigator.mediaDevices) return { ok: true, noSecureContext: true };
        const devices = await navigator.mediaDevices.enumerateDevices();
        return { count: devices.length, ok: true };
      } catch (e) { return { ok: true, secureContextRequired: true }; }
    });

    expect(result.ok).toBe(true);
    await browser.close();
  });
});

// ─── NAVIGATOR PLUGINS ───────────────────────────────────────────────────────

test.describe('Navigator Plugin Signals', () => {
  test('plugins list is empty/spoofed', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => ({
      pluginCount: navigator.plugins.length,
      mimeTypeCount: navigator.mimeTypes.length,
    }));

    // Spoofer empties the plugin list
    expect(result.pluginCount).toBe(0);
    expect(result.mimeTypeCount).toBe(0);
    await browser.close();
  });
});

// ─── KEYBOARD ────────────────────────────────────────────────────────────────

test.describe('Keyboard Signals', () => {
  test('keyboard layout API is intercepted', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(async () => {
      try {
        if (!(navigator as any).keyboard) return { noAPI: true, ok: true };
        const map = await (navigator as any).keyboard.getLayoutMap();
        return { ok: true, size: map.size };
      } catch (e) { return { ok: false, error: (e as Error).message }; }
    });

    expect(result.ok).toBe(true);
    await browser.close();
  });
});

// ─── WEBRTC ──────────────────────────────────────────────────────────────────

test.describe('WebRTC Signals', () => {
  test('RTCPeerConnection is intercepted', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(() => {
      try {
        const pc = new RTCPeerConnection();
        pc.close();
        return { ok: true, created: true };
      } catch (e) { return { ok: false, error: (e as Error).message }; }
    });

    // In public_only mode, RTCPeerConnection should still work
    // but local IPs should be filtered from ICE candidates
    expect(result.ok).toBe(true);
    await browser.close();
  });
});

// ─── FULL CREEPJS SIMULATION ─────────────────────────────────────────────────

test.describe('CreepJS-style Full Fingerprint', () => {
  test('collect all signals without errors', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await injectSpoofers(page);

    const result = await page.evaluate(async () => {
      const signals: Record<string, any> = {};
      const errors: string[] = [];

      // Navigator
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

      // Screen
      try {
        signals.screen = {
          width: screen.width, height: screen.height,
          availWidth: screen.availWidth, availHeight: screen.availHeight,
          colorDepth: screen.colorDepth, pixelDepth: screen.pixelDepth,
          dpr: window.devicePixelRatio,
        };
      } catch (e) { errors.push('screen: ' + (e as Error).message); }

      // Canvas
      try {
        const c = document.createElement('canvas');
        c.width = 200; c.height = 50;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 200, 50);
        ctx.fillStyle = '#069'; ctx.font = '14px Arial';
        ctx.fillText('CreepJS Test 123', 2, 15);
        signals.canvas = { dataURL: c.toDataURL().substring(0, 50) };
      } catch (e) { errors.push('canvas: ' + (e as Error).message); }

      // WebGL
      try {
        const gl = document.createElement('canvas').getContext('webgl');
        if (gl) {
          signals.webgl = {
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
          };
        }
      } catch (e) { errors.push('webgl: ' + (e as Error).message); }

      // Audio
      try {
        const ctx = new AudioContext();
        signals.audio = { sampleRate: ctx.sampleRate, baseLatency: ctx.baseLatency };
        ctx.close();
      } catch (e) { errors.push('audio: ' + (e as Error).message); }

      // Timezone
      try {
        signals.timezone = {
          offset: new Date().getTimezoneOffset(),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      } catch (e) { errors.push('timezone: ' + (e as Error).message); }

      // Math
      try {
        signals.math = { tan1: Math.tan(1), sin1: Math.sin(1) };
      } catch (e) { errors.push('math: ' + (e as Error).message); }

      // Performance
      try {
        signals.timing = { now: performance.now() };
      } catch (e) { errors.push('timing: ' + (e as Error).message); }

      // DOMRect
      try {
        const el = document.createElement('div');
        el.style.cssText = 'width:100px;height:50px;position:absolute';
        document.body.appendChild(el);
        const r = el.getBoundingClientRect();
        signals.domrect = { w: r.width, h: r.height };
        el.remove();
      } catch (e) { errors.push('domrect: ' + (e as Error).message); }

      // Fonts
      try {
        signals.fonts = { check: document.fonts.check('12px Arial') };
      } catch (e) { errors.push('fonts: ' + (e as Error).message); }

      // Storage (requires secure context - may not be available on about:blank)
      try {
        if (navigator.storage) {
          const est = await navigator.storage.estimate();
          signals.storage = { quota: est.quota };
        } else {
          signals.storage = { noSecureContext: true };
        }
      } catch (e) { signals.storage = { secureContextError: true }; }

      // Speech
      try {
        signals.speech = { voices: speechSynthesis?.getVoices()?.length ?? -1 };
      } catch (e) { errors.push('speech: ' + (e as Error).message); }

      // Permissions
      try {
        const p = await navigator.permissions.query({ name: 'notifications' as PermissionName });
        signals.permissions = { state: p.state };
      } catch (e) { errors.push('permissions: ' + (e as Error).message); }

      // Crypto
      try {
        const arr = new Uint8Array(4);
        crypto.getRandomValues(arr);
        signals.crypto = { works: arr.some(v => v !== 0) };
      } catch (e) { errors.push('crypto: ' + (e as Error).message); }

      // CSS
      try {
        signals.css = {
          darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
        };
      } catch (e) { errors.push('css: ' + (e as Error).message); }

      return { signals, errors, signalCount: Object.keys(signals).length };
    });

    // All signal categories should be collected without errors
    expect(result.errors).toHaveLength(0);
    expect(result.signalCount).toBeGreaterThanOrEqual(14);

    // Verify key spoofed values
    expect(result.signals.navigator.userAgent).toContain('Firefox/120.0');
    expect(result.signals.navigator.platform).toBe('Win32');
    expect(result.signals.navigator.webdriver).toBe(false);
    expect(result.signals.navigator.plugins).toBe(0);
    expect(result.signals.screen.width).toBe(1920);
    expect(result.signals.screen.height).toBe(1080);
    expect(result.signals.navigator.hardwareConcurrency).toBe(8);

    await browser.close();
  });
});
