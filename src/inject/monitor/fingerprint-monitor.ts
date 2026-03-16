/**
 * Fingerprint Access Monitor
 *
 * Tracks which fingerprinting APIs are being accessed by websites.
 * Sends reports back to the background script for display in the popup.
 */

import {
  PAGE_MSG_FINGERPRINT_REPORT,
  PAGE_MSG_GET_REPORT,
  PAGE_MSG_GET_RECOMMENDATIONS,
  PAGE_MSG_RECOMMENDATIONS,
  FINGERPRINT_REPORT_INTERVAL_MS,
  FINGERPRINT_MAX_LOG_SIZE,
  FINGERPRINT_STACK_TRACE_LINES,
  LOG_PREFIX,
} from '@/constants';

export interface FingerprintAccess {
  api: string;
  category: string;
  timestamp: number;
  blocked: boolean;
  spoofed: boolean;
  stackTrace?: string;
}

// In-memory log of fingerprint accesses for this page
const accessLog: FingerprintAccess[] = [];

// Categories for fingerprinting APIs
export const API_CATEGORIES: Record<string, string> = {
  // Canvas
  'HTMLCanvasElement.toDataURL': 'Canvas',
  'HTMLCanvasElement.toBlob': 'Canvas',
  'CanvasRenderingContext2D.getImageData': 'Canvas',
  'OffscreenCanvas.convertToBlob': 'OffscreenCanvas',
  'OffscreenCanvas.getContext': 'OffscreenCanvas',

  // WebGL
  'WebGLRenderingContext.getParameter': 'WebGL',
  'WebGL2RenderingContext.getParameter': 'WebGL',
  'WebGLRenderingContext.getExtension': 'WebGL',
  'WebGLRenderingContext.getSupportedExtensions': 'WebGL',
  'WEBGL_debug_renderer_info': 'WebGL',
  'WebGLRenderingContext.getShaderPrecisionFormat': 'WebGL Shaders',
  'WebGL2RenderingContext.getShaderPrecisionFormat': 'WebGL Shaders',

  // WebGPU
  'navigator.gpu.requestAdapter': 'WebGPU',
  'GPUAdapter.requestAdapterInfo': 'WebGPU',

  // Audio
  'AudioContext.createAnalyser': 'Audio',
  'AudioContext.createOscillator': 'Audio',
  'AnalyserNode.getFloatFrequencyData': 'Audio',
  'AudioContext.baseLatency': 'Audio Latency',
  'AudioContext.outputLatency': 'Audio Latency',
  'OfflineAudioContext.startRendering': 'Offline Audio',
  'OfflineAudioContext': 'Offline Audio',

  // Screen/Display
  'screen.width': 'Screen',
  'screen.height': 'Screen',
  'screen.colorDepth': 'Screen',
  'window.devicePixelRatio': 'Screen',
  'window.innerWidth': 'Screen',
  'window.innerHeight': 'Screen',
  'window.screenX': 'Screen Frame',
  'window.screenY': 'Screen Frame',
  'window.screenLeft': 'Screen Frame',
  'window.screenTop': 'Screen Frame',
  'window.outerWidth': 'Screen Frame',
  'window.outerHeight': 'Screen Frame',
  'screen.orientation': 'Screen Orientation',
  'screen.orientation.type': 'Screen Orientation',
  'screen.orientation.angle': 'Screen Orientation',

  // Navigator
  'navigator.userAgent': 'Navigator',
  'navigator.platform': 'Navigator',
  'navigator.languages': 'Navigator',
  'navigator.hardwareConcurrency': 'Hardware',
  'navigator.deviceMemory': 'Hardware',
  'navigator.plugins': 'Navigator',
  'navigator.mimeTypes': 'Navigator',
  'navigator.userAgentData': 'Client Hints',
  'navigator.userAgentData.getHighEntropyValues': 'Client Hints',
  'navigator.maxTouchPoints': 'Touch',
  'navigator.webdriver': 'Features',
  'navigator.doNotTrack': 'Features',
  'navigator.globalPrivacyControl': 'Features',
  'navigator.cookieEnabled': 'Features',
  'navigator.onLine': 'Features',
  'navigator.javaEnabled': 'Features',
  'navigator.pdfViewerEnabled': 'Features',

  // Timing
  'performance.now': 'Timing',
  'Date.getTimezoneOffset': 'Timezone',

  // DOMRect
  'Element.getBoundingClientRect': 'DOMRect',
  'Element.getClientRects': 'DOMRect',
  'Range.getBoundingClientRect': 'DOMRect',

  // Fonts
  'FontFace': 'Fonts',
  'document.fonts': 'Fonts',
  'CSS font detection': 'CSS Fonts',

  // Media
  'navigator.mediaDevices.enumerateDevices': 'Media Devices',
  'MediaDevices.enumerateDevices': 'Media Devices',
  'HTMLMediaElement.canPlayType': 'Codecs',
  'MediaSource.isTypeSupported': 'Codecs',

  // Speech
  'speechSynthesis.getVoices': 'Speech',

  // Storage
  'navigator.storage.estimate': 'Storage',
  'StorageManager.estimate': 'Storage',
  'IDBFactory.databases': 'IndexedDB',
  'indexedDB.databases': 'IndexedDB',
  'openDatabase': 'WebSQL',

  // Permissions
  'navigator.permissions.query': 'Permissions',
  'Permissions.query': 'Permissions',
  'Notification.permission': 'Notification',
  'Notification.requestPermission': 'Notification',
  'Notification.maxActions': 'Notification',

  // Clipboard
  'navigator.clipboard': 'Clipboard',
  'navigator.clipboard.readText': 'Clipboard',
  'navigator.clipboard.read': 'Clipboard',
  'navigator.clipboard.writeText': 'Clipboard',
  'navigator.clipboard.write': 'Clipboard',

  // Vibration
  'navigator.vibrate': 'Vibration',

  // Sensors
  'Accelerometer': 'Sensors',
  'Accelerometer.constructor': 'Sensors',
  'Accelerometer.start': 'Sensors',
  'LinearAccelerationSensor': 'Sensors',
  'GravitySensor': 'Sensors',
  'Gyroscope': 'Sensors',
  'Magnetometer': 'Sensors',
  'AbsoluteOrientationSensor': 'Sensors',
  'RelativeOrientationSensor': 'Sensors',
  'AmbientLightSensor': 'Sensors',
  'DeviceMotionEvent': 'Sensors',
  'DeviceOrientationEvent': 'Sensors',

  // Payment
  'ApplePaySession.canMakePayments': 'Apple Pay',
  'ApplePaySession.canMakePaymentsWithActiveCard': 'Apple Pay',
  'ApplePaySession.supportsVersion': 'Apple Pay',
  'PaymentRequest': 'Apple Pay',

  // Network
  'navigator.connection': 'Network',
  'NetworkInformation': 'Network',
  'RTCPeerConnection': 'WebRTC',

  // Battery
  'navigator.getBattery': 'Battery',

  // Intl
  'Intl.DateTimeFormat': 'Timezone',
  'Intl.DateTimeFormat.resolvedOptions': 'Timezone',
  'Intl.ListFormat': 'Intl',
  'Intl.RelativeTimeFormat': 'Intl',
  'Intl.PluralRules': 'Intl',
  'Intl.Segmenter': 'Intl',
  'Intl.DisplayNames': 'Intl',
  'Intl.supportedValuesOf': 'Intl',

  // Math
  'Math.tan': 'Math',
  'Math.sin': 'Math',
  'Math.cos': 'Math',
  'Math.exp': 'Math',
  'Math.log': 'Math',
  'Math.acos': 'Math',

  // CSS
  'matchMedia': 'CSS',
  'getComputedStyle': 'CSS',
  'CSS.supports': 'Features',
  'document.implementation.hasFeature': 'Features',

  // Keyboard
  'navigator.keyboard.getLayoutMap': 'Keyboard',

  // Touch
  'TouchEvent': 'Touch',

  // Workers
  'Worker': 'Workers',
  'SharedWorker': 'Workers',

  // Errors
  'Error.stack': 'Errors',

  // Rendering
  'emoji rendering': 'Emoji',
  'MathML rendering': 'MathML',

  // Crypto
  'crypto.subtle.digest': 'Crypto',
  'crypto.getRandomValues': 'Crypto',

  // Devices
  'navigator.getGamepads': 'Gamepad',
  'Gamepad': 'Gamepad',
  'navigator.requestMIDIAccess': 'MIDI',
  'MIDIAccess': 'MIDI',
  'navigator.bluetooth': 'Bluetooth',
  'navigator.bluetooth.getAvailability': 'Bluetooth',
  'navigator.bluetooth.requestDevice': 'Bluetooth',
  'navigator.bluetooth.getDevices': 'Bluetooth',
  'navigator.usb': 'USB',
  'navigator.usb.getDevices': 'USB',
  'navigator.usb.requestDevice': 'USB',
  'navigator.serial': 'Serial',
  'navigator.serial.getPorts': 'Serial',
  'navigator.serial.requestPort': 'Serial',
  'navigator.hid': 'HID',
  'navigator.hid.getDevices': 'HID',
  'navigator.hid.requestDevice': 'HID',
};

