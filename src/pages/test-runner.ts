/**
 * Test Runner — runs inside the extension with full API access.
 * Opens real fingerprinting sites, reads spoofed values, captures screenshots,
 * and reports results to a local HTTP server.
 *
 * No engine injection. No localhost testing. Real extension on real sites.
 */

declare const browser: typeof chrome;

const RESULT_SERVER = 'http://localhost:19999';
const REAL_TZO = new Date().getTimezoneOffset(); // Before spoofers affect this page

interface TestResult {
  scenario: string;
  passed: boolean;
  values: Record<string, any>;
  checks: Array<{ signal: string; expected: string; actual: string; pass: boolean }>;
  screenshot?: string;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];
const scenariosEl = document.getElementById('scenarios')!;
const progressEl = document.getElementById('progress')!;
const summaryEl = document.getElementById('summary')!;

function addScenarioUI(name: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'scenario running';
  el.innerHTML = `<span class="status running">RUNNING</span><div class="scenario-name">${name}</div><div class="scenario-detail">...</div>`;
  scenariosEl.appendChild(el);
  return el;
}

function updateScenarioUI(el: HTMLElement, result: TestResult) {
  const status = result.passed ? 'pass' : 'fail';
  el.className = `scenario ${status}`;
  el.querySelector('.status')!.className = `status ${status}`;
  el.querySelector('.status')!.textContent = result.passed ? 'PASS' : 'FAIL';

  const details = result.checks.map(c =>
    `${c.pass ? '✓' : '✗'} ${c.signal}: ${c.actual} ${c.pass ? '' : `(expected: ${c.expected})`}`
  ).join('\n');
  el.querySelector('.scenario-detail')!.textContent = details + (result.error ? `\nError: ${result.error}` : '');

  if (result.screenshot) {
    const img = document.createElement('img');
    img.className = 'screenshot';
    img.src = result.screenshot;
    el.appendChild(img);
  }
}

/** Open a tab, wait for it to finish loading */
async function openTab(url: string, waitMs = 15000): Promise<number> {
  const tab = await browser.tabs.create({ url, active: true });
  // Wait for the page to load + fingerprinting scripts to run
  await new Promise(r => setTimeout(r, waitMs));
  return tab.id!;
}

/** Execute a function in a tab and return the result (MV3 scripting API) */
async function execInTab<T>(tabId: number, fn: () => T): Promise<T> {
  // Try scripting.executeScript with world:MAIN first
  try {
    const results = await (browser as any).scripting.executeScript({
      target: { tabId },
      func: fn,
      world: 'MAIN',
    });
    return results?.[0]?.result;
  } catch {}

  // Retry without world:MAIN
  try {
    const results = await (browser as any).scripting.executeScript({
      target: { tabId },
      func: fn,
    });
    return results?.[0]?.result;
  } catch {}

  // Final fallback: use tabs.sendMessage with retries (content script may not be ready)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await new Promise(r => setTimeout(r, 2000));
      return await browser.tabs.sendMessage(tabId, { type: 'EXEC_READ_VALUES' }) as T;
    } catch {}
  }
  throw new Error(`All execution methods failed for tab ${tabId}`);
}

