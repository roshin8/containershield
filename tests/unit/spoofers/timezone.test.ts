/**
 * Unit tests for timezone spoofing constants and logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PRNG } from '../../../src/lib/crypto';
import { farbleTimezoneOffset, COMMON_TIMEZONE_OFFSETS } from '../../../src/lib/farbling';

describe('Timezone Spoofing Logic', () => {
  let prng: PRNG;

  beforeEach(() => {
    const seed = new Uint8Array(32).fill(42);
    prng = new PRNG(seed);
  });

  describe('Timezone offset constants', () => {
    it('has valid timezone offsets', () => {
      for (const offset of COMMON_TIMEZONE_OFFSETS) {
        expect(Number.isInteger(offset)).toBe(true);
      }
    });

    it('offsets are in valid range (-720 to +840 minutes)', () => {
      // UTC-12 to UTC+14 in minutes
      for (const offset of COMMON_TIMEZONE_OFFSETS) {
        expect(offset).toBeGreaterThanOrEqual(-720);
        expect(offset).toBeLessThanOrEqual(840);
      }
    });

    it('includes UTC (offset 0)', () => {
      expect(COMMON_TIMEZONE_OFFSETS).toContain(0);
    });

    it('includes US timezones', () => {
      // PST = UTC-8 = 480 minutes
      // EST = UTC-5 = 300 minutes
      // CST = UTC-6 = 360 minutes
      const usOffsets = COMMON_TIMEZONE_OFFSETS.filter(
        (o) => o >= 240 && o <= 600 // UTC-4 to UTC-10
      );
      expect(usOffsets.length).toBeGreaterThan(0);
    });

    it('includes European timezones', () => {
      // CET = UTC+1 = -60 minutes
      // GMT = UTC+0 = 0 minutes
      const euOffsets = COMMON_TIMEZONE_OFFSETS.filter(
        (o) => o >= -180 && o <= 60 // UTC-1 to UTC+3
      );
      expect(euOffsets.length).toBeGreaterThan(0);
    });

    it('offsets are typically multiples of 60 or 30', () => {
      for (const offset of COMMON_TIMEZONE_OFFSETS) {
        const isHour = offset % 60 === 0;
        const isHalfHour = offset % 30 === 0;
        expect(isHour || isHalfHour).toBe(true);
      }
    });
  });

  describe('farbleTimezoneOffset', () => {
    it('returns value from common offsets', () => {
      const offset = farbleTimezoneOffset(prng);
      expect(COMMON_TIMEZONE_OFFSETS).toContain(offset);
    });

    it('is deterministic', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      expect(farbleTimezoneOffset(prng1)).toBe(farbleTimezoneOffset(prng2));
    });

    it('produces variety across seeds', () => {
      const offsets = new Set<number>();
      for (let seed = 1; seed <= 50; seed++) {
        const prng = new PRNG(new Uint8Array(32).fill(seed));
        offsets.add(farbleTimezoneOffset(prng));
      }
      expect(offsets.size).toBeGreaterThan(1);
    });
  });

  describe('Timezone offset to name mapping', () => {
    // Helper to convert offset to readable timezone
    const offsetToTimezone = (offset: number): string => {
      const hours = Math.floor(Math.abs(offset) / 60);
      const minutes = Math.abs(offset) % 60;
      const sign = offset <= 0 ? '+' : '-';
      return `UTC${sign}${hours}${minutes ? ':' + minutes : ''}`;
    };

    it('all offsets can be converted to readable format', () => {
      for (const offset of COMMON_TIMEZONE_OFFSETS) {
        const tz = offsetToTimezone(offset);
        expect(tz).toMatch(/^UTC[+-]\d+(:30)?$/);
      }
    });
  });
});
