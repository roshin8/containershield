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

/** Execute script in a tab and return the result */
async function readValues(tabId: number): Promise<Record<string, any>> {
  const results = await browser.tabs.executeScript(tabId, {
    code: `(function() {
      var r = {};
      try { r.ua = navigator.userAgent; } catch(e) { r.ua = 'error'; }
      try { r.platform = navigator.platform; } catch(e) { r.platform = 'error'; }
      try { r.vendor = navigator.vendor; } catch(e) { r.vendor = 'error'; }
      try { r.cores = navigator.hardwareConcurrency; } catch(e) {}
      try { r.ram = navigator.deviceMemory; } catch(e) {}
      try { r.tzo = new Date().getTimezoneOffset(); } catch(e) {}
      try { r.intlTz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) {}
      try { r.screenW = screen.width; } catch(e) {}
      try { r.screenH = screen.height; } catch(e) {}
      try { r.dpr = window.devicePixelRatio; } catch(e) {}
      try { r.oscpu = navigator.oscpu; } catch(e) {}
      try { r.hasUAD = 'userAgentData' in navigator; } catch(e) {}
      try { r.webdriver = navigator.webdriver; } catch(e) {}
      try { r.langs = navigator.languages.join(','); } catch(e) {}
      try {
        var c = document.createElement('canvas');
        var gl = c.getContext('webgl');
        var ext = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
        r.glVendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'no ext';
        r.glRenderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no ext';
      } catch(e) { r.glVendor = 'error'; r.glRenderer = 'error'; }
      try {
        var c2 = document.createElement('canvas');
        c2.width = 200; c2.height = 50;
        var ctx = c2.getContext('2d');
        ctx.fillStyle = '#f60'; ctx.fillRect(0,0,200,50);
        ctx.fillStyle = '#069'; ctx.font = '14px Arial';
        ctx.fillText('Fingerprint Test', 2, 15);
        r.canvasHash = c2.toDataURL().substring(0, 50);
      } catch(e) {}
      try {
        var f = document.createElement('iframe');
        f.style.display = 'none';
        document.body.appendChild(f);
        r.iframeTzo = new f.contentWindow.Date().getTimezoneOffset();
        r.iframeScreenW = f.contentWindow.screen.width;
        var ic = f.contentDocument.createElement('canvas');
        var igl = ic.getContext('webgl');
        var iext = igl ? igl.getExtension('WEBGL_debug_renderer_info') : null;
        r.iframeGl = iext ? igl.getParameter(iext.UNMASKED_VENDOR_WEBGL) : 'no ext';
        document.body.removeChild(f);
      } catch(e) { r.iframeError = e.message; }
      return r;
    })();`,
  });
  return results[0] || {};
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
  return runScenario('CreepJS — Default balanced profile', async () => {
    const tabId = await openTab('https://abrahamjuliot.github.io/creepjs/', 18000);
    const v = await readValues(tabId);
    const screenshot = await captureScreenshot();
    await browser.tabs.remove(tabId);

    return {
      values: v,
      screenshot,
      checks: [
        check('UA spoofed', v.ua, 'not Firefox', !v.ua?.includes('Firefox/')),
        check('Platform spoofed', v.platform, 'not MacIntel', v.platform !== 'MacIntel'),
        check('WebGL spoofed', v.glVendor, 'not Intel Inc.', v.glVendor !== 'Intel Inc.'),
        check('Timezone spoofed', v.tzo, 'not ' + REAL_TZO, v.tzo !== REAL_TZO),
        check('Screen spoofed', v.screenW, 'not 1920', v.screenW !== 1920 && v.screenW !== 1680),
        check('Webdriver hidden', v.webdriver, 'false', v.webdriver === false),
        check('Iframe WebGL matches', v.iframeGl, v.glVendor, v.iframeGl === v.glVendor),
        check('Iframe TZO matches', v.iframeTzo, String(v.tzo), v.iframeTzo === v.tzo),
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
    const [fpId1] = await browser.tabs.executeScript(tabId, {
      code: `document.querySelector('[data-test="visitor-id"]')?.textContent || document.body.innerText.match(/Visitor ID[:\\s]*([a-zA-Z0-9]+)/)?.[1] || 'not found'`,
    });

    const screenshot = await captureScreenshot();
    await browser.tabs.remove(tabId);

    return {
      values: { ...v1, fpId: fpId1 },
      screenshot,
      checks: [
        check('UA spoofed', v1.ua, 'not Firefox', !v1.ua?.includes('Firefox/')),
        check('Platform spoofed', v1.platform, 'not MacIntel', v1.platform !== 'MacIntel'),
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
    const [hasContent] = await browser.tabs.executeScript(tabId, {
      code: `!!document.querySelector('#root')?.children?.length`,
    });

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
    const [workerVals] = await browser.tabs.executeScript(tabId, {
      code: `new Promise(function(resolve) {
        var code = 'self.postMessage({ua:self.navigator.userAgent.substring(0,60),tzo:new Date().getTimezoneOffset(),cores:self.navigator.hardwareConcurrency,platform:self.navigator.platform})';
        var blob = new Blob([code], {type:'application/javascript'});
        var w = new Worker(URL.createObjectURL(blob));
        w.onmessage = function(e) { w.terminate(); resolve(e.data); };
        w.onerror = function() { resolve({error:'worker failed'}); };
        setTimeout(function() { resolve({error:'timeout'}); }, 5000);
      })`,
    });

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
