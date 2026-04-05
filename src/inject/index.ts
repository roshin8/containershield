/**
 * Inject Script - Runs in page context (MAIN world)
 *
 * Initializes ONCE with whatever config is available:
 * 1. __containerShieldConfig (set by content script with real config)
 * 2. Fallback config (generated from domain, only if content script failed)
 *
 * Single initialization, single profile. No re-init.
 */

import type { InjectConfig, SpooferSettings, AssignedProfileData } from '@/types';
import { initStealth } from '@/lib/stealth';
import { initializeSpoofers } from './spoofers';
import { initFingerprintMonitor } from './monitor/fingerprint-monitor';
import { createDefaultSettings } from '@/types/settings';
import { ALL_PROFILES } from '@/lib/profiles/user-agents';
import { PRNG, base64ToUint8Array } from '@/lib/crypto';

// CRITICAL: Patch Function.prototype.toString FIRST
initStealth();

function allSpoofersDisabled(settings: SpooferSettings): boolean {
  for (const category of Object.values(settings)) {
    for (const value of Object.values(category)) {
      if (value !== 'off') return false;
    }
  }
  return true;
}

function generateFallbackSeed(domain: string): string {
  const bytes = new Uint8Array(32);
  const encoder = new TextEncoder();
  const domainBytes = encoder.encode(domain + ':containershield:fallback');
  for (let i = 0; i < domainBytes.length; i++) {
    bytes[i % 32] ^= domainBytes[i];
  }
  if (bytes.every(b => b === 0)) bytes[0] = 1;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function generateFallbackProfile(seed: string): AssignedProfileData {
  const prng = new PRNG(base64ToUint8Array(seed));
  const pick = <T,>(arr: T[]): T => arr[prng.nextInt(0, arr.length - 1)];

  // Only pick DESKTOP profiles for fallback to avoid mobile/desktop inconsistencies
  const desktopProfiles = ALL_PROFILES.filter(p => !p.mobile);
  const ua = pick(desktopProfiles.length > 0 ? desktopProfiles : ALL_PROFILES);

  // Screen must match platform
  const isWindows = ua.platformName === 'Windows';
  const isMac = ua.platformName === 'macOS';
  const desktopScreens = [
    { w: 1920, h: 1080, dpr: 1 },
    { w: 1366, h: 768, dpr: 1 },
    { w: 1536, h: 864, dpr: 1.25 },
    { w: 1440, h: 900, dpr: isMac ? 2 : 1 },
    { w: 2560, h: 1440, dpr: 1 },
  ];
  const scr = pick(desktopScreens);

  // Language and timezone should be consistent
  const locales: { lang: string[]; tz: number }[] = [
    { lang: ['en-US', 'en'], tz: -300 },
    { lang: ['en-GB', 'en'], tz: 0 },
    { lang: ['de-DE', 'de'], tz: 60 },
    { lang: ['fr-FR', 'fr'], tz: 60 },
    { lang: ['ja-JP', 'ja'], tz: 540 },
    { lang: ['es-ES', 'es'], tz: 60 },
    { lang: ['pt-BR', 'pt'], tz: -180 },
  ];
  const locale = pick(locales);

  return {
    userAgent: {
      id: ua.id, name: ua.name, userAgent: ua.userAgent, platform: ua.platform,
      vendor: ua.vendor, appVersion: ua.appVersion, oscpu: ua.oscpu,
      mobile: ua.mobile, platformName: ua.platformName, platformVersion: ua.platformVersion,
      brands: ua.brands,
    },
    screen: { width: scr.w, height: scr.h, availWidth: scr.w, availHeight: scr.h - 40,
      colorDepth: isMac ? 30 : 24, pixelDepth: isMac ? 30 : 24, devicePixelRatio: scr.dpr },
    hardwareConcurrency: pick([4, 6, 8, 12]),
    deviceMemory: pick([8, 16]),
    timezoneOffset: locale.tz,
    languages: locale.lang,
  };
}

// Get config: prefer pre-set from content script, fall back to generated
const presetConfig = (window as any).__containerShieldConfig as InjectConfig | undefined;
let config: InjectConfig;

if (presetConfig && presetConfig.seed && presetConfig.settings) {
  config = presetConfig;
} else {
  // Fallback: content script didn't set config (background was too slow or unavailable)
  const domain = window.location.hostname || 'unknown';
  const seed = generateFallbackSeed(domain);
  config = {
    containerId: 'fallback',
    domain,
    seed,
    settings: createDefaultSettings().spoofers,
    profile: { mode: 'random' as const },
    assignedProfile: generateFallbackProfile(seed),
  };
}

// Initialize ONCE
if (allSpoofersDisabled(config.settings)) {
  initFingerprintMonitor();
} else {
  initializeSpoofers(config);
}
