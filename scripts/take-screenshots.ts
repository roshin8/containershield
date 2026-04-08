/**
 * Take screenshots of extension UI pages for the README.
 *
 * Serves the built popup/onboarding HTML from localhost and injects
 * mock data so the UI renders without the extension context.
 *
 * Usage: npx tsx scripts/take-screenshots.ts
 */

import path from 'path';
import fs from 'fs';
import http from 'http';
import { firefox } from 'playwright';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../dist');
const outDir = path.resolve(__dirname, '../docs/screenshots');
fs.mkdirSync(outDir, { recursive: true });

// Mock the browser.* APIs so the popup renders with demo data
const MOCK_SCRIPT = `
console.log('MOCK: installing browser mock');
window.browser = {
  tabs: {
    query: async () => [{ id: 1, url: 'https://example.com' }],
    sendMessage: async () => ({}),
  },
  storage: { local: { get: async () => ({}), set: async () => {} } },
  runtime: {
    sendMessage: async (msg) => {
      if (msg.type === 'GET_CONTAINER_INFO') return { containerId: 'firefox-container-1', containerName: 'Personal', containerColor: 'blue', containerIcon: 'fingerprint' };
      if (msg.type === 'GET_ALL_CONTAINERS') return [
        { cookieStoreId: 'firefox-container-1', name: 'Personal', color: 'blue', icon: 'fingerprint' },
        { cookieStoreId: 'firefox-container-2', name: 'Work', color: 'green', icon: 'briefcase' },
        { cookieStoreId: 'firefox-container-3', name: 'Shopping', color: 'pink', icon: 'cart' },
        { cookieStoreId: 'firefox-container-4', name: 'Banking', color: 'yellow', icon: 'dollar' },
      ];
      if (msg.type === 'GET_SETTINGS') return {
        enabled: true, protectionLevel: 2,
        spoofers: {
          graphics: { canvas: 'noise', webgl: 'noise', webgl2: 'noise', webgpu: 'noise', svg: 'noise', domRect: 'noise', textMetrics: 'noise', offscreenCanvas: 'noise', webglShaders: 'noise' },
          audio: { audioContext: 'noise', offlineAudio: 'noise', latency: 'noise', codecs: 'noise' },
          hardware: { screen: 'noise', screenFrame: 'noise', screenExtended: 'noise', orientation: 'noise', visualViewport: 'noise', deviceMemory: 'noise', hardwareConcurrency: 'noise', architecture: 'noise', mediaDevices: 'noise', battery: 'noise', gpu: 'noise', touch: 'noise', sensors: 'noise' },
          navigator: { userAgent: 'noise', languages: 'noise', plugins: 'noise', clientHints: 'noise', clipboard: 'noise', vibration: 'noise', vendorFlavors: 'noise', fontPreferences: 'noise', windowName: 'noise', tabHistory: 'noise', mediaCapabilities: 'noise' },
          timezone: { intl: 'noise', date: 'noise' },
          fonts: { enumeration: 'noise', cssDetection: 'noise' },
          network: { webrtc: 'public_only', connection: 'noise', geolocation: 'noise', websocket: 'noise' },
          timing: { performance: 'noise', memory: 'noise', eventLoop: 'noise' },
          css: { mediaQueries: 'noise' },
          speech: { synthesis: 'noise' },
          permissions: { query: 'noise', notification: 'noise' },
          storage: { estimate: 'noise', indexedDB: 'noise', webSQL: 'noise', privateModeProtection: 'noise' },
          math: { functions: 'noise' },
          keyboard: { layout: 'noise', cadence: 'noise' },
          workers: { fingerprint: 'noise', serviceWorker: 'noise' },
          errors: { stackTrace: 'noise' },
          rendering: { mathml: 'noise', emoji: 'noise' },
          intl: { apis: 'noise' },
          crypto: { webCrypto: 'noise' },
          devices: { gamepad: 'noise', midi: 'noise', bluetooth: 'noise', usb: 'noise', serial: 'noise', hid: 'noise' },
          features: { detection: 'noise' },
          payment: { applePay: 'noise' },
        },
        profile: {},
        domainExceptions: [],
        blockedDomains: [],
      };
      if (msg.type === 'GET_ASSIGNED_PROFILE') return {
        userAgent: { id: 'chrome-125-win', name: 'Chrome 125 Win10', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', appVersion: '5.0', mobile: false, platformName: 'Windows', platformVersion: '10.0.0', brands: [{ brand: 'Google Chrome', version: '125' }, { brand: 'Chromium', version: '125' }] },
        screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
        hardwareConcurrency: 8,
        deviceMemory: 16,
        timezoneOffset: 300,
        languages: ['en-US', 'en'],
      };
      if (msg.type === 'GET_SIGNAL_VALUES') return {
        'HTMLCanvasElement.toDataURL': '#a7f3b2c1',
        'WebGLRenderingContext.getParameter': 'ANGLE (NVIDIA GeForce RTX 3060)',
        'WebGL2RenderingContext.getParameter': 'ANGLE (NVIDIA GeForce RTX 3060)',
        'Element.getBoundingClientRect': '±0.5px noise',
        'CanvasRenderingContext2D.measureText': '±noise',
        'SVGGraphicsElement.getBBox': '±0.5px noise',
        'OffscreenCanvas.convertToBlob': '±noise per seed',
        'WebGLRenderingContext.getShaderPrecisionFormat': 'precision spoofed',
        'navigator.gpu.requestAdapter': 'spoofed',
        'AnalyserNode.getFloatFrequencyData': '±0.0001 noise',
        'OfflineAudioContext.startRendering': '±0.0001 noise',
        'AudioContext.baseLatency': 'spoofed sample rate',
        'HTMLMediaElement.canPlayType': 'standardized',
        'screen.width': '1920x1080',
        'window.outerWidth': '1920x1080',
        'screen.isExtended': 'false (single)',
        'screen.orientation.type': 'landscape-primary',
        'visualViewport.scale': '1.0 (no zoom)',
        'navigator.deviceMemory': '16GB',
        'navigator.hardwareConcurrency': '8 cores',
        'Math.fround': 'x86_64',
        'navigator.userAgent': 'Chrome 125 Win10',
        'navigator.languages': 'en-US, en',
        'navigator.plugins': '5 standard',
        'navigator.userAgentData': 'Windows',
        'Date.getTimezoneOffset': 'America/New_York',
        'Intl.DateTimeFormat': 'America/New_York',
        'document.fonts.check': 'filtered',
        'performance.now': '2ms precision',
        'setTimeout': '±2ms jitter',
        'matchMedia': 'spoofed queries',
        'navigator.webdriver': 'false',
        'Worker.constructor': 'preamble injected',
        'ServiceWorker.register': 'rejected',
        'navigator.connection': 'spoofed profile',
        'RTCPeerConnection': 'public only',
        'speechSynthesis.getVoices': '3-5 voices',
        'KeyboardEvent.timing': '±15ms jitter',
        'navigator.storage.estimate': 'randomized',
        'navigator.permissions.query': 'spoofed',
        'Math.cos': '±1e-12 noise',
        'crypto.getRandomValues': 'seeded PRNG',
        'navigator.getGamepads': 'empty array',
      };
      if (msg.type === 'GET_STATS') return { totalAccesses: 1247, spoofed: 1198, blocked: 32, exposed: 17, protectionRate: 98.6, topDomains: [] };
      if (msg.type === 'GET_ROTATION_SETTINGS') return { enabled: false, schedule: 'daily' };
      return {};
    },
    getURL: (p) => '/' + p,
    onMessage: { addListener: () => {}, removeListener: () => {} },
    id: 'mock-extension-id',
  },
  contextualIdentities: { query: async () => [], get: async () => null, onCreated: { addListener: () => {} }, onRemoved: { addListener: () => {} }, onUpdated: { addListener: () => {} } },
  action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
};
// Also alias as chrome for MV3 compat
window.chrome = window.browser;
`;

