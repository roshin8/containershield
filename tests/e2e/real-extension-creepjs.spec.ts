/**
 * Test the REAL extension loaded in system Firefox.
 *
 * Strategy:
 * 1. Start a local HTTP server with a test page
 * 2. Launch system Firefox via web-ext (loads real extension)
 * 3. Test page collects fingerprint values and posts to local server
 * 4. Server captures results and we assert on them
 */
import { test, expect } from '@playwright/test';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../dist');

const TEST_PAGE = `<!DOCTYPE html>
<html><body>
<div id="status">Collecting...</div>
<script>
async function collect() {
  // Wait a moment for extension to inject
  await new Promise(r => setTimeout(r, 2000));

  const r = {};
  r.tzo = new Date().getTimezoneOffset();
  r.intlTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  r.ua = navigator.userAgent;
  r.platform = navigator.platform;
  r.vendor = navigator.vendor;
  r.cores = navigator.hardwareConcurrency;
  r.oscpu = navigator.oscpu;
  r.hasUAD = 'userAgentData' in navigator;
  r.screenW = screen.width;
  r.screenH = screen.height;
  r.dpr = window.devicePixelRatio;

  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      r.glVendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'no ext';
      r.glRenderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no ext';
    }
  } catch(e) { r.glError = e.message; }

  // Iframe
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const igl = iframe.contentDocument.createElement('canvas').getContext('webgl');
    if (igl) {
      const iext = igl.getExtension('WEBGL_debug_renderer_info');
      r.iframeGl = iext ? igl.getParameter(iext.UNMASKED_VENDOR_WEBGL) : 'no ext';
    }
    r.iframeTzo = new iframe.contentWindow.Date().getTimezoneOffset();
    document.body.removeChild(iframe);
  } catch(e) { r.iframeErr = e.message; }

  document.getElementById('status').textContent = JSON.stringify(r, null, 2);

  // Post back to server
  await fetch('/results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(r)
  });
}
collect();
</script></body></html>`;

test('real MV3 extension fingerprint check', async () => {
  // 1. Start local server
  let capturedResult: any = null;
  const resultPromise = new Promise<any>((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/results') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          res.writeHead(200);
          res.end('ok');
          capturedResult = JSON.parse(body);
          resolve(capturedResult);
          server.close();
        });
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(TEST_PAGE);
      }
    });
    server.listen(9876);
  });

  // 2. Launch system Firefox with extension via web-ext
  const profileDir = fs.mkdtempSync('/tmp/cs-test-profile-');
  fs.writeFileSync(path.join(profileDir, 'user.js'), `
    user_pref("xpinstall.signatures.required", false);
    user_pref("browser.shell.checkDefaultBrowser", false);
    user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);
    user_pref("datareporting.policy.dataSubmissionEnabled", false);
  `);

  const webExt = spawn('npx', [
    'web-ext', 'run',
    '--source-dir', distPath,
    '--firefox', '/Applications/Firefox.app/Contents/MacOS/firefox',
    '--firefox-profile', profileDir,
    '--keep-profile-changes',
    '--start-url', 'http://localhost:9876/', '--start-url', 'https://abrahamjuliot.github.io/creepjs/',
    '--no-reload',
  ], {
    env: { ...process.env, MOZ_HEADLESS: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // 3. Wait for results (timeout after 30s)
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 30000));
  const result = await Promise.race([resultPromise, timeout]);

  // 4. Kill Firefox
  webExt.kill('SIGTERM');
  await new Promise(r => setTimeout(r, 2000));
  fs.rmSync(profileDir, { recursive: true, force: true });

  if (!result) {
    console.log('\n*** TIMEOUT: Firefox did not post results within 30s ***\n');
    expect(result).not.toBeNull();
    return;
  }

  console.log('\n=== REAL EXTENSION RESULTS ===');
  console.log(JSON.stringify(result, null, 2));

  const isSpoofed = !result.ua.includes('Gecko/20100101 Firefox/');
  console.log(isSpoofed ? '*** EXTENSION ACTIVE - UA SPOOFED ***' : '*** EXTENSION NOT LOADED ***');

  if (isSpoofed) {
    console.log('Platform:', result.platform);
    console.log('WebGL:', result.glVendor, '/', result.glRenderer);
    console.log('Iframe WebGL:', result.iframeGl);
    console.log('TZO:', result.tzo, '→', result.intlTz);
    console.log('Iframe TZO:', result.iframeTzo);
    console.log('Screen:', result.screenW, 'x', result.screenH);
    console.log('Cores:', result.cores, 'UAD:', result.hasUAD);

    // Assert critical spoofs work
    expect(result.glVendor).not.toBe('Intel Inc.');
    expect(result.platform).not.toBe('MacIntel');
  }
  console.log('==============================\n');
});
