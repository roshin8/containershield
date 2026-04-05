/**
 * CSS Media Queries Spoofer
 *
 * Media queries reveal screen characteristics, color preferences,
 * motion preferences, and system info. FingerprintJS/fingerprint.com
 * check all of these.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { overrideMethod } from '@/lib/stealth';
import { logAccess } from '../../monitor/fingerprint-monitor';

interface MediaQueryOverrides {
  'prefers-color-scheme': 'light' | 'dark';
  'prefers-reduced-motion': 'no-preference' | 'reduce';
  'prefers-contrast': 'no-preference' | 'more' | 'less';
  'prefers-reduced-transparency': 'no-preference' | 'reduce';
  'forced-colors': 'none' | 'active';
  'inverted-colors': 'none' | 'inverted';
  'color-gamut': 'srgb' | 'p3' | 'rec2020';
  'dynamic-range': 'standard' | 'high';
  'pointer': 'none' | 'coarse' | 'fine';
  'hover': 'none' | 'hover';
  'any-pointer': 'none' | 'coarse' | 'fine';
  'any-hover': 'none' | 'hover';
}

export function initCSSSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  const originalMatchMedia = window.matchMedia;

  const overrides: MediaQueryOverrides = {
    'prefers-color-scheme': prng.pick(['light', 'dark']),
    'prefers-reduced-motion': prng.pick(['no-preference', 'no-preference', 'no-preference', 'reduce']),
    'prefers-contrast': 'no-preference',
    'prefers-reduced-transparency': 'no-preference',
    'forced-colors': 'none',
    'inverted-colors': 'none',
    'color-gamut': prng.pick(['srgb', 'p3']),
    'dynamic-range': prng.pick(['standard', 'high']),
    'pointer': 'fine',
    'hover': 'hover',
    'any-pointer': 'fine',
    'any-hover': 'hover',
  };

  // monochrome: always report 0 (non-monochrome)
  // This is a numeric query so handled separately

  overrideMethod(window as any, 'matchMedia', (original, thisArg, args) => {
    logAccess('matchMedia', { spoofed: true });
    const query = args[0] as string;

    // Handle monochrome query
    if (/\(\s*monochrome\s*\)/.test(query)) {
      return createFakeMediaQueryList(query, false);
    }
    if (/\(\s*monochrome\s*:\s*0\s*\)/.test(query)) {
      return createFakeMediaQueryList(query, true);
    }

    // Handle feature queries we override
    for (const [feature, value] of Object.entries(overrides)) {
      const regex = new RegExp(`\\(\\s*${feature}\\s*:\\s*([^)]+)\\s*\\)`);
      const match = query.match(regex);
      if (match) {
        return createFakeMediaQueryList(query, match[1].trim() === value);
      }
    }

    return original.apply(thisArg, args);
  });

  // getComputedStyle is wrapped by font-preferences spoofer - don't double-wrap
}

function createFakeMediaQueryList(query: string, matches: boolean): MediaQueryList {
  const listeners: Array<(event: MediaQueryListEvent) => void> = [];

  return {
    matches,
    media: query,
    onchange: null,
    addListener: (cb: any) => { if (cb) listeners.push(cb); },
    removeListener: (cb: any) => {
      const idx = listeners.indexOf(cb);
      if (idx > -1) listeners.splice(idx, 1);
    },
    addEventListener: (_type: string, cb: any) => { if (cb) listeners.push(cb); },
    removeEventListener: (_type: string, cb: any) => {
      const idx = listeners.indexOf(cb);
      if (idx > -1) listeners.splice(idx, 1);
    },
    dispatchEvent: () => true,
  } as MediaQueryList;
}
