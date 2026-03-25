/**
 * Unit tests for spoofer utilities and constants
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PRNG } from '../../src/lib/crypto';

describe('Spoofer Constants and Utilities', () => {
  let prng: PRNG;

  beforeEach(() => {
    const seed = new Uint8Array(32).fill(42);
    prng = new PRNG(seed);
  });

  describe('PRNG pick functionality', () => {
    it('picks elements from arrays deterministically', () => {
      const items = ['a', 'b', 'c', 'd', 'e'];
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      const pick1 = prng1.pick(items);
      const pick2 = prng2.pick(items);

      expect(pick1).toBe(pick2);
      expect(items).toContain(pick1);
    });

    it('picks different elements with different seeds', () => {
      const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
      const prng1 = new PRNG(new Uint8Array(32).fill(1));
      const prng2 = new PRNG(new Uint8Array(32).fill(2));

      // With 10 items and different seeds, picks should differ
      const picks1 = Array.from({ length: 5 }, () => prng1.pick(items));
      const picks2 = Array.from({ length: 5 }, () => prng2.pick(items));

      expect(picks1.join('')).not.toBe(picks2.join(''));
    });
  });

  describe('WebGL spoofing constants', () => {
    const COMMON_WEBGL_VENDORS = [
      'Google Inc. (Intel)',
      'Google Inc. (NVIDIA)',
      'Google Inc. (AMD)',
      'Intel Inc.',
      'Apple Inc.',
    ];

    it('has valid vendor strings', () => {
      const vendor = prng.pick(COMMON_WEBGL_VENDORS);
      expect(typeof vendor).toBe('string');
      expect(vendor.length).toBeGreaterThan(0);
      expect(COMMON_WEBGL_VENDORS).toContain(vendor);
    });
  });

  describe('Screen resolution constants', () => {
    const COMMON_RESOLUTIONS = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 2560, height: 1440 },
    ];

    it('returns valid resolution objects', () => {
      const resolution = prng.pick(COMMON_RESOLUTIONS);
      expect(resolution).toHaveProperty('width');
      expect(resolution).toHaveProperty('height');
      expect(resolution.width).toBeGreaterThan(0);
      expect(resolution.height).toBeGreaterThan(0);
    });
  });

  describe('Hardware constants', () => {
    const VALID_CORE_COUNTS = [2, 4, 6, 8, 12, 16];
    const VALID_MEMORY_VALUES = [2, 4, 8];

    it('returns valid core count', () => {
      const cores = prng.pick(VALID_CORE_COUNTS);
      expect(VALID_CORE_COUNTS).toContain(cores);
    });

    it('returns valid memory value', () => {
      const memory = prng.pick(VALID_MEMORY_VALUES);
      expect(VALID_MEMORY_VALUES).toContain(memory);
    });
  });

  describe('Timezone constants', () => {
    const COMMON_OFFSETS = [-480, -420, -360, -300, 0, 60, 120];

    it('returns valid timezone offset', () => {
      const offset = prng.pick(COMMON_OFFSETS);
      expect(COMMON_OFFSETS).toContain(offset);
      expect(Number.isInteger(offset)).toBe(true);
    });
  });

  describe('Audio constants', () => {
    const SAMPLE_RATES = [44100, 48000];

    it('returns valid sample rate', () => {
      const rate = prng.pick(SAMPLE_RATES);
      expect(SAMPLE_RATES).toContain(rate);
    });
  });

  describe('WebRTC IP filtering', () => {
    const LOCAL_IP_PATTERNS = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^127\./,
    ];

    it('identifies local IPs correctly', () => {
      const localIPs = ['10.0.0.1', '172.16.0.1', '192.168.1.1', '127.0.0.1'];

      for (const ip of localIPs) {
        const isLocal = LOCAL_IP_PATTERNS.some((pattern) => pattern.test(ip));
        expect(isLocal).toBe(true);
      }
    });

    it('identifies public IPs correctly', () => {
      const publicIPs = ['8.8.8.8', '1.1.1.1', '142.250.80.46'];

      for (const ip of publicIPs) {
        const isLocal = LOCAL_IP_PATTERNS.some((pattern) => pattern.test(ip));
        expect(isLocal).toBe(false);
      }
    });
  });

  describe('Canvas noise generation', () => {
    it('produces noise within expected range', () => {
      const maxNoise = 3;
      for (let i = 0; i < 20; i++) {
        const noise = prng.nextNoise(maxNoise);
        expect(noise).toBeGreaterThanOrEqual(-maxNoise);
        expect(noise).toBeLessThanOrEqual(maxNoise);
      }
    });

    it('produces deterministic noise', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      const noise1 = prng1.nextNoise(3);
      const noise2 = prng2.nextNoise(3);

      expect(noise1).toBe(noise2);
    });
  });

  describe('Device ID generation', () => {
    it('generates plausible hex device IDs', () => {
      // Generate 32 hex characters (each nextInt(0,15) gives one hex digit)
      const hexChars: string[] = [];
      for (let i = 0; i < 32; i++) {
        const val = prng.nextInt(0, 15);
        hexChars.push(val.toString(16));
      }
      const deviceId = hexChars.join('');

      expect(deviceId.length).toBe(32);
      expect(deviceId).toMatch(/^[0-9a-f]+$/);
    });
  });
});
