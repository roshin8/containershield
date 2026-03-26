/**
 * Unit tests for hardware spoofing constants and logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PRNG } from '../../../src/lib/crypto';
import {
  farbleScreenResolution,
  farbleDeviceMemory,
  farbleHardwareConcurrency,
  COMMON_SCREEN_RESOLUTIONS,
  COMMON_DEVICE_MEMORY,
  COMMON_HARDWARE_CONCURRENCY,
} from '../../../src/lib/farbling';

describe('Hardware Spoofing Logic', () => {
  let prng: PRNG;

  beforeEach(() => {
    const seed = new Uint8Array(32).fill(42);
    prng = new PRNG(seed);
  });

  describe('Screen resolution constants', () => {
    it('has valid resolution objects', () => {
      for (const res of COMMON_SCREEN_RESOLUTIONS) {
        expect(res).toHaveProperty('width');
        expect(res).toHaveProperty('height');
        expect(res.width).toBeGreaterThan(0);
        expect(res.height).toBeGreaterThan(0);
      }
    });

    it('has common resolutions', () => {
      const widths = COMMON_SCREEN_RESOLUTIONS.map((r) => r.width);
      expect(widths).toContain(1920); // Full HD
      expect(widths).toContain(1366); // Common laptop
    });

    it('has landscape orientations', () => {
      for (const res of COMMON_SCREEN_RESOLUTIONS) {
        expect(res.width).toBeGreaterThanOrEqual(res.height);
      }
    });

    it('farbleScreenResolution returns valid resolution', () => {
      const resolution = farbleScreenResolution(prng);
      expect(COMMON_SCREEN_RESOLUTIONS).toContainEqual(resolution);
    });

    it('farbleScreenResolution is deterministic', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      expect(farbleScreenResolution(prng1)).toEqual(farbleScreenResolution(prng2));
    });
  });

  describe('Device memory constants', () => {
    it('has valid memory values', () => {
      for (const mem of COMMON_DEVICE_MEMORY) {
        expect(mem).toBeGreaterThan(0);
        expect(Number.isFinite(mem)).toBe(true);
      }
    });

    it('has common memory sizes', () => {
      expect(COMMON_DEVICE_MEMORY).toContain(4);
      expect(COMMON_DEVICE_MEMORY).toContain(8);
    });

    it('values are powers of 2 or standard sizes', () => {
      const validSizes = [0.25, 0.5, 1, 2, 4, 8, 16, 32];
      for (const mem of COMMON_DEVICE_MEMORY) {
        expect(validSizes).toContain(mem);
      }
    });

    it('farbleDeviceMemory returns valid value', () => {
      const memory = farbleDeviceMemory(prng);
      expect(COMMON_DEVICE_MEMORY).toContain(memory);
    });
  });

  describe('Hardware concurrency constants', () => {
    it('has valid core counts', () => {
      for (const cores of COMMON_HARDWARE_CONCURRENCY) {
        expect(cores).toBeGreaterThan(0);
        expect(Number.isInteger(cores)).toBe(true);
      }
    });

    it('has common core counts', () => {
      expect(COMMON_HARDWARE_CONCURRENCY).toContain(4);
      expect(COMMON_HARDWARE_CONCURRENCY).toContain(8);
    });

    it('values are realistic CPU core counts', () => {
      for (const cores of COMMON_HARDWARE_CONCURRENCY) {
        expect(cores).toBeGreaterThanOrEqual(2);
        expect(cores).toBeLessThanOrEqual(128); // Even server CPUs rarely exceed this
      }
    });

    it('farbleHardwareConcurrency returns valid value', () => {
      const cores = farbleHardwareConcurrency(prng);
      expect(COMMON_HARDWARE_CONCURRENCY).toContain(cores);
    });
  });

  describe('Selection distribution', () => {
    it('selects various screen resolutions across seeds', () => {
      const resolutions = new Set<string>();
      for (let seed = 1; seed <= 50; seed++) {
        const prng = new PRNG(new Uint8Array(32).fill(seed));
        const res = farbleScreenResolution(prng);
        resolutions.add(`${res.width}x${res.height}`);
      }
      expect(resolutions.size).toBeGreaterThan(1);
    });

    it('selects various memory values across seeds', () => {
      const memories = new Set<number>();
      for (let seed = 1; seed <= 50; seed++) {
        const prng = new PRNG(new Uint8Array(32).fill(seed));
        memories.add(farbleDeviceMemory(prng));
      }
      expect(memories.size).toBeGreaterThan(1);
    });

    it('selects various core counts across seeds', () => {
      const cores = new Set<number>();
      for (let seed = 1; seed <= 50; seed++) {
        const prng = new PRNG(new Uint8Array(32).fill(seed));
        cores.add(farbleHardwareConcurrency(prng));
      }
      expect(cores.size).toBeGreaterThan(1);
    });
  });
});
