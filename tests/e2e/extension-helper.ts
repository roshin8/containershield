/**
 * Extension Helper - Utilities for testing Firefox extensions with Playwright
 *
 * Firefox extension testing is more complex than Chrome because:
 * 1. Firefox requires extensions to be signed (or developer mode)
 * 2. Playwright doesn't natively support Firefox extension loading via args
 *
 * This helper provides utilities for extension testing.
 */

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to built extension
export const EXTENSION_PATH = path.resolve(__dirname, '../../dist');

/**
 * Verify the extension is built and ready for testing
 */
export function verifyExtensionBuilt(): boolean {
  const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error('Extension not built! Run: npm run build');
    return false;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`Extension ready: ${manifest.name} v${manifest.version}`);
  return true;
}

/**
 * Get the expected fingerprint values for a given protection level
 */
export function getExpectedValues(level: 'off' | 'minimal' | 'balanced' | 'strict') {
  // These are baseline expectations - actual values depend on container seed
  return {
    off: {
      // Real values - no spoofing
      expectSpoofed: false,
    },
    minimal: {
      // Basic spoofing
      expectSpoofed: true,
      spoofedAPIs: ['canvas', 'webgl'],
    },
    balanced: {
      // Moderate spoofing
      expectSpoofed: true,
      spoofedAPIs: ['canvas', 'webgl', 'audio', 'screen', 'navigator'],
    },
    strict: {
      // Maximum spoofing
      expectSpoofed: true,
      spoofedAPIs: ['canvas', 'webgl', 'audio', 'screen', 'navigator', 'fonts', 'timing'],
    },
  }[level];
}

/**
 * Test HTML page that checks fingerprint values
 */
export const FINGERPRINT_TEST_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Container Shield - Fingerprint Test</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #1a1a2e; color: #eee; }
    .result { margin: 5px 0; padding: 10px; background: #16213e; border-radius: 4px; }
    .label { color: #0f9; font-weight: bold; }
    .value { color: #fff; }
    h1 { color: #0ff; }
    .category { color: #f90; margin-top: 20px; font-size: 1.2em; }
  </style>
</head>
<body>
  <h1>Fingerprint Test Page</h1>
  <div id="results">Loading...</div>

  <script>
    async function collectFingerprints() {
      const results = {};

      // Navigator
      results.navigator = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        languages: [...navigator.languages],
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory,
        maxTouchPoints: navigator.maxTouchPoints,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
      };

      // Screen
      results.screen = {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        devicePixelRatio: window.devicePixelRatio,
      };

      // Canvas 2D
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(0, 0, 200, 50);
        ctx.fillStyle = '#069';
        ctx.fillText('Fingerprint Test 123', 2, 15);
        results.canvas = {
          dataURL: canvas.toDataURL().substring(0, 100) + '...',
          hash: await hashString(canvas.toDataURL()),
        };
      } catch (e) {
        results.canvas = { error: e.message };
      }

      // WebGL
      try {
        const gl = document.createElement('canvas').getContext('webgl');
        if (gl) {
          results.webgl = {
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
          };

          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            results.webgl.unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            results.webgl.unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          }
        }
      } catch (e) {
        results.webgl = { error: e.message };
      }

      // Audio
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        results.audio = {
          sampleRate: audioCtx.sampleRate,
          baseLatency: audioCtx.baseLatency,
          state: audioCtx.state,
        };
        audioCtx.close();
      } catch (e) {
        results.audio = { error: e.message };
      }

      // Timing
      results.timing = {
        performanceNow: performance.now(),
        timezoneOffset: new Date().getTimezoneOffset(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      // Store for Playwright
      window.__fingerprintResults = results;
      window.__fingerprintCollected = true;

      // Display results
      displayResults(results);

      return results;
    }

    async function hashString(str) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    }

    function displayResults(results) {
      let html = '';

      for (const [category, values] of Object.entries(results)) {
        html += '<div class="category">' + category.toUpperCase() + '</div>';
        for (const [key, value] of Object.entries(values)) {
          const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          html += '<div class="result"><span class="label">' + key + ':</span> <span class="value">' + displayValue + '</span></div>';
        }
      }

      document.getElementById('results').innerHTML = html;
    }

    collectFingerprints();
  </script>
</body>
</html>
`;

/**
 * Compare two fingerprint results to check if spoofing is working
 */
export function compareFingerprints(
  withExtension: Record<string, any>,
  withoutExtension: Record<string, any>
): { different: string[]; same: string[] } {
  const different: string[] = [];
  const same: string[] = [];

  // Compare canvas hashes
  if (withExtension.canvas?.hash !== withoutExtension.canvas?.hash) {
    different.push('canvas.hash');
  } else {
    same.push('canvas.hash');
  }

  // Compare WebGL vendor/renderer
  if (withExtension.webgl?.unmaskedVendor !== withoutExtension.webgl?.unmaskedVendor) {
    different.push('webgl.unmaskedVendor');
  } else {
    same.push('webgl.unmaskedVendor');
  }

  // Compare screen dimensions
  if (withExtension.screen?.width !== withoutExtension.screen?.width) {
    different.push('screen.width');
  } else {
    same.push('screen.width');
  }

  // Compare hardware
  if (withExtension.navigator?.hardwareConcurrency !== withoutExtension.navigator?.hardwareConcurrency) {
    different.push('navigator.hardwareConcurrency');
  } else {
    same.push('navigator.hardwareConcurrency');
  }

  return { different, same };
}
