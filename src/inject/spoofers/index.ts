/**
 * Spoofer Registry - Orchestrates all fingerprint spoofers
 */

import type { InjectConfig } from '@/types';
import { PRNG, base64ToUint8Array } from '@/lib/crypto';

// Import spoofer modules - Graphics
import { initCanvasSpoofer } from './graphics/canvas';
import { initOffscreenCanvasSpoofer } from './canvas/offscreen';
import { initWebGLSpoofer } from './graphics/webgl';
import { initWebGLShaderSpoofer } from './graphics/webgl-shaders';
import { initWebGPUSpoofer } from './graphics/webgpu';
import { initDOMRectSpoofer } from './graphics/domrect';
import { initTextMetricsSpoofer } from './graphics/text-metrics';
import { initSVGSpoofer } from './graphics/svg';

// Import spoofer modules - Audio
import { initAudioSpoofer } from './audio/audio-context';
import { initOfflineAudioSpoofer } from './audio/offline-audio';
import { initAudioLatencySpoofer } from './audio/audio-latency';

// Import spoofer modules - Hardware
import { initScreenSpoofer } from './hardware/screen';
import { initScreenFrameSpoofer } from './hardware/screen-frame';
import { initScreenOrientationSpoofer } from './hardware/screen-orientation';
import { initDeviceSpoofer } from './hardware/device';
import { initBatterySpoofer } from './hardware/battery';
import { initMediaDevicesSpoofer } from './hardware/media-devices';
import { initTouchSpoofer } from './hardware/touch';
import { initSensorSpoofer } from './hardware/sensors';

// Import spoofer modules - Navigator
import { initNavigatorSpoofer } from './navigator/user-agent';
import { initClipboardSpoofer } from './navigator/clipboard';
import { initVibrationSpoofer } from './navigator/vibration';

// Import spoofer modules - Timezone
import { initTimezoneSpoofer } from './timezone/intl';

// Import spoofer modules - Fonts
import { initFontSpoofer } from './fonts/font-enum';
import { initCSSFontSpoofer } from './fonts/css-fonts';

// Import spoofer modules - Network
import { initWebRTCSpoofer } from './network/webrtc';
import { initNetworkSpoofer } from './network/connection';

// Import spoofer modules - Timing
import { initPerformanceSpoofer } from './timing/performance';

// Import spoofer modules - CSS
import { initCSSSpoofer } from './css/media-queries';

// Import spoofer modules - Speech
import { initSpeechSpoofer } from './speech/synthesis';

// Import spoofer modules - Permissions
import { initPermissionsSpoofer } from './permissions/permissions';
import { initNotificationSpoofer } from './permissions/notification';

// Import spoofer modules - Storage
import { initStorageSpoofer } from './storage/storage-estimate';
import { initIndexedDBSpoofer } from './storage/indexeddb';
import { initWebSQLSpoofer } from './storage/websql';

// Import spoofer modules - Codecs
import { initCodecSpoofer } from './codecs/codecs';

// Import spoofer modules - Math
import { initMathSpoofer } from './math/math';

// Import spoofer modules - Keyboard
import { initKeyboardSpoofer } from './keyboard/keyboard';

// Import spoofer modules - Workers
import { initWorkerSpoofer } from './workers/worker-fingerprint';

// Import spoofer modules - Errors
import { initErrorSpoofer } from './errors/stack-trace';

// Import spoofer modules - Rendering
import { initEmojiSpoofer } from './rendering/emoji';
import { initMathMLSpoofer } from './rendering/mathml';

// Import spoofer modules - Intl
import { initIntlSpoofer } from './intl/intl-apis';

// Import spoofer modules - Crypto
import { initCryptoSpoofer } from './crypto/webcrypto';

// Import spoofer modules - Devices
import { initGamepadSpoofer } from './devices/gamepad';
import { initMIDISpoofer } from './devices/midi';
import { initBluetoothSpoofer } from './devices/bluetooth';
import { initUSBSpoofer, initSerialSpoofer, initHIDSpoofer } from './devices/usb-serial';

