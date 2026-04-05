/**
 * Inject Script - Runs in page context (MAIN world)
 *
 * Wraps JavaScript APIs to add noise/block fingerprinting.
 * Runs SYNCHRONOUSLY when injected, before any page scripts.
 *
 * CRITICAL TIMING: This script initializes spoofers IMMEDIATELY with a
 * domain-derived fallback seed, so fingerprinting APIs are protected
 * before any page scripts run. When the real container-specific config
 * arrives via postMessage, the PRNG seed is already consumed - the
 * initial protection is what matters for anti-fingerprinting.
 */

import type { InjectConfig, SpooferSettings, AssignedProfileData } from '@/types';
import { initStealth } from '@/lib/stealth';
import { initializeSpoofers } from './spoofers';
import { initFingerprintMonitor } from './monitor/fingerprint-monitor';
import { createDefaultSettings } from '@/types/settings';
import { ALL_PROFILES } from '@/lib/profiles/user-agents';
import { PRNG, base64ToUint8Array } from '@/lib/crypto';

const PAGE_MSG_CONFIG_READY = 'CONTAINER_SHIELD_CONFIG_READY';

// CRITICAL: Patch Function.prototype.toString FIRST
initStealth();

let isInitialized = false;

/**
 * Generate a deterministic fallback seed from the domain name.
 * This provides immediate protection before the real seed arrives.
 * The seed is a base64-encoded 32-byte value derived from the hostname.
 */
function generateFallbackSeed(domain: string): string {
  const bytes = new Uint8Array(32);
  const encoder = new TextEncoder();
  const domainBytes = encoder.encode(domain + ':containershield:fallback');
  for (let i = 0; i < domainBytes.length; i++) {
    bytes[i % 32] ^= domainBytes[i];
  }
  // Ensure non-zero
  if (bytes.every(b => b === 0)) bytes[0] = 1;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function allSpoofersDisabled(settings: SpooferSettings): boolean {
  for (const category of Object.values(settings)) {
    for (const value of Object.values(category)) {
      if (value !== 'off') return false;
    }
  }
  return true;
}

function initWithConfig(config: InjectConfig): void {
  if (isInitialized) return;
  if (allSpoofersDisabled(config.settings)) {
    initFingerprintMonitor();
    isInitialized = true;
    return;
  }
  initializeSpoofers(config);
  isInitialized = true;
}

// Listen for real config from content script
// If it arrives before the fallback timeout, use it instead
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const { type, config } = event.data || {};
  if (type === PAGE_MSG_CONFIG_READY) {
    if (config && config.seed && config.settings) {
      if (!isInitialized) {
        // Real config arrived before fallback - use it directly
        initWithConfig(config);
      }
      // If already initialized with fallback, we can't re-init
      // but the spoofers are still protecting (just with fallback values)
    } else if (!isInitialized) {
      initFingerprintMonitor();
      isInitialized = true;
    }
  }
});

// Check if a config was pre-set (by tests or content script meta tag)
const presetConfig = (window as any).__containerShieldConfig as InjectConfig | undefined;

if (presetConfig && presetConfig.seed && presetConfig.settings) {
  // Use the pre-set config (e.g., from tests)
  initWithConfig(presetConfig);
} else {
  // CRITICAL: Initialize spoofers IMMEDIATELY with fallback config.
  const domain = window.location.hostname || 'unknown';
  const seed = generateFallbackSeed(domain);

  // Generate a deterministic fallback profile from the seed
  const fallbackPRNG = new PRNG(base64ToUint8Array(seed));
  const pick = <T,>(arr: T[]): T => arr[fallbackPRNG.nextInt(0, arr.length - 1)];
  const ua = pick(ALL_PROFILES);
  const screens = [
    { w: 1920, h: 1080 }, { w: 1366, h: 768 }, { w: 1536, h: 864 },
    { w: 1440, h: 900 }, { w: 2560, h: 1440 }, { w: 1280, h: 720 },
  ];
  const scr = pick(screens);
  const langs = [['en-US', 'en'], ['en-GB', 'en'], ['de-DE', 'de'], ['fr-FR', 'fr'], ['ja-JP', 'ja'], ['es-ES', 'es']];
  const tzOffsets = [-480, -420, -360, -300, 0, 60, 120, 540];

  const fallbackProfile: AssignedProfileData = {
    userAgent: {
      id: ua.id, name: ua.name, userAgent: ua.userAgent, platform: ua.platform,
      vendor: ua.vendor, appVersion: ua.appVersion, oscpu: ua.oscpu,
      mobile: ua.mobile, platformName: ua.platformName, platformVersion: ua.platformVersion,
      brands: ua.brands,
    },
    screen: { width: scr.w, height: scr.h, availWidth: scr.w, availHeight: scr.h - 40,
      colorDepth: 24, pixelDepth: 24, devicePixelRatio: pick([1, 1, 1.25, 2]) },
    hardwareConcurrency: pick([4, 6, 8, 12, 16]),
    deviceMemory: pick([4, 8, 16]),
    timezoneOffset: pick(tzOffsets),
    languages: pick(langs),
  };

  const fallbackConfig: InjectConfig = {
    containerId: 'fallback',
    domain,
    seed,
    settings: createDefaultSettings().spoofers,
    profile: { mode: 'random' as const },
    assignedProfile: fallbackProfile,
  };
  initWithConfig(fallbackConfig);
}
