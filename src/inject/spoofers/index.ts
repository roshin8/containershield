/**
 * Spoofer Registry - Orchestrates all fingerprint spoofers
 */

import type { InjectConfig } from '@/types';
import { PRNG, base64ToUint8Array } from '@/lib/crypto';

// Graphics
import { initCanvasSpoofer } from './graphics/canvas';
import { initOffscreenCanvasSpoofer } from './canvas/offscreen';
import { initWebGLSpoofer, getSelectedGPU } from './graphics/webgl';
import { initWebGLShaderSpoofer } from './graphics/webgl-shaders';
import { initWebGPUSpoofer } from './graphics/webgpu';
import { initDOMRectSpoofer } from './graphics/domrect';
import { initTextMetricsSpoofer } from './graphics/text-metrics';
import { initSVGSpoofer } from './graphics/svg';

// Audio
import { initAudioSpoofer } from './audio/audio-context';
import { initOfflineAudioSpoofer } from './audio/offline-audio';
import { initAudioLatencySpoofer } from './audio/audio-latency';

// Hardware
import { initScreenSpoofer } from './hardware/screen';
import { initScreenFrameSpoofer } from './hardware/screen-frame';
import { initScreenExtendedSpoofer } from './hardware/screen-extended';
import { initScreenOrientationSpoofer } from './hardware/screen-orientation';
import { initDeviceSpoofer } from './hardware/device';
import { initBatterySpoofer } from './hardware/battery';
import { initMediaDevicesSpoofer } from './hardware/media-devices';
import { initTouchSpoofer } from './hardware/touch';
import { initSensorSpoofer } from './hardware/sensors';
import { initArchitectureSpoofer } from './hardware/architecture';
import { initVisualViewportSpoofer } from './hardware/visual-viewport';

// Navigator
import { initNavigatorSpoofer } from './navigator/user-agent';
import { initClipboardSpoofer } from './navigator/clipboard';
import { initVibrationSpoofer } from './navigator/vibration';
import { initVendorFlavorSpoofer } from './navigator/vendor-flavors';
import { initFontPreferencesSpoofer } from './navigator/font-preferences';
import { initWindowNameSpoofer } from './navigator/window-name';
import { initTabHistorySpoofer } from './navigator/tab-history';

// Timezone
import { initTimezoneSpoofer } from './timezone/intl';

// Fonts
import { initFontSpoofer } from './fonts/font-enum';
import { initCSSFontSpoofer } from './fonts/css-fonts';

// Network
import { initWebRTCSpoofer } from './network/webrtc';
import { initNetworkSpoofer } from './network/connection';
import { initGeolocationSpoofer } from './network/geolocation';
import { initWebSocketSpoofer } from './network/websocket';

// Keyboard (import cadence)
import { initKeyboardCadenceSpoofer } from './keyboard/cadence';

// Timing
import { initPerformanceSpoofer } from './timing/performance';
import { initMemorySpoofer } from './timing/memory';

// CSS
import { initCSSSpoofer } from './css/media-queries';

// Speech
import { initSpeechSpoofer } from './speech/synthesis';

// Permissions
import { initPermissionsSpoofer } from './permissions/permissions';
import { initNotificationSpoofer } from './permissions/notification';

// Storage
import { initStorageSpoofer } from './storage/storage-estimate';
import { initIndexedDBSpoofer } from './storage/indexeddb';
import { initWebSQLSpoofer } from './storage/websql';

// Codecs
import { initCodecSpoofer } from './codecs/codecs';

// Math
import { initMathSpoofer } from './math/math';

// Keyboard
import { initKeyboardSpoofer } from './keyboard/keyboard';

// Workers
import { initWorkerSpoofer } from './workers/worker-fingerprint';

// Errors
import { initErrorSpoofer } from './errors/stack-trace';

// Rendering
import { initEmojiSpoofer } from './rendering/emoji';
import { initMathMLSpoofer } from './rendering/mathml';

// Intl
import { initIntlSpoofer } from './intl/intl-apis';

// Crypto
import { initCryptoSpoofer } from './crypto/webcrypto';

// Devices
import { initGamepadSpoofer } from './devices/gamepad';
import { initMIDISpoofer } from './devices/midi';
import { initBluetoothSpoofer } from './devices/bluetooth';
import { initUSBSpoofer, initSerialSpoofer, initHIDSpoofer } from './devices/usb-serial';

