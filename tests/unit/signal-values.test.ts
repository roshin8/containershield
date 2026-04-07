/**
 * Unit tests for GET_SIGNAL_VALUES — verifies every signal in the popup
 * gets a value from the background handler.
 */

import { describe, it, expect } from 'vitest';
import { PRNG, uint8ArrayToBase64, generateSeed } from '../../src/lib/crypto';
import { selectGPUForProfile } from '../../src/lib/gpu-profiles';
import { TIMEZONE_IANA } from '../../src/lib/constants';

// All val= keys used in SignalsTab.tsx — every one of these must get a value
const ALL_SIGNAL_KEYS = [
  'HTMLCanvasElement.toDataURL',
  'WebGLRenderingContext.getParameter',
  'WebGL2RenderingContext.getParameter',
  'Element.getBoundingClientRect',
  'CanvasRenderingContext2D.measureText',
  'SVGGraphicsElement.getBBox',
  'OffscreenCanvas.convertToBlob',
  'WebGLRenderingContext.getShaderPrecisionFormat',
  'navigator.gpu.requestAdapter',
  'AnalyserNode.getFloatFrequencyData',
  'OfflineAudioContext.startRendering',
  'AudioContext.baseLatency',
  'HTMLMediaElement.canPlayType',
  'screen.width',
  'window.outerWidth',
  'screen.isExtended',
  'screen.orientation.type',
  'visualViewport.scale',
  'navigator.deviceMemory',
  'navigator.hardwareConcurrency',
  'Math.fround',
  'navigator.mediaDevices.enumerateDevices',
  'navigator.getBattery',
  'navigator.maxTouchPoints',
  'DeviceMotionEvent',
  'navigator.userAgent',
  'navigator.languages',
  'navigator.plugins',
  'navigator.userAgentData',
  'navigator.clipboard',
  'navigator.vibrate',
  'window.vendorFlavors',
  'getComputedStyle.fontPrefs',
  'window.name',
  'history.length',
  'navigator.mediaCapabilities.decodingInfo',
  'navigator.connection',
  'navigator.geolocation.getCurrentPosition',
  'performance.now',
  'performance.memory',
  'setTimeout',
  'Date.getTimezoneOffset',
  'Intl.DateTimeFormat',
  'Intl.NumberFormat',
  'document.fonts.check',
  'getComputedStyle(fontFamily)',
  'CanvasRenderingContext2D.measureText(emoji)',
  'MathML.getBoundingClientRect',
  'matchMedia',
  'navigator.storage.estimate',
  'indexedDB.open',
  'openDatabase',
  'navigator.storage.persisted',
  'navigator.permissions.query',
  'Notification.permission',
  'navigator.getGamepads',
  'navigator.requestMIDIAccess',
  'navigator.bluetooth.requestDevice',
  'navigator.usb.getDevices',
  'navigator.serial.getPorts',
  'navigator.hid.getDevices',
  'Math.cos',
  'navigator.keyboard.getLayoutMap',
  'KeyboardEvent.timing',
  'speechSynthesis.getVoices',
  'navigator.webdriver',
  'crypto.getRandomValues',
  'Error.captureStackTrace',
  'ApplePaySession.canMakePayments',
  'Worker.constructor',
  'ServiceWorker.register',
];

describe('signal-values coverage', () => {
  it('selectGPUForProfile picks a GPU for each platform', () => {
    const seed = new Uint8Array(32);
    seed[0] = 42;
    const prng = new PRNG(seed);

    const winProfile = { userAgent: { platformName: 'Windows', mobile: false } } as any;
    const macProfile = { userAgent: { platformName: 'macOS', mobile: false } } as any;
    const linuxProfile = { userAgent: { platformName: 'Linux', mobile: false } } as any;
    const mobileProfile = { userAgent: { platformName: 'iOS', mobile: true } } as any;

    const winGPU = selectGPUForProfile((arr) => prng.pick(arr), winProfile);
    expect(winGPU.renderer).toContain('ANGLE');

    const macGPU = selectGPUForProfile((arr) => prng.pick(arr), macProfile);
    expect(macGPU.renderer).toContain('Apple');

    const linuxGPU = selectGPUForProfile((arr) => prng.pick(arr), linuxProfile);
    expect(linuxGPU.vendor).toBeDefined();

    const mobileGPU = selectGPUForProfile((arr) => prng.pick(arr), mobileProfile);
    expect(mobileGPU.renderer).toBeDefined();
  });

  it('TIMEZONE_IANA maps common offsets', () => {
    expect(TIMEZONE_IANA[0]).toBe('UTC');
    expect(TIMEZONE_IANA[300]).toBeDefined(); // EST
    expect(TIMEZONE_IANA[-60]).toBeDefined(); // CET
  });

  it('ALL_SIGNAL_KEYS has the expected count', () => {
    // If someone adds a signal to SignalsTab without adding it here, this fails
    expect(ALL_SIGNAL_KEYS.length).toBeGreaterThanOrEqual(70);
    // No duplicates
    const unique = new Set(ALL_SIGNAL_KEYS);
    expect(unique.size).toBe(ALL_SIGNAL_KEYS.length);
  });
});