// Map API categories to settings paths
export const CATEGORY_TO_SETTING: Record<string, { category: string; setting: string }> = {
  'Canvas': { category: 'graphics', setting: 'canvas' },
  'OffscreenCanvas': { category: 'graphics', setting: 'offscreenCanvas' },
  'WebGL': { category: 'graphics', setting: 'webgl' },
  'WebGL Shaders': { category: 'graphics', setting: 'webglShaders' },
  'WebGPU': { category: 'graphics', setting: 'webgpu' },
  'DOMRect': { category: 'graphics', setting: 'domRect' },
  'TextMetrics': { category: 'graphics', setting: 'textMetrics' },
  'SVG': { category: 'graphics', setting: 'svg' },
  'Audio': { category: 'audio', setting: 'audioContext' },
  'Offline Audio': { category: 'audio', setting: 'offlineAudio' },
  'Codecs': { category: 'audio', setting: 'codecs' },
  'Screen': { category: 'hardware', setting: 'screen' },
  'Hardware': { category: 'hardware', setting: 'deviceMemory' },
  'Media Devices': { category: 'hardware', setting: 'mediaDevices' },
  'Battery': { category: 'hardware', setting: 'battery' },
  'Touch': { category: 'hardware', setting: 'touch' },
  'Navigator': { category: 'navigator', setting: 'userAgent' },
  'Client Hints': { category: 'navigator', setting: 'clientHints' },
  'Timezone': { category: 'timezone', setting: 'intl' },
  'Fonts': { category: 'fonts', setting: 'enumeration' },
  'CSS Fonts': { category: 'fonts', setting: 'cssDetection' },
  'WebRTC': { category: 'network', setting: 'webrtc' },
  'Network': { category: 'network', setting: 'connection' },
  'Timing': { category: 'timing', setting: 'performance' },
  'CSS': { category: 'css', setting: 'mediaQueries' },
  'Speech': { category: 'speech', setting: 'synthesis' },
  'Permissions': { category: 'permissions', setting: 'query' },
  'Storage': { category: 'storage', setting: 'estimate' },
  'IndexedDB': { category: 'storage', setting: 'indexedDB' },
  'Math': { category: 'math', setting: 'functions' },
  'Keyboard': { category: 'keyboard', setting: 'layout' },
  'Workers': { category: 'workers', setting: 'fingerprint' },
  'Errors': { category: 'errors', setting: 'stackTrace' },
  'Emoji': { category: 'rendering', setting: 'emoji' },
  'MathML': { category: 'rendering', setting: 'mathml' },
  'Intl': { category: 'intl', setting: 'apis' },
  'Crypto': { category: 'crypto', setting: 'webCrypto' },
  'Gamepad': { category: 'devices', setting: 'gamepad' },
  'MIDI': { category: 'devices', setting: 'midi' },
  'Bluetooth': { category: 'devices', setting: 'bluetooth' },
  'USB': { category: 'devices', setting: 'usb' },
  'Serial': { category: 'devices', setting: 'serial' },
  'HID': { category: 'devices', setting: 'hid' },
  'Features': { category: 'features', setting: 'detection' },
  'Screen Frame': { category: 'hardware', setting: 'screenFrame' },
  'Screen Orientation': { category: 'hardware', setting: 'orientation' },
  'Sensors': { category: 'hardware', setting: 'sensors' },
  'Audio Latency': { category: 'audio', setting: 'latency' },
  'Clipboard': { category: 'navigator', setting: 'clipboard' },
  'Vibration': { category: 'navigator', setting: 'vibration' },
  'Notification': { category: 'permissions', setting: 'notification' },
  'WebSQL': { category: 'storage', setting: 'webSQL' },
  'Apple Pay': { category: 'payment', setting: 'applePay' },
};