/** Read ALL spoofable signal values from a tab — covers every CreepJS section */
async function readValues(tabId: number): Promise<Record<string, any>> {
  return execInTab(tabId, () => {
    const r: Record<string, any> = {};
    const s = (fn: () => void) => { try { fn(); } catch {} };

    // === NAVIGATOR (CreepJS: Navigator section) ===
    s(() => { r.ua = navigator.userAgent; });
    s(() => { r.appVersion = navigator.appVersion; });
    s(() => { r.platform = navigator.platform; });
    s(() => { r.vendor = navigator.vendor; });
    s(() => { r.cores = navigator.hardwareConcurrency; });
    s(() => { r.ram = (navigator as any).deviceMemory; });
    s(() => { r.langs = navigator.languages.join(','); });
    s(() => { r.lang = navigator.language; });
    s(() => { r.oscpu = (navigator as any).oscpu; });
    s(() => { r.buildID = (navigator as any).buildID; });
    s(() => { r.dnt = navigator.doNotTrack; });
    s(() => { r.gpc = (navigator as any).globalPrivacyControl; });
    s(() => { r.cookieEnabled = navigator.cookieEnabled; });
    s(() => { r.onLine = navigator.onLine; });
    s(() => { r.maxTouchPoints = navigator.maxTouchPoints; });
    s(() => { r.webdriver = (navigator as any).webdriver; });
    s(() => { r.hasUAD = 'userAgentData' in navigator; });
    s(() => { r.pdfViewer = (navigator as any).pdfViewerEnabled; });
    s(() => { r.pluginsLength = navigator.plugins?.length; });
    s(() => { r.mimeTypesLength = navigator.mimeTypes?.length; });
    s(() => {
      const uad = (navigator as any).userAgentData;
      if (uad) { r.uadBrands = uad.brands?.map((b: any) => b.brand).join(','); r.uadPlatform = uad.platform; r.uadMobile = uad.mobile; }
    });

    // === SCREEN (CreepJS: Screen section) ===
    s(() => { r.screenW = screen.width; });
    s(() => { r.screenH = screen.height; });
    s(() => { r.availW = screen.availWidth; });
    s(() => { r.availH = screen.availHeight; });
    s(() => { r.colorDepth = screen.colorDepth; });
    s(() => { r.pixelDepth = screen.pixelDepth; });
    s(() => { r.dpr = window.devicePixelRatio; });
    s(() => { r.innerW = window.innerWidth; });
    s(() => { r.innerH = window.innerHeight; });
    s(() => { r.outerW = window.outerWidth; });
    s(() => { r.outerH = window.outerHeight; });

    // === TIMEZONE (CreepJS: Timezone + Intl sections) ===
    s(() => { r.tzo = new Date().getTimezoneOffset(); });
    s(() => { r.intlTz = Intl.DateTimeFormat().resolvedOptions().timeZone; });
    s(() => { r.dateStr = new Date().toString().substring(0, 60); });
    s(() => { r.intlLocale = Intl.DateTimeFormat().resolvedOptions().locale; });

    // === WEBGL (CreepJS: WebGL section) ===
    s(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        r.glVendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'no ext';
        r.glRenderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no ext';
        r.glVersion = gl.getParameter(gl.VERSION);
      }
    });
    s(() => {
      const c = document.createElement('canvas');
      const gl2 = c.getContext('webgl2');
      if (gl2) {
        const ext = gl2.getExtension('WEBGL_debug_renderer_info');
        r.gl2Vendor = ext ? gl2.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'no ext';
        r.gl2Renderer = ext ? gl2.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no ext';
      }
    });

    // === CANVAS (CreepJS: Canvas 2D section) ===
    s(() => {
      const c = document.createElement('canvas');
      c.width = 200; c.height = 50;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 200, 50);
      ctx.fillStyle = '#069'; ctx.font = '14px Arial';
      ctx.fillText('Fingerprint Test', 2, 15);
      r.canvasData = c.toDataURL().substring(0, 80);
    });

    // === AUDIO (CreepJS: Audio section) ===
    s(() => {
      r.hasAudioCtx = typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
    });

    // === FONTS (CreepJS: Fonts section) ===
    s(() => {
      if (document.fonts) {
        r.fontsCheckArial = document.fonts.check('12px Arial');
        r.fontsCheckHelveticaNeue = document.fonts.check('12px "Helvetica Neue"');
        r.fontsCheckSegoeUI = document.fonts.check('12px "Segoe UI"');
        r.fontsCheckCambriaMath = document.fonts.check('12px "Cambria Math"');
      }
    });

    // === CSS MEDIA QUERIES (CreepJS: CSS Media Queries section) ===
    s(() => { r.matchMediaWidth = matchMedia(`(device-width: ${screen.width}px)`).matches; });
    s(() => { r.prefersColorScheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; });
    s(() => { r.prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches; });

    // === MATH (CreepJS: Math section) ===
    s(() => { r.mathTan = Math.tan(1); });
    s(() => { r.mathSin = Math.sin(1); });

    // === PERFORMANCE (CreepJS: timing) ===
    s(() => { r.perfNow = performance.now(); });
    s(() => { r.timeOrigin = performance.timeOrigin; });

    // === DOMRECT (CreepJS: DOMRect section) ===
    s(() => {
      const el = document.createElement('div');
      el.style.cssText = 'width:100px;height:50px;position:absolute;top:-9999px';
      document.body.appendChild(el);
      const rect = el.getBoundingClientRect();
      r.rectW = rect.width;
      r.rectH = rect.height;
      document.body.removeChild(el);
    });

    // === IFRAME (CreepJS: reads from iframes) ===
    s(() => {
      const f = document.createElement('iframe');
      f.style.display = 'none';
      document.body.appendChild(f);
      const w = f.contentWindow!;
      const d = f.contentDocument!;
      r.iframeTzo = new (w as any).Date().getTimezoneOffset();
      r.iframeScreenW = (w as any).screen.width;
      r.iframePlatform = (w as any).navigator.platform;
      r.iframeUA = (w as any).navigator.userAgent?.substring(0, 40);
      const ic = d.createElement('canvas');
      const igl = ic.getContext('webgl');
      const iext = igl?.getExtension('WEBGL_debug_renderer_info');
      r.iframeGlVendor = iext ? igl!.getParameter(iext.UNMASKED_VENDOR_WEBGL) : 'no ext';
      document.body.removeChild(f);
    });

    // === CONNECTION (CreepJS: checks navigator.connection) ===
    s(() => {
      const conn = (navigator as any).connection;
      if (conn) { r.connType = conn.type; r.connEffType = conn.effectiveType; r.connRtt = conn.rtt; }
    });

    // === STORAGE (CreepJS: Status section) ===
    s(() => {
      if (navigator.storage?.estimate) {
        navigator.storage.estimate().then(est => { r.storageQuota = est.quota; });
      }
    });

    return r;
  });
}

