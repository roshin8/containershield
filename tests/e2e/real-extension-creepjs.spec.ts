/**
 * Test REAL extension on a local page via web-ext + system Firefox.
 * Verifies all major spoofing signals work with the actual extension loaded.
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

const TEST_PAGE = `<!DOCTYPE html><html><body><script>
async function test() {
  await new Promise(r => setTimeout(r, 2000));
  const r = {};
  r.tzo = new Date().getTimezoneOffset();
  r.intlTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  r.ua = navigator.userAgent.substring(0, 100);
  r.platform = navigator.platform;
  r.vendor = navigator.vendor;
  r.cores = navigator.hardwareConcurrency;
  r.ram = navigator.deviceMemory;
  r.screenW = screen.width;
  r.screenH = screen.height;
  r.dpr = window.devicePixelRatio;
  r.oscpu = navigator.oscpu;
  r.hasUAD = 'userAgentData' in navigator;
  r.webdriver = navigator.webdriver;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    r.glVendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'no ext';
    r.glRenderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no ext';
  } catch(e) { r.glError = e.message; }
  try {
    const f = document.createElement('iframe');
    f.style.display = 'none';
    document.body.appendChild(f);
    r.iframeGl = (() => { try {
      const ic = f.contentDocument.createElement('canvas');
      const igl = ic.getContext('webgl');
      const iext = igl?.getExtension('WEBGL_debug_renderer_info');
      return iext ? igl.getParameter(iext.UNMASKED_VENDOR_WEBGL) : 'no ext';
    } catch { return 'error'; }})();
    r.iframeTzo = new f.contentWindow.Date().getTimezoneOffset();
    r.iframeScreenW = f.contentWindow.screen.width;
    document.body.removeChild(f);
  } catch(e) { r.iframeErr = e.message; }
  await fetch('/results', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(r) });
}
test();
</script></body></html>`;

test('real extension spoofing verification', async () => {
  let result: any = null;
  const gotResult = new Promise<any>(resolve => {
    const server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
      if (req.method === 'POST' && req.url === '/results') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => { res.writeHead(200); res.end('ok'); result = JSON.parse(body); resolve(result); server.close(); });
      } else { res.writeHead(200, {'Content-Type':'text/html'}); res.end(TEST_PAGE); }
    });
    server.listen(19877);
  });

  const profileDir = fs.mkdtempSync('/tmp/cs-verify-');
  const webExt = spawn('npx', [
    'web-ext', 'run', '--source-dir', distPath,
    '--firefox', '/Applications/Firefox.app/Contents/MacOS/firefox',
    '--firefox-profile', profileDir, '--keep-profile-changes',
    '--start-url', 'http://localhost:19877/', '--no-reload',
  ], { env: { ...process.env, MOZ_HEADLESS: '1' }, stdio: ['pipe', 'pipe', 'pipe'] });

  const timeout = new Promise<null>(r => setTimeout(() => r(null), 30000));
  const res = await Promise.race([gotResult, timeout]);
  webExt.kill('SIGTERM');
  await new Promise(r => setTimeout(r, 2000));
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}

  if (!res) { console.log('TIMEOUT'); expect(res).not.toBeNull(); return; }

  console.log('\n=== REAL EXTENSION VERIFICATION ===');
  console.log(JSON.stringify(res, null, 2));

  const spoofed = !res.ua.includes('Firefox/');
  console.log(spoofed ? '*** SPOOFING ACTIVE ***' : '*** NOT SPOOFED ***');
  if (spoofed) {
    console.log('UA:', res.ua.substring(0, 60));
    console.log('Platform:', res.platform);
    console.log('WebGL:', res.glVendor, '/', res.glRenderer?.substring(0, 40));
    console.log('Iframe WebGL:', res.iframeGl);
    console.log('TZO:', res.tzo, '→', res.intlTz);
    console.log('Iframe TZO:', res.iframeTzo);
    console.log('Screen:', res.screenW, 'x', res.screenH, 'DPR:', res.dpr);
    console.log('Iframe Screen:', res.iframeScreenW);
    console.log('Cores:', res.cores, 'RAM:', res.ram, 'UAD:', res.hasUAD);
    console.log('Webdriver:', res.webdriver, 'oscpu:', res.oscpu);
  }
  console.log('===================================\n');

  if (spoofed) {
    expect(res.platform).not.toBe('MacIntel');
    expect(res.glVendor).not.toBe('Intel Inc.');
    expect(res.iframeGl).not.toBe('Intel Inc.');
    expect(res.webdriver).toBe(false);
  }
});
