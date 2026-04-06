/**
 * Inject Script - Runs in page context (world: "MAIN")
 *
 * Registered as a content script with world:"MAIN" in manifest.json.
 * Runs at document_start BEFORE any page scripts — guaranteed by the browser.
 *
 * Generates a deterministic fingerprint profile from the domain name,
 * ensuring consistent spoofed values across page loads for the same site.
 *
 * No access to extension APIs in MAIN world — all config is self-generated.
 */

import type { InjectConfig, SpooferSettings, AssignedProfileData } from '@/types';
import { initStealth } from '@/lib/stealth';
import { initializeSpoofers } from './spoofers';
import { initFingerprintMonitor } from './monitor/fingerprint-monitor';
import { createDefaultSettings } from '@/types/settings';
import { ALL_PROFILES } from '@/lib/profiles/user-agents';
import { PRNG, base64ToUint8Array } from '@/lib/crypto';

// Patch Function.prototype.toString FIRST — before any spoofers
initStealth();

const FALLBACK_SALT = ':containershield:fallback';

const DESKTOP_SCREENS = [
  { w: 1366, h: 768, dpr: 1 },
  { w: 1440, h: 900, dpr: 1 },
  { w: 1536, h: 864, dpr: 1.25 },
  { w: 1600, h: 900, dpr: 1 },
  { w: 1680, h: 1050, dpr: 1 },
  { w: 1920, h: 1200, dpr: 1 },
  { w: 2560, h: 1440, dpr: 1 },
  { w: 2560, h: 1600, dpr: 1 },
  { w: 3440, h: 1440, dpr: 1 },
] as const;

const LOCALE_TIMEZONE_PAIRS = [
  { lang: ['en-US', 'en'], tz: -300 },
  { lang: ['en-GB', 'en'], tz: 0 },
  { lang: ['de-DE', 'de'], tz: 60 },
  { lang: ['fr-FR', 'fr'], tz: 60 },
  { lang: ['ja-JP', 'ja'], tz: 540 },
  { lang: ['es-ES', 'es'], tz: 60 },
  { lang: ['pt-BR', 'pt'], tz: -180 },
] as const;

function generateSeed(domain: string): string {
  const bytes = new Uint8Array(32);
  const domainBytes = new TextEncoder().encode(domain + FALLBACK_SALT);
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

function generateProfile(seed: string): AssignedProfileData {
  const prng = new PRNG(base64ToUint8Array(seed));
  const pick = <T,>(arr: readonly T[]): T => arr[prng.nextInt(0, arr.length - 1)];

  // Only recent desktop browsers (Chrome 120+, Firefox 120+, Edge 120+)
  const recentDesktop = ALL_PROFILES.filter(p => {
    if (p.mobile) return false;
    const versionMatch = p.userAgent.match(/Chrome\/(\d+)|Firefox\/(\d+)/);
    if (!versionMatch) return false;
    const version = parseInt(versionMatch[1] || versionMatch[2], 10);
    return version >= 120;
  });
  const ua = pick(recentDesktop.length > 0 ? recentDesktop : ALL_PROFILES.filter(p => !p.mobile));

  const isMac = ua.platformName === 'macOS';
  const scr = pick(DESKTOP_SCREENS);
  const locale = pick(LOCALE_TIMEZONE_PAIRS);

  return {
    userAgent: {
      id: ua.id, name: ua.name, userAgent: ua.userAgent, platform: ua.platform,
      vendor: ua.vendor, appVersion: ua.appVersion, oscpu: ua.oscpu,
      mobile: ua.mobile, platformName: ua.platformName, platformVersion: ua.platformVersion,
      brands: ua.brands,
    },
    screen: {
      width: scr.w, height: scr.h,
      availWidth: scr.w, availHeight: scr.h - 40,
      colorDepth: isMac ? 30 : 24, pixelDepth: isMac ? 30 : 24,
      devicePixelRatio: scr.dpr,
    },
    hardwareConcurrency: pick([4, 8, 12, 16]),
    deviceMemory: pick([4, 8]), // Chrome spec: 0.25/0.5/1/2/4/8 — stick to realistic desktop values
    timezoneOffset: locale.tz,
    languages: [...locale.lang],
  };
}

function allSpoofersDisabled(settings: SpooferSettings): boolean {
  for (const category of Object.values(settings)) {
    for (const value of Object.values(category)) {
      if (value !== 'off') return false;
    }
  }
  return true;
}

// Build config deterministically from domain
const domain = window.location.hostname || 'unknown';
const seed = generateSeed(domain);
const config: InjectConfig = {
  containerId: 'fallback',
  domain,
  seed,
  settings: createDefaultSettings().spoofers,
  profile: { mode: 'random' as const },
  assignedProfile: generateProfile(seed),
};

if (allSpoofersDisabled(config.settings)) {
  initFingerprintMonitor();
} else {
  initializeSpoofers(config);
}

// Post the generated profile to the content script (ISOLATED world)
// so the popup can display the actual spoofed values
try {
  window.postMessage({
    type: 'CONTAINER_SHIELD_ACTIVE_PROFILE',
    profile: config.assignedProfile,
    domain,
  }, '*');
} catch {}