/**
 * Log a fingerprint API access
 */
export function logAccess(
  api: string,
  options: { blocked?: boolean; spoofed?: boolean; captureStack?: boolean } = {}
): void {
  const { blocked = false, spoofed = true, captureStack = false } = options;

  const access: FingerprintAccess = {
    api,
    category: API_CATEGORIES[api] || 'Unknown',
    timestamp: Date.now(),
    blocked,
    spoofed,
  };

  // Capture stack trace if requested (helps identify tracking scripts)
  if (captureStack) {
    try {
      const stack = new Error().stack;
      if (stack) {
        // Remove the first two lines (Error and this function)
        access.stackTrace = stack
          .split('\n')
          .slice(2, 2 + FINGERPRINT_STACK_TRACE_LINES)
          .join('\n');
      }
    } catch {
      // Stack trace not available
    }
  }

  accessLog.push(access);

  // Keep log size manageable
  if (accessLog.length > FINGERPRINT_MAX_LOG_SIZE) {
    accessLog.shift();
  }
}

/**
 * Get all logged accesses
 */
export function getAccessLog(): FingerprintAccess[] {
  return [...accessLog];
}

/**
 * Get access summary by category
 */
export function getAccessSummary(): Record<string, { count: number; blocked: number; spoofed: number }> {
  const summary: Record<string, { count: number; blocked: number; spoofed: number }> = {};

  for (const access of accessLog) {
    if (!summary[access.category]) {
      summary[access.category] = { count: 0, blocked: 0, spoofed: 0 };
    }
    summary[access.category].count++;
    if (access.blocked) summary[access.category].blocked++;
    if (access.spoofed) summary[access.category].spoofed++;
  }

  return summary;
}