// Features
import { initFeatureSpoofer } from './features/feature-detection';

// Payment
import { initApplePaySpoofer } from './payment/apple-pay';

// Monitor
import { initFingerprintMonitor, reportToBackground, markSpoofersInitialized } from '../monitor/fingerprint-monitor';

let pagePRNG: PRNG | null = null;

export function getPagePRNG(): PRNG | null {
  return pagePRNG;
}

/**
 * Initialize all spoofers based on configuration
 */
export function initializeSpoofers(config: InjectConfig): void {
  markSpoofersInitialized();

  // Create page-specific PRNG by combining container seed with domain
  const seedBytes = base64ToUint8Array(config.seed);
  const domainBytes = new TextEncoder().encode(config.domain);
  const combined = new Uint8Array(seedBytes.length + domainBytes.length);
  combined.set(seedBytes);
  combined.set(domainBytes, seedBytes.length);

  // XOR-fold into 32 bytes
  const hashedSeed = new Uint8Array(32);
  for (let i = 0; i < combined.length; i++) {
    hashedSeed[i % 32] ^= combined[i];
  }

  pagePRNG = new PRNG(hashedSeed);

  const { settings, assignedProfile } = config;

  // Graphics
  if (settings.graphics.canvas !== 'off') initCanvasSpoofer(settings.graphics.canvas, pagePRNG);
  let selectedGPURef: { vendor: string; renderer: string } | null = null;
  if (settings.graphics.webgl !== 'off' || settings.graphics.webgl2 !== 'off') {
    initWebGLSpoofer(settings.graphics.webgl, settings.graphics.webgl2, pagePRNG, assignedProfile);
    selectedGPURef = getSelectedGPU();
  }
  if (settings.graphics.offscreenCanvas !== 'off') initOffscreenCanvasSpoofer(settings.graphics.offscreenCanvas, pagePRNG);
  if (settings.graphics.webglShaders !== 'off') initWebGLShaderSpoofer(settings.graphics.webglShaders, pagePRNG);
  if (settings.graphics.webgpu !== 'off') initWebGPUSpoofer(settings.graphics.webgpu, pagePRNG);
  if (settings.graphics.domRect !== 'off') initDOMRectSpoofer(settings.graphics.domRect, pagePRNG);
  if (settings.graphics.textMetrics !== 'off') initTextMetricsSpoofer(settings.graphics.textMetrics, pagePRNG);
  if (settings.graphics.svg !== 'off') initSVGSpoofer(settings.graphics.svg, pagePRNG);

  // Audio
  if (settings.audio.audioContext !== 'off') initAudioSpoofer(settings.audio.audioContext, pagePRNG);
  if (settings.audio.offlineAudio !== 'off') initOfflineAudioSpoofer(settings.audio.offlineAudio, pagePRNG);
  if (settings.audio.latency !== 'off') initAudioLatencySpoofer(settings.audio.latency, pagePRNG);
  if (settings.audio.codecs !== 'off') initCodecSpoofer(settings.audio.codecs, pagePRNG);

  // Hardware
  if (settings.hardware.screen !== 'off') initScreenSpoofer(settings.hardware.screen, pagePRNG, assignedProfile?.screen);
  if (settings.hardware.screenFrame !== 'off') initScreenFrameSpoofer(settings.hardware.screenFrame, pagePRNG);
  if (settings.hardware.orientation !== 'off') initScreenOrientationSpoofer(settings.hardware.orientation, pagePRNG);
  if (settings.hardware.deviceMemory !== 'off' || settings.hardware.hardwareConcurrency !== 'off') {
    initDeviceSpoofer(settings.hardware.deviceMemory, settings.hardware.hardwareConcurrency, pagePRNG, assignedProfile);
  }
  if (settings.hardware.battery !== 'off') initBatterySpoofer(settings.hardware.battery, pagePRNG);
  if (settings.hardware.mediaDevices !== 'off') initMediaDevicesSpoofer(settings.hardware.mediaDevices, pagePRNG);
  if (settings.hardware.touch !== 'off') initTouchSpoofer(settings.hardware.touch, pagePRNG, assignedProfile);
  if (settings.hardware.sensors !== 'off') initSensorSpoofer(settings.hardware.sensors, pagePRNG);
  if (settings.hardware.architecture !== 'off') initArchitectureSpoofer(settings.hardware.architecture, pagePRNG);
  if (settings.hardware.visualViewport !== 'off') initVisualViewportSpoofer(settings.hardware.visualViewport, pagePRNG);
  if (settings.hardware.screenExtended !== 'off') initScreenExtendedSpoofer(settings.hardware.screenExtended, pagePRNG);

  // Navigator
  if (settings.navigator.userAgent !== 'off') initNavigatorSpoofer(settings.navigator, pagePRNG, config.profile, assignedProfile);
  if (settings.navigator.clipboard !== 'off') initClipboardSpoofer(settings.navigator.clipboard, pagePRNG);
  if (settings.navigator.vibration !== 'off') initVibrationSpoofer(settings.navigator.vibration, pagePRNG);
  if (settings.navigator.vendorFlavors !== 'off') initVendorFlavorSpoofer(settings.navigator.vendorFlavors, pagePRNG);
  if (settings.navigator.fontPreferences !== 'off') initFontPreferencesSpoofer(settings.navigator.fontPreferences, pagePRNG);
  if (settings.navigator.windowName !== 'off') initWindowNameSpoofer(settings.navigator.windowName, pagePRNG);
  if (settings.navigator.tabHistory !== 'off') initTabHistorySpoofer(settings.navigator.tabHistory, pagePRNG);

  // Timezone
  if (settings.timezone.intl !== 'off' || settings.timezone.date !== 'off') {
    initTimezoneSpoofer(settings.timezone, pagePRNG, assignedProfile);
  }

  // Fonts - pass assignedProfile so font list matches spoofed platform
  if (settings.fonts.enumeration !== 'off') initFontSpoofer(settings.fonts.enumeration, pagePRNG, assignedProfile);
  if (settings.fonts.cssDetection !== 'off') initCSSFontSpoofer(settings.fonts.cssDetection, pagePRNG);

  // Network
  if (settings.network.webrtc !== 'off') initWebRTCSpoofer(settings.network.webrtc, pagePRNG);
  if (settings.network.connection !== 'off') initNetworkSpoofer(settings.network.connection, pagePRNG);
  if (settings.network.geolocation !== 'off') initGeolocationSpoofer(settings.network.geolocation, pagePRNG);
  if (settings.network.websocket !== 'off') initWebSocketSpoofer(settings.network.websocket, pagePRNG);

  // Timing
  if (settings.timing.performance !== 'off') initPerformanceSpoofer(settings.timing.performance, pagePRNG);
  if (settings.timing.memory !== 'off') initMemorySpoofer(settings.timing.memory, pagePRNG);

  // CSS
  if (settings.css.mediaQueries !== 'off') initCSSSpoofer(settings.css.mediaQueries, pagePRNG, assignedProfile);

  // Speech
  if (settings.speech.synthesis !== 'off') initSpeechSpoofer(settings.speech.synthesis, pagePRNG);

  // Permissions
  if (settings.permissions.query !== 'off') initPermissionsSpoofer(settings.permissions.query, pagePRNG);
  if (settings.permissions.notification !== 'off') initNotificationSpoofer(settings.permissions.notification, pagePRNG);

  // Storage
  if (settings.storage.estimate !== 'off') initStorageSpoofer(settings.storage.estimate, pagePRNG);
  if (settings.storage.indexedDB !== 'off') initIndexedDBSpoofer(settings.storage.indexedDB, pagePRNG);
  if (settings.storage.webSQL !== 'off') initWebSQLSpoofer(settings.storage.webSQL, pagePRNG);

  // Math
  if (settings.math.functions !== 'off') initMathSpoofer(settings.math.functions, pagePRNG);

  // Keyboard
  if (settings.keyboard.layout !== 'off') initKeyboardSpoofer(settings.keyboard.layout, pagePRNG);
  if (settings.keyboard.cadence !== 'off') initKeyboardCadenceSpoofer(settings.keyboard.cadence, pagePRNG);

  // Workers
  if (settings.workers.fingerprint !== 'off') initWorkerSpoofer(settings.workers.fingerprint, pagePRNG, assignedProfile);

  // Errors
  if (settings.errors.stackTrace !== 'off') initErrorSpoofer(settings.errors.stackTrace, pagePRNG);

  // Rendering
  if (settings.rendering.emoji !== 'off') initEmojiSpoofer(settings.rendering.emoji, pagePRNG);
  if (settings.rendering.mathml !== 'off') initMathMLSpoofer(settings.rendering.mathml, pagePRNG);

  // Intl
  if (settings.intl.apis !== 'off') initIntlSpoofer(settings.intl.apis, pagePRNG, assignedProfile);

  // Crypto
  if (settings.crypto.webCrypto !== 'off') initCryptoSpoofer(settings.crypto.webCrypto, pagePRNG);

  // Devices
  if (settings.devices.gamepad !== 'off') initGamepadSpoofer(settings.devices.gamepad, pagePRNG);
  if (settings.devices.midi !== 'off') initMIDISpoofer(settings.devices.midi, pagePRNG);
  if (settings.devices.bluetooth !== 'off') initBluetoothSpoofer(settings.devices.bluetooth, pagePRNG);
  if (settings.devices.usb !== 'off') initUSBSpoofer(settings.devices.usb, pagePRNG);
  if (settings.devices.serial !== 'off') initSerialSpoofer(settings.devices.serial, pagePRNG);
  if (settings.devices.hid !== 'off') initHIDSpoofer(settings.devices.hid, pagePRNG);

  // Features
  if (settings.features.detection !== 'off') initFeatureSpoofer(settings.features.detection, pagePRNG);

  // Payment
  if (settings.payment.applePay !== 'off') initApplePaySpoofer(settings.payment.applePay, pagePRNG);

  // Intercept iframe creation to apply critical overrides to iframe contexts.
  // Fingerprinting tools like CreepJS create iframes to get clean, unmodified
  // prototypes and bypass main-frame overrides.
  patchIframePrototypes(settings, assignedProfile, selectedGPURef);

  // Initialize monitor and send initial report
  initFingerprintMonitor();
  setTimeout(reportToBackground, 50);
}

