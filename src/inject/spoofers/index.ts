/**
 * Spoofer Registry - Orchestrates all fingerprint spoofers
 */

import type { InjectConfig } from '@/types';
import { PRNG, base64ToUint8Array } from '@/lib/crypto';

// Graphics
import { initCanvasSpoofer } from './graphics/canvas';
import { initOffscreenCanvasSpoofer } from './canvas/offscreen';
import { initWebGLSpoofer } from './graphics/webgl';
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
  if (settings.graphics.webgl !== 'off' || settings.graphics.webgl2 !== 'off') {
    initWebGLSpoofer(settings.graphics.webgl, settings.graphics.webgl2, pagePRNG, assignedProfile);
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

  // Fonts
  if (settings.fonts.enumeration !== 'off') initFontSpoofer(settings.fonts.enumeration, pagePRNG);
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
  if (settings.css.mediaQueries !== 'off') initCSSSpoofer(settings.css.mediaQueries, pagePRNG);

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
  if (settings.workers.fingerprint !== 'off') initWorkerSpoofer(settings.workers.fingerprint, pagePRNG);

  // Errors
  if (settings.errors.stackTrace !== 'off') initErrorSpoofer(settings.errors.stackTrace, pagePRNG);

  // Rendering
  if (settings.rendering.emoji !== 'off') initEmojiSpoofer(settings.rendering.emoji, pagePRNG);
  if (settings.rendering.mathml !== 'off') initMathMLSpoofer(settings.rendering.mathml, pagePRNG);

  // Intl
  if (settings.intl.apis !== 'off') initIntlSpoofer(settings.intl.apis, pagePRNG);

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

  // Initialize monitor and send initial report
  initFingerprintMonitor();
  setTimeout(reportToBackground, 50);
}
