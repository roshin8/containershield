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
    it('adds noise to pixel values', () => {
      const freshPRNG = new PRNG(new Uint8Array(32).fill(42));
      const original = 128;
      const farbled = farblePixel(original, freshPRNG, 3);

      expect(farbled).toBeGreaterThanOrEqual(125);
      expect(farbled).toBeLessThanOrEqual(131);
    });

    it('clamps to [0, 255]', () => {
      // Test low boundary
      expect(farblePixel(0, prng, 10)).toBeGreaterThanOrEqual(0);
      expect(farblePixel(0, prng, 10)).toBeLessThanOrEqual(255);

      // Test high boundary
      expect(farblePixel(255, prng, 10)).toBeGreaterThanOrEqual(0);
      expect(farblePixel(255, prng, 10)).toBeLessThanOrEqual(255);
    });

    it('returns integer values', () => {
      for (let i = 0; i < 100; i++) {
        const result = farblePixel(128, prng, 3);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });

  describe('farbleImageData', () => {
    it('modifies RGB values in place', () => {
      const original = new Uint8ClampedArray([100, 100, 100, 255, 200, 200, 200, 255]);
      const data = new Uint8ClampedArray(original);

      farbleImageData(data, prng, 3);

      // RGB values should be modified
      expect(data[0]).not.toBe(original[0]); // R
      expect(data[1]).not.toBe(original[1]); // G
      expect(data[2]).not.toBe(original[2]); // B

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
      const freshPRNG = new PRNG(new Uint8Array(32).fill(42));
      const original = 0.5;
      const farbled = farbleFloat(original, freshPRNG, 0.01);

      expect(farbled).toBeGreaterThanOrEqual(0.49);
      expect(farbled).toBeLessThanOrEqual(0.51);
    });
  });

  describe('farbleFloatArray', () => {
    it('modifies array in place', () => {
      const original = new Float32Array([0.5, 0.5, 0.5]);
      const data = new Float32Array(original);

      farbleFloatArray(data, prng, 0.01);

      expect(data[0]).not.toBe(original[0]);
      expect(data[1]).not.toBe(original[1]);
      expect(data[2]).not.toBe(original[2]);
    });

    it('works with Float64Array', () => {
      const data = new Float64Array([0.5, 0.5, 0.5]);
      farbleFloatArray(data, prng, 0.01);

      // Should not throw
      expect(data.length).toBe(3);
    });
  });

  describe('farbleDOMRect', () => {
    it('adds noise to all coordinates', () => {
      const freshPRNG = new PRNG(new Uint8Array(32).fill(42));
      const original = { x: 100, y: 100, width: 200, height: 200 };
      const farbled = farbleDOMRect(original, freshPRNG, 0.5);

      expect(farbled.x).not.toBe(original.x);
      expect(farbled.y).not.toBe(original.y);
      expect(farbled.width).not.toBe(original.width);
      expect(farbled.height).not.toBe(original.height);

      // Within expected range
      expect(Math.abs(farbled.x - original.x)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(farbled.y - original.y)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(farbled.width - original.width)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(farbled.height - original.height)).toBeLessThanOrEqual(0.5);
    });

    it('returns a new object', () => {
      const original = { x: 100, y: 100, width: 200, height: 200 };
      const farbled = farbleDOMRect(original, prng, 0.5);

      expect(farbled).not.toBe(original);
    });
  });

  describe('farbleTextMetrics', () => {
    it('adds noise to width', () => {
      const freshPRNG = new PRNG(new Uint8Array(32).fill(42));
      const original = { width: 100 };
      const farbled = farbleTextMetrics(original, freshPRNG, 0.5);

      expect(farbled.width).not.toBe(original.width);
      expect(Math.abs(farbled.width - original.width)).toBeLessThanOrEqual(0.5);
    });
  });

  describe('farbleInteger', () => {
    it('returns value within bounds', () => {
      for (let i = 0; i < 100; i++) {
        const result = farbleInteger(8, prng, 4, 16);
        expect(result).toBeGreaterThanOrEqual(4);
        expect(result).toBeLessThanOrEqual(16);
      }
    });

    it('returns integer values', () => {
      for (let i = 0; i < 100; i++) {
        const result = farbleInteger(8, prng, 4, 16);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });

  describe('farbleScreenResolution', () => {
    it('returns a common resolution', () => {
      const freshPRNG = new PRNG(new Uint8Array(32).fill(99));
      const resolution = farbleScreenResolution(freshPRNG);

      expect(COMMON_SCREEN_RESOLUTIONS).toContainEqual(resolution);
    });
  });

  describe('farbleDeviceMemory', () => {
    it('returns a common device memory value', () => {
      const freshPRNG = new PRNG(new Uint8Array(32).fill(99));
      const memory = farbleDeviceMemory(freshPRNG);

      expect(COMMON_DEVICE_MEMORY).toContain(memory);
    });
  });

  describe('farbleHardwareConcurrency', () => {
    it('returns a common CPU count', () => {
      const freshPRNG = new PRNG(new Uint8Array(32).fill(99));
      const cores = farbleHardwareConcurrency(freshPRNG);

      expect(COMMON_HARDWARE_CONCURRENCY).toContain(cores);
    });
  });

  describe('farbleWebGLParameter', () => {
    it('adds noise to numeric values', () => {
      const original = 1000;
      const farbled = farbleWebGLParameter('MAX_TEXTURE_SIZE', original, prng);

      expect(farbled).not.toBe(original);
      expect(typeof farbled).toBe('number');
    });

    it('preserves string values', () => {
      const original = 'NVIDIA GeForce GTX 1080';
      const farbled = farbleWebGLParameter('RENDERER', original, prng);

      expect(farbled).toBe(original);
    });
  });

  describe('farbleTimezoneOffset', () => {
    it('returns a common timezone offset', () => {
      const freshPRNG = new PRNG(new Uint8Array(32).fill(99));
      const offset = farbleTimezoneOffset(freshPRNG);

      expect(COMMON_TIMEZONE_OFFSETS).toContain(offset);
    });
  });
});