/**
 * Patch prototypes in dynamically created iframes so fingerprinters
 * can't bypass our overrides by reading from iframe contexts.
 */
function patchIframePrototypes(
  settings: any,
  assignedProfile: any,
  selectedGPURef: { vendor: string; renderer: string } | null
): void {
  // Get spoofed values from assigned profile
  const screen = assignedProfile?.screen;
  const ua = assignedProfile?.userAgent;
  const hc = assignedProfile?.hardwareConcurrency;
  const dm = assignedProfile?.deviceMemory;
  const langs = assignedProfile?.languages;
  const tzOffset = assignedProfile?.timezoneOffset;

  // Compute timezone
  let targetTimezone: string | null = null;
  if (tzOffset !== undefined) {
    const TIMEZONE_NAMES: Record<number, string> = {
      [-720]: 'Etc/GMT+12', [-600]: 'Pacific/Honolulu', [-540]: 'America/Anchorage',
      [-480]: 'America/Los_Angeles', [-420]: 'America/Denver', [-360]: 'America/Chicago',
      [-300]: 'America/New_York', [-240]: 'America/Halifax', [-180]: 'America/Sao_Paulo',
      [0]: 'UTC', [60]: 'Europe/Paris', [120]: 'Europe/Helsinki', [180]: 'Europe/Moscow',
      [240]: 'Asia/Dubai', [300]: 'Asia/Karachi', [330]: 'Asia/Kolkata',
      [360]: 'Asia/Dhaka', [420]: 'Asia/Bangkok', [480]: 'Asia/Shanghai',
      [540]: 'Asia/Tokyo', [600]: 'Australia/Sydney', [720]: 'Pacific/Auckland',
    };
    targetTimezone = TIMEZONE_NAMES[tzOffset] || null;
  }

  function patchIframeWindow(iframeWin: Window): void {
    try {
      // Patch WebGL in iframe
      if (selectedGPURef && settings.graphics?.webgl !== 'off') {
        const iframeWGL = (iframeWin as any).WebGLRenderingContext;
        if (iframeWGL) {
          const origGP = iframeWGL.prototype.getParameter;
          iframeWGL.prototype.getParameter = function(pname: number) {
            if (pname === 0x9245 || pname === 0x1F00) return selectedGPURef!.vendor;
            if (pname === 0x9246 || pname === 0x1F01) return selectedGPURef!.renderer;
            return origGP.call(this, pname);
          };
        }
        const iframeWGL2 = (iframeWin as any).WebGL2RenderingContext;
        if (iframeWGL2) {
          const origGP2 = iframeWGL2.prototype.getParameter;
          iframeWGL2.prototype.getParameter = function(pname: number) {
            if (pname === 0x9245 || pname === 0x1F00) return selectedGPURef!.vendor;
            if (pname === 0x9246 || pname === 0x1F01) return selectedGPURef!.renderer;
            return origGP2.call(this, pname);
          };
        }
      }

      // Patch screen in iframe
      if (screen && settings.hardware?.screen !== 'off') {
        const scr = iframeWin.screen;
        const screenProps: Record<string, number> = {
          width: screen.width, height: screen.height,
          availWidth: screen.availWidth, availHeight: screen.availHeight,
          colorDepth: screen.colorDepth, pixelDepth: screen.pixelDepth,
        };
        for (const [prop, val] of Object.entries(screenProps)) {
          try { Object.defineProperty(scr, prop, { get: () => val, configurable: true }); } catch {}
        }
        if (screen.devicePixelRatio) {
          try { Object.defineProperty(iframeWin, 'devicePixelRatio', { get: () => screen.devicePixelRatio, configurable: true }); } catch {}
        }
      }

      // Patch navigator in iframe
      if (ua && settings.navigator?.userAgent !== 'off') {
        const nav = (iframeWin as any).Navigator?.prototype || iframeWin.navigator;
        const navProps: Record<string, any> = {
          userAgent: ua.userAgent, platform: ua.platform,
          vendor: ua.vendor || '', appVersion: ua.appVersion || '',
        };
        for (const [prop, val] of Object.entries(navProps)) {
          try { Object.defineProperty(nav, prop, { get: () => val, configurable: true }); } catch {}
        }
        if (hc) try { Object.defineProperty(nav, 'hardwareConcurrency', { get: () => hc, configurable: true }); } catch {}
        if (dm) try { Object.defineProperty(nav, 'deviceMemory', { get: () => dm, configurable: true }); } catch {}
        if (langs) {
          const frozen = Object.freeze([...langs]);
          try { Object.defineProperty(nav, 'languages', { get: () => frozen, configurable: true }); } catch {}
          try { Object.defineProperty(nav, 'language', { get: () => langs[0], configurable: true }); } catch {}
        }
      }

      // Patch timezone in iframe
      if (targetTimezone && settings.timezone?.date !== 'off') {
        try {
          const iframeDate = (iframeWin as any).Date;
          if (iframeDate) {
            const origFP = (iframeWin as any).Intl.DateTimeFormat;
            iframeDate.prototype.getTimezoneOffset = function(this: Date) {
              try {
                const parts: Record<string, number> = {};
                new origFP('en-US', {
                  timeZone: targetTimezone!, year: 'numeric', month: 'numeric',
                  day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
                  hourCycle: 'h23',
                }).formatToParts(this).forEach((p: any) => {
                  if (p.type !== 'literal') parts[p.type] = parseInt(p.value, 10);
                });
                const tzAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
                const utc = Date.UTC(this.getUTCFullYear(), this.getUTCMonth(), this.getUTCDate(),
                  this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds());
                return (utc - tzAsUtc) / 60000;
              } catch { return 0; }
            };
          }
        } catch {}

        // Patch Intl.DateTimeFormat in iframe
        try {
          const origDTF = (iframeWin as any).Intl.DateTimeFormat;
          (iframeWin as any).Intl.DateTimeFormat = function(locales?: any, options?: any) {
            return new origDTF(locales, { ...options, timeZone: options?.timeZone || targetTimezone });
          };
          (iframeWin as any).Intl.DateTimeFormat.supportedLocalesOf = origDTF.supportedLocalesOf;
          (iframeWin as any).Intl.DateTimeFormat.prototype = origDTF.prototype;
        } catch {}
      }
    } catch {}
  }

  // Intercept iframe contentWindow/contentDocument access
  const origContentWindowDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
  const origContentDocDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument');
  const patchedIframes = new WeakSet<HTMLIFrameElement>();

  if (origContentWindowDesc?.get) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      get() {
        const win = origContentWindowDesc.get!.call(this);
        if (win && !patchedIframes.has(this)) {
          patchedIframes.add(this);
          try { patchIframeWindow(win); } catch {}
        }
        return win;
      },
      configurable: true,
    });
  }

  if (origContentDocDesc?.get) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
      get() {
        const doc = origContentDocDesc.get!.call(this);
        if (doc && !patchedIframes.has(this)) {
          patchedIframes.add(this);
          try { patchIframeWindow(doc.defaultView!); } catch {}
        }
        return doc;
      },
      configurable: true,
    });
  }
}
