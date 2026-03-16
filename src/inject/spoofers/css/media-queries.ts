/**
 * CSS Media Queries Spoofer
 *
 * Media queries can reveal screen characteristics, color preferences,
 * motion preferences, and other system information.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';

interface MediaQueryOverrides {
  'prefers-color-scheme': 'light' | 'dark';
  'prefers-reduced-motion': 'no-preference' | 'reduce';
  'prefers-contrast': 'no-preference' | 'more' | 'less';
  'prefers-reduced-transparency': 'no-preference' | 'reduce';
  'forced-colors': 'none' | 'active';
  'inverted-colors': 'none' | 'inverted';
  'color-gamut': 'srgb' | 'p3' | 'rec2020';
  'pointer': 'none' | 'coarse' | 'fine';
  'hover': 'none' | 'hover';
  'any-pointer': 'none' | 'coarse' | 'fine';
  'any-hover': 'none' | 'hover';
}

/**
 * Initialize CSS media query spoofing
 */
export function initCSSSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  const originalMatchMedia = window.matchMedia;

  // Generate consistent overrides based on PRNG
  const overrides: MediaQueryOverrides = {
    'prefers-color-scheme': prng.pick(['light', 'dark']),
    'prefers-reduced-motion': prng.pick(['no-preference', 'no-preference', 'no-preference', 'reduce']),
    'prefers-contrast': 'no-preference',
    'prefers-reduced-transparency': 'no-preference',
    'forced-colors': 'none',
    'inverted-colors': 'none',
    'color-gamut': prng.pick(['srgb', 'p3']),
    'pointer': 'fine',
    'hover': 'hover',
    'any-pointer': 'fine',
    'any-hover': 'hover',
  };

  window.matchMedia = function (query: string): MediaQueryList {
    logAccess('matchMedia', { spoofed: true });

    // Check if we need to override this query
    for (const [feature, value] of Object.entries(overrides)) {
      const regex = new RegExp(`\\(\\s*${feature}\\s*:\\s*([^)]+)\\s*\\)`);
      const match = query.match(regex);

      if (match) {
        const requestedValue = match[1].trim();
        const matches = requestedValue === value;

        // Create a fake MediaQueryList
        return createFakeMediaQueryList(query, matches);
      }
    }

    // For other queries, use the original
    return originalMatchMedia.call(window, query);
  };

  // Also spoof getComputedStyle for CSS environment variables
  const originalGetComputedStyle = window.getComputedStyle;

  window.getComputedStyle = function (
    element: Element,
    pseudoElt?: string | null
  ): CSSStyleDeclaration {
    logAccess('getComputedStyle', { spoofed: true });
    return originalGetComputedStyle.call(window, element, pseudoElt);
  };

  console.log('[ContainerShield] CSS media queries spoofer initialized');
}

/**
 * Create a fake MediaQueryList object
 */
function createFakeMediaQueryList(query: string, matches: boolean): MediaQueryList {
  const listeners: Array<(event: MediaQueryListEvent) => void> = [];

  const mql: MediaQueryList = {
    matches,
    media: query,
    onchange: null,
    addListener: (cb) => {
      if (cb) listeners.push(cb);
    },
    removeListener: (cb) => {
      const idx = listeners.indexOf(cb);
      if (idx > -1) listeners.splice(idx, 1);
    },
    addEventListener: (type, cb) => {
      if (type === 'change' && cb) {
        listeners.push(cb as (event: MediaQueryListEvent) => void);
      }
    },
    removeEventListener: (type, cb) => {
      if (type === 'change' && cb) {
        const idx = listeners.indexOf(cb as (event: MediaQueryListEvent) => void);
        if (idx > -1) listeners.splice(idx, 1);
      }
    },
    dispatchEvent: () => true,
  };

  return mql;
}