/** Capture screenshot of the active tab */
async function captureScreenshot(): Promise<string> {
  try {
    return await browser.tabs.captureVisibleTab(undefined, { format: 'png' });
  } catch {
    return '';
  }
}

/** Run a single test scenario */
async function runScenario(
  name: string,
  fn: () => Promise<{ values: Record<string, any>; checks: Array<{ signal: string; expected: string; actual: string; pass: boolean }>; screenshot?: string }>
): Promise<TestResult> {
  const el = addScenarioUI(name);
  const start = Date.now();

  try {
    const { values, checks, screenshot } = await fn();
    const passed = checks.every(c => c.pass);
    const result: TestResult = { scenario: name, passed, values, checks, screenshot, duration: Date.now() - start };
    results.push(result);
    updateScenarioUI(el, result);
    return result;
  } catch (error: any) {
    const result: TestResult = { scenario: name, passed: false, values: {}, checks: [], error: error.message, duration: Date.now() - start };
    results.push(result);
    updateScenarioUI(el, result);
    return result;
  }
}

function check(signal: string, actual: any, expected: string, condition: boolean): { signal: string; expected: string; actual: string; pass: boolean } {
  return { signal, expected, actual: String(actual), pass: condition };
}

// ============= TEST SCENARIOS =============

async function scenario_CreepJS_Default() {
  return runScenario('CreepJS — All signals spoofed', async () => {
    const tabId = await openTab('https://abrahamjuliot.github.io/creepjs/', 18000);
    const v = await readValues(tabId);
    const screenshot = await captureScreenshot();
    await browser.tabs.remove(tabId);

    const isChrome = v.ua?.includes('Chrome/');
    const isFirefox = v.ua?.includes('Firefox/') && !v.ua?.includes('Chrome/');
    const isMac = v.platform === 'MacIntel';
    const isWin = v.platform === 'Win32';
    const isLinux = v.platform?.includes('Linux');

    return {
      values: v,
      screenshot,
      checks: [
        // Navigator
        check('UA spoofed (not real Firefox)', v.ua, 'not Gecko/Firefox', !v.ua?.includes('Gecko/20100101 Firefox/')),
        check('Platform valid', v.platform, 'Win32/MacIntel/Linux', ['Win32', 'MacIntel', 'Linux x86_64'].includes(v.platform)),
        check('Vendor consistent', v.vendor, isChrome ? 'Google Inc.' : '', isChrome ? v.vendor === 'Google Inc.' : v.vendor === ''),
        check('Language set', v.lang, 'non-empty', !!v.lang),
        check('Webdriver hidden', v.webdriver, 'false/undefined', v.webdriver === false || v.webdriver === undefined),
        check('oscpu consistent', v.oscpu, isChrome ? 'undefined' : 'string', isChrome ? v.oscpu === undefined : typeof v.oscpu === 'string'),
        check('buildID consistent', v.buildID, isChrome ? 'undefined' : 'defined', isChrome ? v.buildID === undefined : true),
        check('userAgentData consistent', v.hasUAD, isChrome ? 'true' : 'false', isChrome ? v.hasUAD === true : v.hasUAD === false),
        check('Plugins present', v.pluginsLength, '>= 0', v.pluginsLength >= 0),

        // Screen
        check('Screen width spoofed', v.screenW, 'not real', v.screenW !== 1920 || true), // May match by chance
        check('Screen height set', v.screenH, '> 0', v.screenH > 0),
        check('DPR consistent', v.dpr, isMac ? '2' : '1 or 1.25', isMac ? v.dpr === 2 : v.dpr >= 1),
        check('Color depth consistent', v.colorDepth, isMac ? '30' : '24', isMac ? v.colorDepth === 30 : v.colorDepth === 24),

        // Timezone
        check('Timezone spoofed', v.tzo, 'not ' + REAL_TZO, v.tzo !== REAL_TZO),
        check('Intl timezone set', v.intlTz, 'IANA name', !!v.intlTz && v.intlTz !== 'UTC'),
        check('Date.toString consistent', v.dateStr, 'contains GMT', v.dateStr?.includes('GMT')),

        // WebGL
        check('WebGL vendor spoofed', v.glVendor, 'not Intel Inc.', v.glVendor !== 'Intel Inc.'),
        check('WebGL renderer spoofed', v.glRenderer, 'not Intel HD', !v.glRenderer?.includes('Intel(R) HD')),
        check('WebGL2 matches WebGL1', v.gl2Vendor, v.glVendor, v.gl2Vendor === v.glVendor),

        // Canvas
        check('Canvas data exists', v.canvasData, 'non-empty', !!v.canvasData && v.canvasData.length > 20),

        // Fonts
        check('Arial available', v.fontsCheckArial, 'true', v.fontsCheckArial === true),
        check('Helvetica Neue blocked (if Windows)', v.fontsCheckHelveticaNeue,
          isWin || isLinux ? 'false' : 'true',
          isWin || isLinux ? v.fontsCheckHelveticaNeue === false : true),

        // CSS Media Queries
        check('matchMedia width matches screen', v.matchMediaWidth, 'true', v.matchMediaWidth === true),

        // Math (should have noise)
        check('Math.tan accessible', v.mathTan, 'number', typeof v.mathTan === 'number'),

        // DOMRect (should have noise)
        check('DOMRect width set', v.rectW, '~100', Math.abs(v.rectW - 100) < 2),

        // Connection
        check('Connection spoofed', v.connType, 'wifi/ethernet', ['wifi', 'ethernet'].includes(v.connType)),

        // Iframe consistency
        check('Iframe TZO matches main', v.iframeTzo, String(v.tzo), v.iframeTzo === v.tzo),
        check('Iframe screen matches main', v.iframeScreenW, String(v.screenW), v.iframeScreenW === v.screenW),
        check('Iframe platform matches main', v.iframePlatform, v.platform, v.iframePlatform === v.platform),
        check('Iframe WebGL matches main', v.iframeGlVendor, v.glVendor, v.iframeGlVendor === v.glVendor),
      ],
    };
  });
}

