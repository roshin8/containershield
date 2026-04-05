/**
 * Browser API mock for testing popup UI outside extension context.
 * Returns the addInitScript function body as a string.
 */

export function getBrowserMockScript(): string {
  return `
    window.__mockState = {
      settings: null,
      saved: [],
    };

    const DEFAULT_SETTINGS = {
      enabled: true,
      protectionLevel: 2,
      profile: { mode: 'random' },
      headers: {
        spoofUserAgent: true, spoofAcceptLanguage: true, refererPolicy: 'same-origin',
        disableEtag: true, sendDNT: false, spoofXForwardedFor: false,
        xForwardedForMode: 'random', xForwardedForValue: '', spoofVia: false,
      },
      spoofers: {
        graphics: { canvas: 'noise', webgl: 'noise', webgl2: 'noise', domRect: 'noise', textMetrics: 'noise', svg: 'noise', offscreenCanvas: 'noise', webglShaders: 'noise', webgpu: 'noise' },
        audio: { audioContext: 'noise', offlineAudio: 'noise', latency: 'noise', codecs: 'off' },
        hardware: { screen: 'noise', screenFrame: 'noise', screenExtended: 'noise', orientation: 'noise', deviceMemory: 'noise', hardwareConcurrency: 'noise', mediaDevices: 'noise', battery: 'block', gpu: 'noise', touch: 'noise', sensors: 'block', architecture: 'noise', visualViewport: 'noise' },
        navigator: { userAgent: 'noise', languages: 'noise', plugins: 'noise', clientHints: 'noise', clipboard: 'block', vibration: 'noise', vendorFlavors: 'noise', fontPreferences: 'noise', windowName: 'block', tabHistory: 'noise' },
        timezone: { intl: 'noise', date: 'noise' },
        fonts: { enumeration: 'noise', cssDetection: 'noise' },
        network: { webrtc: 'public_only', connection: 'off', geolocation: 'block', websocket: 'off' },
        timing: { performance: 'noise', memory: 'noise' },
        css: { mediaQueries: 'noise' },
        speech: { synthesis: 'noise' },
        permissions: { query: 'noise', notification: 'noise' },
        storage: { estimate: 'noise', indexedDB: 'noise', webSQL: 'block' },
        math: { functions: 'noise' },
        keyboard: { layout: 'noise', cadence: 'noise' },
        workers: { fingerprint: 'noise' },
        errors: { stackTrace: 'noise' },
        rendering: { emoji: 'noise', mathml: 'noise' },
        intl: { apis: 'noise' },
        crypto: { webCrypto: 'noise' },
        devices: { gamepad: 'block', midi: 'block', bluetooth: 'block', usb: 'block', serial: 'block', hid: 'block' },
        features: { detection: 'noise' },
        payment: { applePay: 'block' },
      },
      domainRules: {},
    };

    const CONTAINERS = [
      { cookieStoreId: 'firefox-default', name: 'Default', color: 'blue', colorCode: '#37adff', icon: 'circle' },
      { cookieStoreId: 'firefox-container-1', name: 'Personal', color: 'green', colorCode: '#51cd4e', icon: 'fingerprint' },
      { cookieStoreId: 'firefox-container-2', name: 'Work', color: 'orange', colorCode: '#ff9f00', icon: 'briefcase' },
    ];

    const PROFILE = {
      userAgent: { id: 'ff120win', name: 'Firefox 120 Win', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0', platform: 'Win32', platformName: 'Windows' },
      screen: { width: 1920, height: 1080, colorDepth: 24, devicePixelRatio: 1 },
      hardwareConcurrency: 8, deviceMemory: 8, languages: ['en-US', 'en'],
    };

    window.__mockState.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

    globalThis.chrome = {
      runtime: {
        id: 'mock-extension-id',
        sendMessage: (msg, cb) => {
          const r = handleMessage(msg);
          if (cb) cb(r);
          return Promise.resolve(r);
        },
        onMessage: { addListener: () => {} },
        getURL: (p) => p,
      },
      tabs: {
        query: (q, cb) => { const r = [{ id: 1, url: 'https://example.com' }]; if (cb) cb(r); return Promise.resolve(r); },
        create: (o, cb) => { if (cb) cb({}); return Promise.resolve({}); },
        onRemoved: { addListener: () => {} },
      },
      storage: {
        local: {
          get: (k, cb) => { if (cb) cb({}); return Promise.resolve({}); },
          set: (d, cb) => { if (cb) cb(); return Promise.resolve(); },
        },
      },
    };

    function handleMessage(msg) {
      const state = window.__mockState;

      switch (msg.type) {
        case 'GET_ALL_CONTAINERS':
          return CONTAINERS;

        case 'GET_CONTAINER_INFO':
          return { containerId: 'firefox-default', containerName: 'Default', containerColor: 'blue', containerIcon: 'circle' };

        case 'GET_SETTINGS':
          return JSON.parse(JSON.stringify(state.settings));

        case 'SET_SETTINGS':
          // Deep merge
          const updates = msg.settings;
          state.settings = { ...state.settings, ...updates };
          if (updates.profile) state.settings.profile = { ...state.settings.profile, ...updates.profile };
          if (updates.headers) state.settings.headers = { ...state.settings.headers, ...updates.headers };
          if (updates.spoofers) {
            for (const [cat, vals] of Object.entries(updates.spoofers)) {
              state.settings.spoofers[cat] = { ...state.settings.spoofers[cat], ...vals };
            }
          }
          if (updates.domainRules !== undefined) state.settings.domainRules = updates.domainRules;
          state.saved.push(JSON.parse(JSON.stringify(updates)));
          return { success: true };

        case 'GET_ASSIGNED_PROFILE':
          return PROFILE;

        case 'GET_RECOMMENDATIONS':
          return {
            recommendations: [],
            accessedCategories: ['Canvas', 'Navigator', 'Screen'],
            accessedAPIs: [
              { api: 'HTMLCanvasElement.toDataURL', category: 'Canvas', spoofed: true, blocked: false, timestamp: Date.now() },
              { api: 'navigator.userAgent', category: 'Navigator', spoofed: true, blocked: false, timestamp: Date.now() },
              { api: 'screen.width', category: 'Screen', spoofed: true, blocked: false, timestamp: Date.now() },
              { api: 'navigator.plugins', category: 'Navigator', spoofed: false, blocked: false, timestamp: Date.now() },
              { api: 'performance.now', category: 'Timing', spoofed: true, blocked: false, timestamp: Date.now() },
            ],
            totalAccesses: 5,
            url: 'https://example.com',
          };

        default:
          console.warn('[Mock] Unhandled message type:', msg.type);
          return null;
      }
    }
  `;
}
