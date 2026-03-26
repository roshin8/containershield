/**
 * Unit tests for canvas spoofing logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PRNG } from '../../../src/lib/crypto';
import { farbleImageData, farblePixel } from '../../../src/lib/farbling';

describe('Canvas Spoofing Logic', () => {
  let prng: PRNG;

  beforeEach(() => {
    const seed = new Uint8Array(32).fill(42);
    prng = new PRNG(seed);
  });

  describe('farblePixel', () => {
    it('adds noise within expected range', () => {
      const original = 128;
      const maxNoise = 3;

      for (let i = 0; i < 100; i++) {
        const result = farblePixel(original, prng, maxNoise);
        expect(result).toBeGreaterThanOrEqual(original - maxNoise);
        expect(result).toBeLessThanOrEqual(original + maxNoise);
      }
    });

    it('clamps values at lower boundary', () => {
      const original = 1;
      const maxNoise = 5;

      for (let i = 0; i < 50; i++) {
        const result = farblePixel(original, prng, maxNoise);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(255);
      }
    });

    it('clamps values at upper boundary', () => {
      const original = 254;
      const maxNoise = 5;

      for (let i = 0; i < 50; i++) {
        const result = farblePixel(original, prng, maxNoise);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(255);
      }
    });

    it('returns integers', () => {
      for (let i = 0; i < 50; i++) {
        const result = farblePixel(100, prng, 3);
        expect(Number.isInteger(result)).toBe(true);
      }
    });

    it('is deterministic with same PRNG state', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(123));
      const prng2 = new PRNG(new Uint8Array(32).fill(123));

      for (let i = 0; i < 10; i++) {
        expect(farblePixel(100, prng1, 3)).toBe(farblePixel(100, prng2, 3));
      }
    });
  });

  describe('farbleImageData', () => {
    it('modifies RGB channels but not alpha', () => {
      // RGBA format: [R, G, B, A, R, G, B, A, ...]
      const data = new Uint8ClampedArray([
        128, 128, 128, 255, // Pixel 1
        200, 100, 50, 255, // Pixel 2
      ]);
      const original = new Uint8ClampedArray(data);

      farbleImageData(data, prng, 3);

      // Alpha values should remain unchanged
      expect(data[3]).toBe(255);
      expect(data[7]).toBe(255);

      // At least some RGB values should change (statistically very likely)
      const rgbChanged =
        data[0] !== original[0] ||
        data[1] !== original[1] ||
        data[2] !== original[2] ||
        data[4] !== original[4] ||
        data[5] !== original[5] ||
        data[6] !== original[6];
      expect(rgbChanged).toBe(true);
    });

    it('produces deterministic results', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      const data1 = new Uint8ClampedArray([128, 128, 128, 255, 100, 100, 100, 255]);
      const data2 = new Uint8ClampedArray([128, 128, 128, 255, 100, 100, 100, 255]);

      farbleImageData(data1, prng1, 3);
      farbleImageData(data2, prng2, 3);

      expect(data1).toEqual(data2);
    });

    it('produces different results with different seeds', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(1));
      const prng2 = new PRNG(new Uint8Array(32).fill(2));

      const data1 = new Uint8ClampedArray([128, 128, 128, 255]);
      const data2 = new Uint8ClampedArray([128, 128, 128, 255]);

      farbleImageData(data1, prng1, 3);
      farbleImageData(data2, prng2, 3);

      // With different seeds, results should differ
      const same = data1[0] === data2[0] && data1[1] === data2[1] && data1[2] === data2[2];
      expect(same).toBe(false);
    });

    it('handles empty data', () => {
      const data = new Uint8ClampedArray([]);
      expect(() => farbleImageData(data, prng, 3)).not.toThrow();
    });

    it('handles large image data', () => {
      // Simulate 100x100 image
      const data = new Uint8ClampedArray(100 * 100 * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 128; // R
        data[i + 1] = 128; // G
        data[i + 2] = 128; // B
        data[i + 3] = 255; // A
      }

      expect(() => farbleImageData(data, prng, 3)).not.toThrow();

      // Verify all alpha values preserved
      for (let i = 3; i < data.length; i += 4) {
        expect(data[i]).toBe(255);
      }
    });
  });
});
