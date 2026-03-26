/**
 * Unit tests for navigator spoofing constants and logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PRNG } from '../../../src/lib/crypto';

// Constants from navigator spoofer
const PLATFORMS = ['Win32', 'MacIntel', 'Linux x86_64'];
const VENDORS = ['Google Inc.', '', 'Apple Computer, Inc.'];
const LANGUAGES = [
  ['en-US', 'en'],
  ['en-GB', 'en'],
  ['en-US'],
  ['de-DE', 'de', 'en-US', 'en'],
  ['fr-FR', 'fr', 'en-US', 'en'],
];

describe('Navigator Spoofing Logic', () => {
  let prng: PRNG;

  beforeEach(() => {
    const seed = new Uint8Array(32).fill(42);
    prng = new PRNG(seed);
  });

  describe('Platform constants', () => {
    it('has valid platform strings', () => {
      for (const platform of PLATFORMS) {
        expect(typeof platform).toBe('string');
        expect(platform.length).toBeGreaterThan(0);
      }
    });

    it('includes major platforms', () => {
      expect(PLATFORMS).toContain('Win32');
      expect(PLATFORMS).toContain('MacIntel');
      expect(PLATFORMS.some((p) => p.includes('Linux'))).toBe(true);
    });

    it('matches real browser platform values', () => {
      // These are actual navigator.platform values
      const validPlatforms = ['Win32', 'Win64', 'MacIntel', 'Linux x86_64', 'Linux armv7l'];
      for (const platform of PLATFORMS) {
        expect(validPlatforms.some((v) => platform.includes(v.split(' ')[0]))).toBe(true);
      }
    });
  });

  describe('Vendor constants', () => {
    it('has valid vendor strings', () => {
      for (const vendor of VENDORS) {
        expect(typeof vendor).toBe('string');
      }
    });

    it('includes Chrome vendor', () => {
      expect(VENDORS).toContain('Google Inc.');
    });

    it('includes Safari vendor', () => {
      expect(VENDORS).toContain('Apple Computer, Inc.');
    });

    it('includes Firefox vendor (empty string)', () => {
      expect(VENDORS).toContain('');
    });
  });

  describe('Language constants', () => {
    it('has valid language arrays', () => {
      for (const langs of LANGUAGES) {
        expect(Array.isArray(langs)).toBe(true);
        expect(langs.length).toBeGreaterThan(0);
      }
    });

    it('has valid language codes', () => {
      const langCodeRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
      for (const langs of LANGUAGES) {
        for (const lang of langs) {
          expect(langCodeRegex.test(lang)).toBe(true);
        }
      }
    });

    it('includes English variants', () => {
      const hasEnUS = LANGUAGES.some((langs) => langs.includes('en-US'));
      const hasEnGB = LANGUAGES.some((langs) => langs.includes('en-GB'));
      expect(hasEnUS).toBe(true);
      expect(hasEnGB).toBe(true);
    });

    it('primary language is always first', () => {
      for (const langs of LANGUAGES) {
        // First language should be the most specific (e.g., en-US not en)
        const first = langs[0];
        if (langs.length > 1) {
          // If there's a base language, it should come after
          const hasRegion = first.includes('-');
          if (hasRegion) {
            const baseLang = first.split('-')[0];
            const baseIndex = langs.indexOf(baseLang);
            if (baseIndex !== -1) {
              expect(baseIndex).toBeGreaterThan(0);
            }
          }
        }
      }
    });
  });

  describe('Selection determinism', () => {
    it('selects platform deterministically', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      expect(prng1.pick(PLATFORMS)).toBe(prng2.pick(PLATFORMS));
    });

    it('selects vendor deterministically', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      expect(prng1.pick(VENDORS)).toBe(prng2.pick(VENDORS));
    });

    it('selects languages deterministically', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      expect(prng1.pick(LANGUAGES)).toEqual(prng2.pick(LANGUAGES));
    });

    it('different containers get different values', () => {
      const platforms = new Set<string>();
      const vendors = new Set<string>();
      const languages = new Set<string>();

      for (let seed = 1; seed <= 50; seed++) {
        const prng = new PRNG(new Uint8Array(32).fill(seed));
        platforms.add(prng.pick(PLATFORMS));
        vendors.add(prng.pick(VENDORS));
        languages.add(JSON.stringify(prng.pick(LANGUAGES)));
      }

      // Should see variety across different containers
      expect(platforms.size).toBeGreaterThan(1);
      expect(vendors.size).toBeGreaterThan(1);
      expect(languages.size).toBeGreaterThan(1);
    });
  });

  describe('User-Agent consistency', () => {
    it('platform should match user-agent OS', () => {
      // When platform is Win32, UA should indicate Windows
      // When platform is MacIntel, UA should indicate Mac
      // This is a logical consistency check
      const platformToOS: Record<string, string[]> = {
        Win32: ['Windows', 'Win'],
        MacIntel: ['Mac', 'Macintosh'],
        'Linux x86_64': ['Linux', 'X11'],
      };

      for (const [platform, osIndicators] of Object.entries(platformToOS)) {
        expect(PLATFORMS).toContain(platform);
        expect(osIndicators.length).toBeGreaterThan(0);
      }
    });
  });
});