async function main() {
  // Serve dist/ on localhost
  const server = http.createServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    let filePath = path.join(distPath, urlPath === '/' ? 'popup/index.html' : urlPath);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end(); return; }
    if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
    const ext = path.extname(filePath);
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
      '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(filePath));
  });
  server.listen(19876);
  console.log('Serving dist/ on http://localhost:19876');

  const browser = await firefox.launch({ headless: true });

  const pages = [
    { name: 'dashboard', url: 'http://localhost:19876/popup/index.html?tab=dashboard', w: 420, h: 700 },
    { name: 'signals', url: 'http://localhost:19876/popup/index.html?tab=signals', w: 420, h: 700 },
    { name: 'profile', url: 'http://localhost:19876/popup/index.html?tab=profile', w: 420, h: 700 },
    { name: 'onboarding', url: 'http://localhost:19876/pages/onboarding.html', w: 1000, h: 900 },
  ];

  for (const p of pages) {
    console.log(`Capturing ${p.name}...`);
    const context = await browser.newContext({
      viewport: { width: p.w, height: p.h },
      colorScheme: 'dark',
    });
    const page = await context.newPage();

    // Replace the webextension-polyfill with our mock, matching rolldown's factory pattern
    await page.route('**/browser-polyfill*.js', async (route) => {
      const mockModule = `import{t as e}from"./rolldown-runtime-BDKCODZC.js";
${MOCK_SCRIPT}
var t=e(((e,t)=>{t.exports=window.browser}));
export{t};`;
      await route.fulfill({ contentType: 'application/javascript', body: mockModule });
    });

    page.on('console', msg => { if (msg.type() === 'error' || msg.text().includes('MOCK')) console.log(`  [${msg.type()}] ${msg.text()}`); });
    page.on('pageerror', err => console.log(`  [ERROR] ${err.message}\n  ${err.stack?.split('\n')[1] || ''}`));
    await page.goto(p.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, `${p.name}.png`) });
    console.log(`  Saved ${p.name}.png`);
    await context.close();
  }

  await browser.close();
  server.close();
  console.log(`\nDone! Screenshots in docs/screenshots/`);
}

main().catch(e => { console.error(e); process.exit(1); });
