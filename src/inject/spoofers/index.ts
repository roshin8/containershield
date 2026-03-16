/**
 * Spoofer Registry - Orchestrates all fingerprint spoofers
 */

import type { InjectConfig } from '@/types';
import { PRNG, base64ToUint8Array } from '@/lib/crypto';

// Import spoofer modules - Graphics
import { initCanvasSpoofer } from './graphics/canvas';
import { initWebGLSpoofer } from './graphics/webgl';
import { initDOMRectSpoofer } from './graphics/domrect';
import { initTextMetricsSpoofer } from './graphics/text-metrics';
import { initSVGSpoofer } from './graphics/svg';

// Import spoofer modules - Audio
import { initAudioSpoofer } from './audio/audio-context';

// Import spoofer modules - Hardware
import { initScreenSpoofer } from './hardware/screen';
import { initDeviceSpoofer } from './hardware/device';
import { initBatterySpoofer } from './hardware/battery';
import { initMediaDevicesSpoofer } from './hardware/media-devices';

// Import spoofer modules - Navigator
import { initNavigatorSpoofer } from './navigator/user-agent';

// Import spoofer modules - Timezone
import { initTimezoneSpoofer } from './timezone/intl';

// Import spoofer modules - Fonts
import { initFontSpoofer } from './fonts/font-enum';

// Import spoofer modules - Network
import { initWebRTCSpoofer } from './network/webrtc';

// Import spoofer modules - Timing
import { initPerformanceSpoofer } from './timing/performance';

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

  console.log('[ChameleonContainers] Spoofers initialized');
}
