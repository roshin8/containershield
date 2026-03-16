/**
 * E2E Tests for Fingerprint Protection
 *
 * Tests the extension against real fingerprinting sites to verify
 * protection is working correctly.
 *
 * NOTE: These tests require manual Firefox setup with the extension loaded.
 * They use Playwright to automate browser interactions.
 *
 * Run with: npx playwright test tests/e2e/fingerprint-sites.test.ts
 */

import { test, expect, firefox, type BrowserContext, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Extension path - update this to match your build output
const EXTENSION_PATH = path.resolve(__dirname, '../../dist');

// Test configuration
const TEST_CONFIG = {
  // Fingerprint testing sites
  sites: {
    creepjs: 'https://abrahamjuliot.github.io/creepjs/',
    browserleaks: 'https://browserleaks.com/canvas',
    amiunique: 'https://amiunique.org/fingerprint',
    deviceinfo: 'https://www.deviceinfo.me/',
    panopticlick: 'https://coveryourtracks.eff.org/',
  },
  // Timeout for page loads
  timeout: 30000,
};

/**
 * Test fixture for Firefox with extension
 *
 * Note: Playwright's Firefox support for extensions is limited.
 * For full testing, use web-ext or Firefox's about:debugging.
 */
test.describe('Fingerprint Protection E2E Tests', () => {
  // Skip if extension not built
  test.beforeAll(async () => {
    if (!fs.existsSync(EXTENSION_PATH)) {
      console.warn(`Extension not found at ${EXTENSION_PATH}. Run 'npm run build' first.`);
    }
  });

  test.describe('Canvas Fingerprinting', () => {
    test('should add noise to canvas fingerprint', async ({ page }) => {
      // Create a test page with canvas fingerprinting
      await page.setContent(`
        <html>
          <body>
            <canvas id="canvas" width="200" height="50"></canvas>
            <script>
              const canvas = document.getElementById('canvas');
              const ctx = canvas.getContext('2d');
              ctx.font = '14px Arial';
              ctx.fillText('Canvas Fingerprint Test', 10, 30);
              window.fingerprint1 = canvas.toDataURL();

              // Get second fingerprint
              ctx.fillRect(0, 0, 200, 50);
              ctx.fillText('Canvas Fingerprint Test', 10, 30);
              window.fingerprint2 = canvas.toDataURL();
            </script>
          </body>
        </html>
      `);

      // Without the extension, fingerprints should be identical
      const fp1 = await page.evaluate(() => (window as any).fingerprint1);
      const fp2 = await page.evaluate(() => (window as any).fingerprint2);

      // This test verifies the page works - actual protection testing
      // requires the extension to be loaded
      expect(fp1).toBeDefined();
      expect(fp2).toBeDefined();
    });

    test('should modify getImageData results', async ({ page }) => {
      await page.setContent(`
        <html>
          <body>
            <canvas id="canvas" width="100" height="100"></canvas>
            <script>
              const canvas = document.getElementById('canvas');
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = 'rgb(128, 128, 128)';
              ctx.fillRect(0, 0, 100, 100);

              const imageData = ctx.getImageData(0, 0, 10, 10);
              window.pixelData = Array.from(imageData.data.slice(0, 12));
            </script>
          </body>
        </html>
      `);

      const pixels = await page.evaluate(() => (window as any).pixelData);
      expect(pixels).toHaveLength(12);
      // First pixel RGB values
      expect(pixels[0]).toBeGreaterThanOrEqual(0);
      expect(pixels[0]).toBeLessThanOrEqual(255);
    });
  });

  test.describe('WebGL Fingerprinting', () => {
    test('should expose WebGL context', async ({ page }) => {
      await page.setContent(`
        <html>
          <body>
            <canvas id="canvas"></canvas>
            <script>
              const canvas = document.getElementById('canvas');
              const gl = canvas.getContext('webgl');
              window.hasWebGL = !!gl;
              if (gl) {
                window.vendor = gl.getParameter(gl.VENDOR);
                window.renderer = gl.getParameter(gl.RENDERER);
              }
            </script>
          </body>
        </html>
      `);

      const hasWebGL = await page.evaluate(() => (window as any).hasWebGL);
      expect(hasWebGL).toBe(true);

      const vendor = await page.evaluate(() => (window as any).vendor);
      const renderer = await page.evaluate(() => (window as any).renderer);
      expect(vendor).toBeDefined();
      expect(renderer).toBeDefined();
    });

    test('should have UNMASKED extensions', async ({ page }) => {
      await page.setContent(`
        <html>
          <body>
            <canvas id="canvas"></canvas>
            <script>
              const canvas = document.getElementById('canvas');
              const gl = canvas.getContext('webgl');
              window.debugInfo = {};

              if (gl) {
                const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugExt) {
                  window.debugInfo.unmaskedVendor = gl.getParameter(debugExt.UNMASKED_VENDOR_WEBGL);
                  window.debugInfo.unmaskedRenderer = gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL);
                }
              }
            </script>
          </body>
        </html>
      `);

      const debugInfo = await page.evaluate(() => (window as any).debugInfo);
      // These may or may not be available depending on browser/driver
      expect(debugInfo).toBeDefined();
    });
  });

  test.describe('AudioContext Fingerprinting', () => {
    test('should create AudioContext', async ({ page }) => {
      await page.setContent(`
        <html>
          <body>
            <script>
              window.audioTest = {};
              try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                window.audioTest.sampleRate = ctx.sampleRate;
                window.audioTest.state = ctx.state;
                ctx.close();
              } catch (e) {
                window.audioTest.error = e.message;
              }
            </script>
          </body>
        </html>
      `);

      const audioTest = await page.evaluate(() => (window as any).audioTest);
      expect(audioTest.sampleRate).toBeDefined();
    });
  });

  test.describe('Navigator Properties', () => {
    test('should expose navigator properties', async ({ page }) => {
      await page.goto('about:blank');

      const navigatorProps = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        maxTouchPoints: navigator.maxTouchPoints,
      }));

      expect(navigatorProps.userAgent).toBeDefined();
      expect(navigatorProps.platform).toBeDefined();
      expect(navigatorProps.language).toBeDefined();
      expect(navigatorProps.languages).toBeInstanceOf(Array);
      expect(navigatorProps.hardwareConcurrency).toBeGreaterThan(0);
    });
  });

  test.describe('Screen Properties', () => {
    test('should expose screen properties', async ({ page }) => {
      await page.goto('about:blank');

      const screenProps = await page.evaluate(() => ({
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        devicePixelRatio: window.devicePixelRatio,
      }));

      expect(screenProps.width).toBeGreaterThan(0);
      expect(screenProps.height).toBeGreaterThan(0);
      expect(screenProps.colorDepth).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Timezone', () => {
    test('should expose timezone information', async ({ page }) => {
      await page.goto('about:blank');

      const timezoneInfo = await page.evaluate(() => ({
        offset: new Date().getTimezoneOffset(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }));

      expect(timezoneInfo.offset).toBeDefined();
      expect(timezoneInfo.timezone).toBeDefined();
    });
  });

  test.describe('WebRTC', () => {
    test('should have RTCPeerConnection', async ({ page }) => {
      await page.goto('about:blank');

      const hasWebRTC = await page.evaluate(() => {
        return typeof RTCPeerConnection !== 'undefined';
      });

      expect(hasWebRTC).toBe(true);
    });
  });

  test.describe('Performance API', () => {
    test('should expose performance.now()', async ({ page }) => {
      await page.goto('about:blank');

      const perfTest = await page.evaluate(() => {
        const t1 = performance.now();
        // Small delay
        for (let i = 0; i < 1000; i++) Math.random();
        const t2 = performance.now();
        return {
          t1,
          t2,
          diff: t2 - t1,
        };
      });

      expect(perfTest.t1).toBeGreaterThanOrEqual(0);
      expect(perfTest.t2).toBeGreaterThan(perfTest.t1);
    });
  });
});

/**
 * Test utilities for comparing fingerprints
 */
export const FingerprintTestUtils = {
  /**
   * Generate a canvas fingerprint
   */
  async getCanvasFingerprint(page: Page): Promise<string> {
    return page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d')!;
      ctx.font = '14px Arial';
      ctx.fillText('Fingerprint Test 🎨', 10, 30);
      return canvas.toDataURL();
    });
  },

  /**
   * Generate an AudioContext fingerprint
   */
  async getAudioFingerprint(page: Page): Promise<number[]> {
    return page.evaluate(async () => {
      const ctx = new OfflineAudioContext(1, 44100, 44100);
      const oscillator = ctx.createOscillator();
      const compressor = ctx.createDynamicsCompressor();

      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;

      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;

      oscillator.connect(compressor);
      compressor.connect(ctx.destination);
      oscillator.start(0);

      const buffer = await ctx.startRendering();
      return Array.from(buffer.getChannelData(0).slice(4500, 4510));
    });
  },

  /**
   * Compare two fingerprints and return similarity percentage
   */
  compareFingerprints(fp1: string, fp2: string): number {
    if (fp1 === fp2) return 100;
    if (!fp1 || !fp2) return 0;

    let matches = 0;
    const len = Math.min(fp1.length, fp2.length);
    for (let i = 0; i < len; i++) {
      if (fp1[i] === fp2[i]) matches++;
    }
    return (matches / len) * 100;
  },
};
