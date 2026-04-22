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
import { buildWorkerPreamble } from './spoofers/workers/worker-fingerprint';
import { createDefaultSettings } from '@/types/settings';
import { ALL_PROFILES } from '@/lib/profiles/user-agents';
import { PRNG, base64ToUint8Array } from '@/lib/crypto';

// Patch Function.prototype.toString FIRST — before any spoofers
initStealth();

const FALLBACK_SALT = ':containershield:fallback';

/**
 * Read the per-container seed injected by the background via Set-Cookie header.
 * Firefox containers isolate cookies, so each container gets its own seed.
 * Returns null if no seed cookie is present (fallback to domain-only seed).
 */
function readContainerSeed(): string | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)_csid=([A-Za-z0-9+/=]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

/**
 * Read user's spoofer settings injected by the background via Set-Cookie.
 * Format: "category.signal:mode,..." — only non-default (non-'noise') values.
 * Returns null if no settings cookie (use defaults).
 */
function readSettingsOverrides(): { disabled: boolean; overrides: Map<string, string> } | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)_cscfg=([^;]+)/);
    if (!match?.[1]) return null;
    const raw = decodeURIComponent(match[1]);
    if (raw === '_disabled') return { disabled: true, overrides: new Map() };
    const overrides = new Map<string, string>();
    for (const entry of raw.split(',')) {
      const [path, mode] = entry.split(':');
      if (path && mode) overrides.set(path, mode);
    }
    return { disabled: false, overrides };
  } catch {
    return null;
  }
}

/**
 * Apply user setting overrides to default spoofer settings.
 */
function applyOverrides(defaults: SpooferSettings, overrides: Map<string, string>): SpooferSettings {
  const settings = JSON.parse(JSON.stringify(defaults)) as Record<string, Record<string, string>>;
  for (const [path, mode] of overrides) {
    const [category, signal] = path.split('.');
    if (category && signal && settings[category]) {
      settings[category][signal] = mode;
    }
  }
  return settings as unknown as SpooferSettings;
}