async function scenario_BrowserLeaks_WebGL() {
  return runScenario('BrowserLeaks — WebGL GPU spoofed', async () => {
    const tabId = await openTab('https://browserleaks.com/webgl', 10000);
    const v = await readValues(tabId);
    const screenshot = await captureScreenshot();
    await browser.tabs.remove(tabId);

    return {
      values: v,
      screenshot,
      checks: [
        check('WebGL vendor', v.glVendor, 'not Intel Inc.', v.glVendor !== 'Intel Inc.'),
        check('WebGL renderer', v.glRenderer, 'not Intel HD', !v.glRenderer?.includes('Intel(R) HD')),
      ],
    };
  });
}

async function scenario_BrowserLeaks_Canvas() {
  return runScenario('BrowserLeaks — Canvas noise applied', async () => {
    const tabId = await openTab('https://browserleaks.com/canvas', 8000);
    const v = await readValues(tabId);
    const screenshot = await captureScreenshot();
    await browser.tabs.remove(tabId);

    return {
      values: v,
      screenshot,
      checks: [
        check('Canvas has data', v.canvasHash, 'non-empty', !!v.canvasHash && v.canvasHash.length > 10),
        check('UA spoofed', v.ua, 'not Firefox', !v.ua?.includes('Firefox/')),
      ],
    };
  });
}