/**
 * Clear the access log
 */
export function clearAccessLog(): void {
  accessLog.length = 0;
}

/**
 * Send access report to background script
 */
export function reportToBackground(): void {
  const summary = getAccessSummary();
  const detail = getAccessLog();

  // Use postMessage to send to content script, which forwards to background
  window.postMessage({
    type: PAGE_MSG_FINGERPRINT_REPORT,
    summary,
    detail,
    url: window.location.href,
  }, '*');
}

// Auto-report periodically if there are new accesses
let lastReportedCount = 0;

setInterval(() => {
  if (accessLog.length > lastReportedCount) {
    reportToBackground();
    lastReportedCount = accessLog.length;
  }
}, FINGERPRINT_REPORT_INTERVAL_MS);

// Also report on page unload
window.addEventListener('beforeunload', () => {
  reportToBackground();
});

/**
 * Get recommendations for spoofers that should be enabled
 * Returns APIs that were accessed but have protection disabled
 */
export function getRecommendations(
  settings: Record<string, Record<string, string>>
): { api: string; category: string; setting: string }[] {
  const recommendations: { api: string; category: string; setting: string }[] = [];
  const seenCategories = new Set<string>();

  for (const access of accessLog) {
    // Skip if we've already recommended this category
    if (seenCategories.has(access.category)) continue;

    const settingInfo = CATEGORY_TO_SETTING[access.category];
    if (!settingInfo) continue;

    // Check if the spoofer is disabled
    const { category, setting } = settingInfo;
    const spooferSettings = settings[category];
    if (spooferSettings && spooferSettings[setting] === 'off') {
      recommendations.push({
        api: access.api,
        category: access.category,
        setting: `${category}.${setting}`,
      });
      seenCategories.add(access.category);
    }
  }

  return recommendations;
}

/**
 * Get unique accessed categories for quick overview
 */
export function getAccessedCategories(): string[] {
  const categories = new Set<string>();
  for (const access of accessLog) {
    categories.add(access.category);
  }
  return Array.from(categories);
}

/**
 * Initialize the fingerprint monitor
 */
export function initFingerprintMonitor(): void {
  console.log(`${LOG_PREFIX} Fingerprint access monitor initialized`);

  // Listen for requests from popup/content script
  window.addEventListener('message', (event) => {
    if (event.data?.type === PAGE_MSG_GET_REPORT) {
      reportToBackground();
    }
    if (event.data?.type === PAGE_MSG_GET_RECOMMENDATIONS) {
      const recommendations = getRecommendations(event.data.settings);
      window.postMessage({
        type: PAGE_MSG_RECOMMENDATIONS,
        recommendations,
        accessedCategories: getAccessedCategories(),
      }, '*');
    }
  });
}