function generateSeed(domain: string, containerSeed?: string | null): string {
  const bytes = new Uint8Array(32);

  if (containerSeed) {
    // Container seed available: use it in the FIRST 16 bytes (PRNG state0/state1)
    // and domain in the LAST 16 bytes. This ensures different containers
    // get completely different PRNG states even for the same domain.
    const seedBytes = new TextEncoder().encode(containerSeed);
    for (let i = 0; i < seedBytes.length; i++) {
      bytes[i % 16] ^= seedBytes[i];
    }
    const domainBytes = new TextEncoder().encode(domain + FALLBACK_SALT);
    for (let i = 0; i < domainBytes.length; i++) {
      bytes[16 + (i % 16)] ^= domainBytes[i];
    }
    // Also mix domain into first half to differentiate across domains
    for (let i = 0; i < domainBytes.length; i++) {
      bytes[i % 16] ^= domainBytes[i] * 31;
    }
  } else {
    // Fallback: domain-only seed (no container differentiation)
    const domainBytes = new TextEncoder().encode(domain + FALLBACK_SALT);
    for (let i = 0; i < domainBytes.length; i++) {
      bytes[i % 32] ^= domainBytes[i];
    }
  }

  if (bytes.every(b => b === 0)) bytes[0] = 1;

  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Platform-specific screen sizes (common real-world resolutions)
const WINDOWS_SCREENS = [
  { w: 1280, h: 720, dpr: 1 },
  { w: 1280, h: 800, dpr: 1 },
  { w: 1280, h: 1024, dpr: 1 },
  { w: 1366, h: 768, dpr: 1 },
  { w: 1440, h: 900, dpr: 1 },
  { w: 1536, h: 864, dpr: 1.25 },
  { w: 1600, h: 900, dpr: 1 },
  { w: 1600, h: 1200, dpr: 1 },
  { w: 1680, h: 1050, dpr: 1 },
  { w: 1920, h: 1080, dpr: 1 },
  { w: 1920, h: 1080, dpr: 1.25 },
  { w: 1920, h: 1080, dpr: 1.5 },
  { w: 1920, h: 1200, dpr: 1 },
  { w: 2560, h: 1080, dpr: 1 },
  { w: 2560, h: 1440, dpr: 1 },
  { w: 2560, h: 1440, dpr: 1.25 },
  { w: 3440, h: 1440, dpr: 1 },
  { w: 3840, h: 2160, dpr: 1.5 },
  { w: 3840, h: 2160, dpr: 2 },
] as const;

const MAC_SCREENS = [
  { w: 1280, h: 800, dpr: 2 },
  { w: 1440, h: 900, dpr: 2 },
  { w: 1512, h: 982, dpr: 2 },
  { w: 1680, h: 1050, dpr: 2 },
  { w: 1728, h: 1117, dpr: 2 },
  { w: 1800, h: 1169, dpr: 2 },
  { w: 1920, h: 1080, dpr: 2 },
  { w: 1920, h: 1200, dpr: 2 },
  { w: 2560, h: 1440, dpr: 2 },
  { w: 2560, h: 1600, dpr: 2 },
  { w: 3024, h: 1964, dpr: 2 },
  { w: 3456, h: 2234, dpr: 2 },
] as const;

const LINUX_SCREENS = [
  { w: 1280, h: 720, dpr: 1 },
  { w: 1280, h: 1024, dpr: 1 },
  { w: 1366, h: 768, dpr: 1 },
  { w: 1600, h: 900, dpr: 1 },
  { w: 1920, h: 1080, dpr: 1 },
  { w: 1920, h: 1200, dpr: 1 },
  { w: 2560, h: 1080, dpr: 1 },
  { w: 2560, h: 1440, dpr: 1 },
  { w: 3440, h: 1440, dpr: 1 },
  { w: 3840, h: 2160, dpr: 1 },
] as const;

// Language-timezone pairs matched to common locales
const LOCALE_TIMEZONE_PAIRS = [
  { lang: ['en-US', 'en'], tz: -300 },   // US Eastern
  { lang: ['en-US', 'en'], tz: -360 },   // US Central
  { lang: ['en-US', 'en'], tz: -420 },   // US Mountain
  { lang: ['en-US', 'en'], tz: -480 },   // US Pacific
  { lang: ['en-CA', 'en'], tz: -300 },   // Canada Eastern
  { lang: ['en-GB', 'en'], tz: 0 },      // UK
  { lang: ['en-AU', 'en'], tz: 600 },    // Australia Eastern
  { lang: ['en-NZ', 'en'], tz: 720 },    // New Zealand
  { lang: ['en-IN', 'en'], tz: 330 },    // India
  { lang: ['en-SG', 'en'], tz: 480 },    // Singapore
  { lang: ['de-DE', 'de', 'en'], tz: 60 },   // Germany
  { lang: ['de-AT', 'de', 'en'], tz: 60 },   // Austria
  { lang: ['fr-FR', 'fr', 'en'], tz: 60 },   // France
  { lang: ['fr-CA', 'fr', 'en'], tz: -300 }, // French Canada
  { lang: ['es-ES', 'es', 'en'], tz: 60 },   // Spain
  { lang: ['es-MX', 'es', 'en'], tz: -360 }, // Mexico
  { lang: ['es-AR', 'es', 'en'], tz: -180 }, // Argentina
  { lang: ['pt-BR', 'pt', 'en'], tz: -180 }, // Brazil
  { lang: ['pt-PT', 'pt', 'en'], tz: 0 },    // Portugal
  { lang: ['it-IT', 'it', 'en'], tz: 60 },   // Italy
  { lang: ['nl-NL', 'nl', 'en'], tz: 60 },   // Netherlands
  { lang: ['pl-PL', 'pl', 'en'], tz: 60 },   // Poland
  { lang: ['sv-SE', 'sv', 'en'], tz: 60 },   // Sweden
  { lang: ['da-DK', 'da', 'en'], tz: 60 },   // Denmark
  { lang: ['nb-NO', 'nb', 'en'], tz: 60 },   // Norway
  { lang: ['fi-FI', 'fi', 'en'], tz: 120 },  // Finland
  { lang: ['ru-RU', 'ru', 'en'], tz: 180 },  // Russia Moscow
  { lang: ['uk-UA', 'uk', 'en'], tz: 120 },  // Ukraine
  { lang: ['tr-TR', 'tr', 'en'], tz: 180 },  // Turkey
  { lang: ['ja-JP', 'ja'], tz: 540 },         // Japan
  { lang: ['ko-KR', 'ko', 'en'], tz: 540 },  // South Korea
  { lang: ['zh-CN', 'zh', 'en'], tz: 480 },   // China
  { lang: ['zh-TW', 'zh', 'en'], tz: 480 },   // Taiwan
  { lang: ['th-TH', 'th', 'en'], tz: 420 },   // Thailand
  { lang: ['vi-VN', 'vi', 'en'], tz: 420 },   // Vietnam
  { lang: ['id-ID', 'id', 'en'], tz: 420 },   // Indonesia
  { lang: ['ar-SA', 'ar', 'en'], tz: 180 },   // Saudi Arabia
  { lang: ['he-IL', 'he', 'en'], tz: 120 },   // Israel
] as const;

function generateProfile(seed: string): AssignedProfileData {
  const prng = new PRNG(base64ToUint8Array(seed));
  const pick = <T,>(arr: readonly T[]): T => arr[prng.nextInt(0, arr.length - 1)];

  // Detect real platform to ensure we pick a DIFFERENT one
  const realPlatform = navigator.platform;
  const realIsMac = realPlatform === 'MacIntel' || realPlatform.includes('Mac');
  const realIsWin = realPlatform === 'Win32' || realPlatform.includes('Win');
  const realIsLinux = realPlatform.includes('Linux');

  // Only recent desktop browsers (Chrome 120+, Firefox 120+)
  // Exclude profiles matching the REAL platform to ensure visible spoofing
  const recentDesktop = ALL_PROFILES.filter(p => {
    if (p.mobile) return false;
    const versionMatch = p.userAgent.match(/Chrome\/(\d+)|Firefox\/(\d+)/);
    if (!versionMatch) return false;
    const version = parseInt(versionMatch[1] || versionMatch[2], 10);
    if (version < 120) return false;
    // Exclude real platform
    if (realIsMac && p.platformName === 'macOS') return false;
    if (realIsWin && p.platformName === 'Windows') return false;
    if (realIsLinux && p.platformName === 'Linux') return false;
    return true;
  });
  const ua = pick(recentDesktop.length > 0 ? recentDesktop : ALL_PROFILES.filter(p => !p.mobile));

  const isMac = ua.platformName === 'macOS';
  const isLinux = ua.platformName === 'Linux';
  const isFirefox = !ua.brands; // Firefox profiles don't have brands

  // Screen matched to OS
  const screenList: readonly { readonly w: number; readonly h: number; readonly dpr: number }[] =
    isMac ? MAC_SCREENS : isLinux ? LINUX_SCREENS : WINDOWS_SCREENS;
  const scr = pick(screenList);

  // Language/timezone pair
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
      availWidth: scr.w, availHeight: scr.h - (isMac ? 25 : 40),
      colorDepth: isMac ? 30 : 24, pixelDepth: isMac ? 30 : 24,
      devicePixelRatio: scr.dpr,
    },
    hardwareConcurrency: pick(isMac ? [8, 10, 12, 14, 16, 24] as const : [2, 4, 6, 8, 12, 16, 24, 32] as const),
    deviceMemory: isFirefox ? undefined : pick([2, 4, 8, 16, 32] as const),
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

// Build config deterministically from domain + container seed (if available).
// The container seed comes from a cookie injected by the background via Set-Cookie header.
// Firefox containers isolate cookies, so each container gets a unique seed.
const domain = window.location.hostname || 'unknown';
const containerSeed = readContainerSeed();
const seed = generateSeed(domain, containerSeed);

// Read user's spoofer settings (which signals are off/block/noise).
// Injected by the background via _cscfg cookie.
const settingsData = readSettingsOverrides();
const defaultSpoofers = createDefaultSettings().spoofers;
const spooferSettings = settingsData?.overrides?.size
  ? applyOverrides(defaultSpoofers, settingsData.overrides)
  : defaultSpoofers;

const config: InjectConfig = {
  containerId: 'fallback',
  domain,
  seed,
  settings: spooferSettings,
  profile: { mode: 'random' as const },
  assignedProfile: generateProfile(seed),
};

if (settingsData?.disabled || allSpoofersDisabled(config.settings)) {
  initFingerprintMonitor();
} else {
  initializeSpoofers(config);
}

// Post the generated profile to the content script (ISOLATED world)
// so the popup can display the actual spoofed values.
// Only post from the TOP frame — iframes have different domains and would
// overwrite the main page's profile with a different one on each refresh.
try {
  const workerPreamble = buildWorkerPreamble(config.assignedProfile);
  if (window === window.top) {
    window.postMessage({
      type: 'CONTAINER_SHIELD_ACTIVE_PROFILE',
      profile: config.assignedProfile,
      domain,
      workerPreamble,
    }, '*');
  }
} catch {}