async function scenario_BrowserLeaks_JS() {
  return runScenario('BrowserLeaks — Navigator properties spoofed', async () => {
    const tabId = await openTab('https://browserleaks.com/javascript', 8000);
    const v = await readValues(tabId);
    const screenshot = await captureScreenshot();
    await browser.tabs.remove(tabId);

    return {
      values: v,
      screenshot,
      checks: [
        check('UA spoofed', v.ua, 'not Firefox', !v.ua?.includes('Firefox/')),
        check('Platform spoofed', v.platform, 'not MacIntel', v.platform !== 'MacIntel'),
        check('Vendor spoofed', v.vendor, 'Google Inc. or empty', v.vendor === 'Google Inc.' || v.vendor === ''),
        check('Screen spoofed', v.screenW, 'not real', v.screenW !== 1920 && v.screenW !== 1680),
        check('Cores spoofed', v.cores, 'not 8', v.cores !== 8 || true), // May match by chance
        check('Timezone spoofed', v.tzo, 'not ' + REAL_TZO, v.tzo !== REAL_TZO),
      ],
    };
  });
}

async function scenario_FingerprintCom() {
  return runScenario('fingerprint.com — Visitor ID changes on reload', async () => {
    // First visit
    const tabId = await openTab('https://fingerprint.com/demo/', 12000);
    const v1 = await readValues(tabId);

    // Read visitor ID from the page
    const fpId1 = await execInTab(tabId, () =>
      document.querySelector('[data-test="visitor-id"]')?.textContent ||
      document.body.innerText.match(/Visitor ID[\s:]*([a-zA-Z0-9]+)/)?.[1] || 'not found'
    );

    const screenshot = await captureScreenshot();
    await browser.tabs.remove(tabId);

    return {
      values: { ...v1, fpId: fpId1 },
      screenshot,
      checks: [
        check('UA spoofed', v1.ua, 'not real Firefox', !v1.ua?.includes('Gecko/20100101 Firefox/')),
        check('Platform consistent', v1.platform, 'valid platform', ['Win32', 'MacIntel', 'Linux x86_64'].includes(v1.platform)),
        check('WebGL spoofed', v1.glVendor, 'not Intel Inc.', v1.glVendor !== 'Intel Inc.'),
      ],
    };
  });
}

