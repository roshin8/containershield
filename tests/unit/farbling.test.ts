/**
 * Unit tests for farbling utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PRNG } from '../../src/lib/crypto';
import {
  farblePixel,
  farbleImageData,
  farbleFloat,
  farbleFloatArray,
  farbleDOMRect,
  farbleTextMetrics,
  farbleInteger,
  farbleScreenResolution,
  farbleDeviceMemory,
  farbleHardwareConcurrency,
  farbleWebGLParameter,
  farbleTimezoneOffset,
  COMMON_SCREEN_RESOLUTIONS,
  COMMON_DEVICE_MEMORY,
  COMMON_HARDWARE_CONCURRENCY,
  COMMON_TIMEZONE_OFFSETS,
} from '../../src/lib/farbling';

describe('farbling utilities', () => {
  let prng: PRNG;

  beforeEach(() => {
    // Create deterministic PRNG for testing
    const seed = new Uint8Array(32).fill(42);
    prng = new PRNG(seed);
  });

  describe('farblePixel', () => {
    it('returns values in valid pixel range [0, 255]', () => {
      for (let i = 0; i < 50; i++) {
        const result = farblePixel(128, prng, 3);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(255);
      }
    });

    it('clamps to [0, 255] at boundaries', () => {
      // Test many times to ensure clamping works
      for (let i = 0; i < 20; i++) {
        const lowResult = farblePixel(0, prng, 10);
        expect(lowResult).toBeGreaterThanOrEqual(0);
        expect(lowResult).toBeLessThanOrEqual(255);

        const highResult = farblePixel(255, prng, 10);
        expect(highResult).toBeGreaterThanOrEqual(0);
        expect(highResult).toBeLessThanOrEqual(255);
      }
    });

    it('returns integer values', () => {
      for (let i = 0; i < 50; i++) {
        const result = farblePixel(128, prng, 3);
        expect(Number.isInteger(result)).toBe(true);
      }
    });

    it('produces deterministic results with same PRNG seed', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(99));
      const prng2 = new PRNG(new Uint8Array(32).fill(99));

      const result1 = farblePixel(128, prng1, 3);
      const result2 = farblePixel(128, prng2, 3);

      expect(result1).toBe(result2);
    });
  });

  describe('farbleImageData', () => {
    it('modifies pixel data', () => {
      const original = new Uint8ClampedArray([100, 100, 100, 255, 200, 200, 200, 255]);
      const data = new Uint8ClampedArray(original);

      farbleImageData(data, prng, 3);

      // At least some RGB values should be different (statistically very likely)
      const changed = data[0] !== original[0] || data[1] !== original[1] ||
                      data[2] !== original[2] || data[4] !== original[4];
      expect(changed).toBe(true);

      // Alpha should be unchanged
      expect(data[3]).toBe(255);
      expect(data[7]).toBe(255);
    });

    it('produces consistent results with same PRNG', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      const data1 = new Uint8ClampedArray([100, 100, 100, 255]);
      const data2 = new Uint8ClampedArray([100, 100, 100, 255]);

      farbleImageData(data1, prng1, 3);
      farbleImageData(data2, prng2, 3);

      expect(data1).toEqual(data2);
    });
  });

  describe('farbleFloat', () => {
    it('adds noise to float values', () => {
      const original = 0.5;
      const results = new Set<number>();

      // Collect several results to verify variation
      for (let i = 0; i < 20; i++) {
        const farbled = farbleFloat(original, prng, 0.01);
        results.add(farbled);
        expect(typeof farbled).toBe('number');
      }

      // Should have some variation
      expect(results.size).toBeGreaterThan(1);
    });

    it('produces deterministic results', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      expect(farbleFloat(0.5, prng1, 0.01)).toBe(farbleFloat(0.5, prng2, 0.01));
    });
  });

  describe('farbleFloatArray', () => {
    it('modifies array in place', () => {
      const original = new Float32Array([0.5, 0.5, 0.5]);
      const data = new Float32Array(original);

      farbleFloatArray(data, prng, 0.01);

      // Values should be modified
      const unchanged = data[0] === original[0] &&
                        data[1] === original[1] &&
                        data[2] === original[2];
      expect(unchanged).toBe(false);
    });

    it('works with Float64Array', () => {
      const data = new Float64Array([0.5, 0.5, 0.5]);
      farbleFloatArray(data, prng, 0.01);
      expect(data.length).toBe(3);
    });
  });

  describe('farbleDOMRect', () => {
    it('returns object with modified coordinates', () => {
      const original = { x: 100, y: 100, width: 200, height: 200 };
      const farbled = farbleDOMRect(original, prng, 0.5);

      expect(farbled).toHaveProperty('x');
      expect(farbled).toHaveProperty('y');
      expect(farbled).toHaveProperty('width');
      expect(farbled).toHaveProperty('height');
      expect(typeof farbled.x).toBe('number');
    });

    it('returns a new object', () => {
      const original = { x: 100, y: 100, width: 200, height: 200 };
      const farbled = farbleDOMRect(original, prng, 0.5);
      expect(farbled).not.toBe(original);
    });
  });

  describe('farbleTextMetrics', () => {
    it('returns object with modified width', () => {
      const original = { width: 100 };
      const farbled = farbleTextMetrics(original, prng, 0.5);

      expect(farbled).toHaveProperty('width');
      expect(typeof farbled.width).toBe('number');
    });
  });

  describe('farbleInteger', () => {
    it('returns value within bounds', () => {
      for (let i = 0; i < 50; i++) {
        const result = farbleInteger(8, prng, 4, 16);
        expect(result).toBeGreaterThanOrEqual(4);
        expect(result).toBeLessThanOrEqual(16);
      }
    });

    it('returns integer values', () => {
      for (let i = 0; i < 50; i++) {
        const result = farbleInteger(8, prng, 4, 16);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });

  describe('farbleScreenResolution', () => {
    it('returns a valid resolution from common list', () => {
      const resolution = farbleScreenResolution(prng);
      expect(resolution).toHaveProperty('width');
      expect(resolution).toHaveProperty('height');
      expect(COMMON_SCREEN_RESOLUTIONS).toContainEqual(resolution);
    });
  });

  describe('farbleDeviceMemory', () => {
    it('returns a value from common device memory list', () => {
      const memory = farbleDeviceMemory(prng);
      expect(COMMON_DEVICE_MEMORY).toContain(memory);
    });
  });

  describe('farbleHardwareConcurrency', () => {
    it('returns a value from common CPU count list', () => {
      const cores = farbleHardwareConcurrency(prng);
      expect(COMMON_HARDWARE_CONCURRENCY).toContain(cores);
    });
  });

  describe('farbleWebGLParameter', () => {
    it('handles numeric values', () => {
      const original = 1000;
      const farbled = farbleWebGLParameter('MAX_TEXTURE_SIZE', original, prng);
      expect(typeof farbled).toBe('number');
    });

    it('preserves string values', () => {
      const original = 'NVIDIA GeForce GTX 1080';
      const farbled = farbleWebGLParameter('RENDERER', original, prng);
      expect(farbled).toBe(original);
    });
  });

  describe('farbleTimezoneOffset', () => {
    it('returns a value from common timezone offset list', () => {
      const offset = farbleTimezoneOffset(prng);
      expect(COMMON_TIMEZONE_OFFSETS).toContain(offset);
    });
  });
});
