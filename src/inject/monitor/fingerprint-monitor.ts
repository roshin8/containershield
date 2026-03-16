/**
 * Fingerprint Access Monitor
 *
 * Tracks which fingerprinting APIs are being accessed by websites.
 * Sends reports back to the background script for display in the popup.
 */

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
  'OffscreenCanvas.convertToBlob': 'Canvas',

  // WebGL
  'WebGLRenderingContext.getParameter': 'WebGL',
  'WebGL2RenderingContext.getParameter': 'WebGL',
  'WebGLRenderingContext.getExtension': 'WebGL',
  'WebGLRenderingContext.getSupportedExtensions': 'WebGL',
  'WEBGL_debug_renderer_info': 'WebGL',

  // Audio
  'AudioContext.createAnalyser': 'Audio',
  'AudioContext.createOscillator': 'Audio',
  'AnalyserNode.getFloatFrequencyData': 'Audio',
  'OfflineAudioContext.startRendering': 'Audio',

  // Screen/Display
  'screen.width': 'Screen',
  'screen.height': 'Screen',
  'screen.colorDepth': 'Screen',
  'window.devicePixelRatio': 'Screen',
  'window.innerWidth': 'Screen',
  'window.innerHeight': 'Screen',

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

  // Permissions
  'navigator.permissions.query': 'Permissions',
  'Permissions.query': 'Permissions',

  // Network
  'navigator.connection': 'Network',
  'NetworkInformation': 'Network',
  'RTCPeerConnection': 'WebRTC',

  // Battery
  'navigator.getBattery': 'Battery',

  // Intl
  'Intl.DateTimeFormat': 'Timezone',
  'Intl.DateTimeFormat.resolvedOptions': 'Timezone',

  // Math
  'Math.tan': 'Math',
  'Math.sin': 'Math',
  'Math.cos': 'Math',

  // CSS
  'matchMedia': 'CSS',
  'getComputedStyle': 'CSS',

  // Keyboard
  'navigator.keyboard.getLayoutMap': 'Keyboard',
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
        access.stackTrace = stack.split('\n').slice(2, 6).join('\n');
      }
    } catch {
      // Stack trace not available
    }
  }

  accessLog.push(access);

  // Keep log size manageable
  if (accessLog.length > 1000) {
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
    type: 'CONTAINER_SHIELD_FINGERPRINT_REPORT',
    summary,
    detail,
    url: window.location.href,
  }, '*');
}

// Auto-report every 5 seconds if there are new accesses
let lastReportedCount = 0;

setInterval(() => {
  if (accessLog.length > lastReportedCount) {
    reportToBackground();
    lastReportedCount = accessLog.length;
  }
}, 5000);

// Also report on page unload
window.addEventListener('beforeunload', () => {
  reportToBackground();
});