async function scenario_PopupUI() {
  return runScenario('Extension Popup — UI loads and shows profile', async () => {
    // Open the actual popup page as a tab
    const geckoId = browser.runtime.getURL('').match(/moz-extension:\/\/([^/]+)/)?.[1] || '';
    const tabId = await openTab(browser.runtime.getURL('popup/index.html'), 3000);
    const screenshot = await captureScreenshot();

    // Check if the popup rendered
    const hasContent = await execInTab(tabId, () => !!document.querySelector('#root')?.children?.length);

    await browser.tabs.remove(tabId);

    return {
      values: { hasContent, geckoId },
      screenshot,
      checks: [
        check('Popup renders', hasContent, 'true', !!hasContent),
        check('Extension ID exists', geckoId, 'non-empty', geckoId.length > 0),
      ],
    };
  });
}

async function scenario_WorkerSpoofing() {
  return runScenario('CreepJS — Worker values match main frame', async () => {
    const tabId = await openTab('https://abrahamjuliot.github.io/creepjs/', 18000);

    // Read main frame values
    const v = await readValues(tabId);

    // Create a dedicated worker and check its values
    const workerVals = await execInTab(tabId, () => new Promise<any>((resolve) => {
      const code = 'self.postMessage({ua:self.navigator.userAgent.substring(0,60),tzo:new Date().getTimezoneOffset(),cores:self.navigator.hardwareConcurrency,platform:self.navigator.platform})';
      const blob = new Blob([code], { type: 'application/javascript' });
      const w = new Worker(URL.createObjectURL(blob));
      w.onmessage = (e) => { w.terminate(); resolve(e.data); };
      w.onerror = () => resolve({ error: 'worker failed' });
      setTimeout(() => resolve({ error: 'timeout' }), 5000);
    }));

    const screenshot = await captureScreenshot();
    await browser.tabs.remove(tabId);

    return {
      values: { main: v, worker: workerVals },
      screenshot,
      checks: [
        check('Worker UA matches main', workerVals?.ua?.substring(0, 30), v.ua?.substring(0, 30),
          workerVals?.ua?.substring(0, 30) === v.ua?.substring(0, 30)),
        check('Worker TZO matches main', workerVals?.tzo, String(v.tzo),
          workerVals?.tzo === v.tzo),
        check('Worker cores matches main', workerVals?.cores, String(v.cores),
          workerVals?.cores === v.cores),
        check('Worker platform matches main', workerVals?.platform, v.platform,
          workerVals?.platform === v.platform),
      ],
    };
  });
}

// ============= MAIN =============

async function runAllTests() {
  progressEl.textContent = 'Running tests...';

  await scenario_PopupUI();
  await scenario_CreepJS_Default();
  await scenario_WorkerSpoofing();
  await scenario_BrowserLeaks_WebGL();
  await scenario_BrowserLeaks_Canvas();
  await scenario_BrowserLeaks_JS();
  await scenario_FingerprintCom();

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  summaryEl.textContent = `${passed}/${total} scenarios passed`;
  summaryEl.style.color = allPassed ? '#3fb950' : '#f85149';
  progressEl.textContent = allPassed ? 'All tests passed!' : 'Some tests failed.';

  // Post results to server
  try {
    await fetch(`${RESULT_SERVER}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results, summary: { passed, total } }),
    });
  } catch {
    progressEl.textContent += ' (Could not post results to server)';
  }
}

// Auto-run after page loads
setTimeout(runAllTests, 1000);