// Import spoofer modules - Features
import { initFeatureSpoofer } from './features/feature-detection';

// Import spoofer modules - Payment
import { initApplePaySpoofer } from './payment/apple-pay';

// Import fingerprint monitor
import { initFingerprintMonitor, getAccessLog, getRecommendations } from '../monitor/fingerprint-monitor';

/**
 * Global PRNG instance for this page
 * Seeded with container seed + domain for consistent results
 */
let pagePRNG: PRNG | null = null;

/**
 * Get the PRNG instance for this page
 */
export function getPagePRNG(): PRNG | null {
  return pagePRNG;
}

/**
 * Initialize all spoofers based on configuration
 */
export function initializeSpoofers(config: InjectConfig): void {
  // Create PRNG from seed
  const seedBytes = base64ToUint8Array(config.seed);

  // Derive a page-specific seed using domain
  const encoder = new TextEncoder();
  const domainBytes = encoder.encode(config.domain);
  const combinedSeed = new Uint8Array(seedBytes.length + domainBytes.length);
  combinedSeed.set(seedBytes);
  combinedSeed.set(domainBytes, seedBytes.length);

  // Simple hash: XOR all bytes into 32-byte result
  const hashedSeed = new Uint8Array(32);
  for (let i = 0; i < combinedSeed.length; i++) {
    hashedSeed[i % 32] ^= combinedSeed[i];
  }

  pagePRNG = new PRNG(hashedSeed);

  const { settings, assignedProfile } = config;

  // Initialize graphics spoofers
  if (settings.graphics.canvas !== 'off') {
    initCanvasSpoofer(settings.graphics.canvas, pagePRNG);
  }

  if (settings.graphics.webgl !== 'off' || settings.graphics.webgl2 !== 'off') {
    initWebGLSpoofer(settings.graphics.webgl, settings.graphics.webgl2, pagePRNG);
  }

  // Initialize audio spoofers
  if (settings.audio.audioContext !== 'off') {
    initAudioSpoofer(settings.audio.audioContext, pagePRNG);
  }

  // Initialize hardware spoofers - use assigned profile for guaranteed uniqueness
  if (settings.hardware.screen !== 'off') {
    initScreenSpoofer(settings.hardware.screen, pagePRNG, assignedProfile?.screen);
  }

  if (
    settings.hardware.deviceMemory !== 'off' ||
    settings.hardware.hardwareConcurrency !== 'off'
  ) {
    initDeviceSpoofer(
      settings.hardware.deviceMemory,
      settings.hardware.hardwareConcurrency,
      pagePRNG,
      assignedProfile
    );
  }

  // Initialize navigator spoofers - use assigned profile for guaranteed uniqueness
  if (settings.navigator.userAgent !== 'off') {
    initNavigatorSpoofer(settings.navigator, pagePRNG, config.profile, assignedProfile);
  }

  // Initialize timezone spoofers - use assigned profile for guaranteed uniqueness
  if (settings.timezone.intl !== 'off' || settings.timezone.date !== 'off') {
    initTimezoneSpoofer(settings.timezone, pagePRNG, assignedProfile);
  }

  // Initialize network spoofers
  if (settings.network.webrtc !== 'off') {
    initWebRTCSpoofer(settings.network.webrtc, pagePRNG);
  }

  // Initialize graphics spoofers - DOMRect
  if (settings.graphics.domRect !== 'off') {
    initDOMRectSpoofer(settings.graphics.domRect, pagePRNG);
  }

  // Initialize graphics spoofers - TextMetrics
  if (settings.graphics.textMetrics !== 'off') {
    initTextMetricsSpoofer(settings.graphics.textMetrics, pagePRNG);
  }

  // Initialize graphics spoofers - SVG
  if (settings.graphics.svg !== 'off') {
    initSVGSpoofer(settings.graphics.svg, pagePRNG);
  }

  // Initialize font spoofers
  if (settings.fonts.enumeration !== 'off') {
    initFontSpoofer(settings.fonts.enumeration, pagePRNG);
  }

  // Initialize hardware spoofers - Battery
  if (settings.hardware.battery !== 'off') {
    initBatterySpoofer(settings.hardware.battery, pagePRNG);
  }

  // Initialize hardware spoofers - MediaDevices
  if (settings.hardware.mediaDevices !== 'off') {
    initMediaDevicesSpoofer(settings.hardware.mediaDevices, pagePRNG);
  }

  // Initialize timing spoofers - Performance
  if (settings.timing.performance !== 'off') {
    initPerformanceSpoofer(settings.timing.performance, pagePRNG);
  }

  // Initialize CSS spoofers - Media Queries
  if (settings.css.mediaQueries !== 'off') {
    initCSSSpoofer(settings.css.mediaQueries, pagePRNG);
  }

  // Initialize speech spoofers - SpeechSynthesis
  if (settings.speech.synthesis !== 'off') {
    initSpeechSpoofer(settings.speech.synthesis, pagePRNG);
  }

  // Initialize permissions spoofers
  if (settings.permissions.query !== 'off') {
    initPermissionsSpoofer(settings.permissions.query, pagePRNG);
  }

  // Initialize storage spoofers
  if (settings.storage.estimate !== 'off') {
    initStorageSpoofer(settings.storage.estimate, pagePRNG);
  }

  // Initialize codec spoofers
  if (settings.audio.codecs !== 'off') {
    initCodecSpoofer(settings.audio.codecs, pagePRNG);
  }

  // Initialize math spoofers
  if (settings.math.functions !== 'off') {
    initMathSpoofer(settings.math.functions, pagePRNG);
  }

  // Initialize network connection spoofers
  if (settings.network.connection !== 'off') {
    initNetworkSpoofer(settings.network.connection, pagePRNG);
  }

  // Initialize keyboard spoofers
  if (settings.keyboard.layout !== 'off') {
    initKeyboardSpoofer(settings.keyboard.layout, pagePRNG);
  }

  // Initialize new spoofers - Graphics (OffscreenCanvas, WebGL Shaders, WebGPU)
  if (settings.graphics.offscreenCanvas !== 'off') {
    initOffscreenCanvasSpoofer(settings.graphics.offscreenCanvas, pagePRNG);
  }

  if (settings.graphics.webglShaders !== 'off') {
    initWebGLShaderSpoofer(settings.graphics.webglShaders, pagePRNG);
  }

  if (settings.graphics.webgpu !== 'off') {
    initWebGPUSpoofer(settings.graphics.webgpu, pagePRNG);
  }

  // Initialize audio spoofers - OfflineAudioContext
  if (settings.audio.offlineAudio !== 'off') {
    initOfflineAudioSpoofer(settings.audio.offlineAudio, pagePRNG);
  }

  // Initialize hardware spoofers - Touch
  if (settings.hardware.touch !== 'off') {
    initTouchSpoofer(settings.hardware.touch, pagePRNG);
  }

  // Initialize font spoofers - CSS detection
  if (settings.fonts.cssDetection !== 'off') {
    initCSSFontSpoofer(settings.fonts.cssDetection, pagePRNG);
  }

  // Initialize storage spoofers - IndexedDB
  if (settings.storage.indexedDB !== 'off') {
    initIndexedDBSpoofer(settings.storage.indexedDB, pagePRNG);
  }

  // Initialize worker spoofers
  if (settings.workers.fingerprint !== 'off') {
    initWorkerSpoofer(settings.workers.fingerprint, pagePRNG);
  }

  // Initialize error spoofers
  if (settings.errors.stackTrace !== 'off') {
    initErrorSpoofer(settings.errors.stackTrace, pagePRNG);
  }

  // Initialize rendering spoofers - Emoji and MathML
  if (settings.rendering.emoji !== 'off') {
    initEmojiSpoofer(settings.rendering.emoji, pagePRNG);
  }

  if (settings.rendering.mathml !== 'off') {
    initMathMLSpoofer(settings.rendering.mathml, pagePRNG);
  }

  // Initialize Intl spoofers
  if (settings.intl.apis !== 'off') {
    initIntlSpoofer(settings.intl.apis, pagePRNG);
  }

  // Initialize crypto spoofers
  if (settings.crypto.webCrypto !== 'off') {
    initCryptoSpoofer(settings.crypto.webCrypto, pagePRNG);
  }

  // Initialize device spoofers - Gamepad, MIDI, Bluetooth, USB, Serial, HID
  if (settings.devices.gamepad !== 'off') {
    initGamepadSpoofer(settings.devices.gamepad, pagePRNG);
  }

  if (settings.devices.midi !== 'off') {
    initMIDISpoofer(settings.devices.midi, pagePRNG);
  }

  if (settings.devices.bluetooth !== 'off') {
    initBluetoothSpoofer(settings.devices.bluetooth, pagePRNG);
  }

  if (settings.devices.usb !== 'off') {
    initUSBSpoofer(settings.devices.usb, pagePRNG);
  }

  if (settings.devices.serial !== 'off') {
    initSerialSpoofer(settings.devices.serial, pagePRNG);
  }

  if (settings.devices.hid !== 'off') {
    initHIDSpoofer(settings.devices.hid, pagePRNG);
  }

  // Initialize feature detection spoofers
  if (settings.features.detection !== 'off') {
    initFeatureSpoofer(settings.features.detection, pagePRNG);
  }

  // Initialize new spoofers - Screen Frame
  if (settings.hardware.screenFrame !== 'off') {
    initScreenFrameSpoofer(settings.hardware.screenFrame, pagePRNG);
  }

  // Initialize new spoofers - Screen Orientation
  if (settings.hardware.orientation !== 'off') {
    initScreenOrientationSpoofer(settings.hardware.orientation, pagePRNG);
  }

  // Initialize new spoofers - Sensors
  if (settings.hardware.sensors !== 'off') {
    initSensorSpoofer(settings.hardware.sensors, pagePRNG);
  }

  // Initialize new spoofers - Audio Latency
  if (settings.audio.latency !== 'off') {
    initAudioLatencySpoofer(settings.audio.latency, pagePRNG);
  }

  // Initialize new spoofers - Clipboard
  if (settings.navigator.clipboard !== 'off') {
    initClipboardSpoofer(settings.navigator.clipboard, pagePRNG);
  }

  // Initialize new spoofers - Vibration
  if (settings.navigator.vibration !== 'off') {
    initVibrationSpoofer(settings.navigator.vibration, pagePRNG);
  }

  // Initialize new spoofers - Notification
  if (settings.permissions.notification !== 'off') {
    initNotificationSpoofer(settings.permissions.notification, pagePRNG);
  }

  // Initialize new spoofers - WebSQL
  if (settings.storage.webSQL !== 'off') {
    initWebSQLSpoofer(settings.storage.webSQL, pagePRNG);
  }

  // Initialize new spoofers - Apple Pay
  if (settings.payment.applePay !== 'off') {
    initApplePaySpoofer(settings.payment.applePay, pagePRNG);
  }

  // Initialize fingerprint access monitor
  initFingerprintMonitor();

  console.log('[ContainerShield] All spoofers initialized (50+ APIs protected)');
}

/**
 * Get fingerprint access recommendations
 * Returns APIs that were accessed but have protection disabled
 */
export function getSpoofingRecommendations(
  settings: InjectConfig['settings']
): { api: string; category: string; setting: string }[] {
  return getRecommendations(settings);
}

/**
 * Get all fingerprint access logs for the current page
 */
export function getFingerprintAccessLog() {
  return getAccessLog();
}
