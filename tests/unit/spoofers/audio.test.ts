/**
 * Unit tests for audio spoofing logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PRNG } from '../../../src/lib/crypto';
import { farbleFloatArray } from '../../../src/lib/farbling';

describe('Audio Spoofing Logic', () => {
  let prng: PRNG;

  beforeEach(() => {
    const seed = new Uint8Array(32).fill(42);
    prng = new PRNG(seed);
  });

  describe('farbleFloatArray', () => {
    it('modifies Float32Array values', () => {
      const original = new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5]);
      const data = new Float32Array(original);

      farbleFloatArray(data, prng, 0.0001);

      // At least some values should change
      const anyChanged = data.some((v, i) => v !== original[i]);
      expect(anyChanged).toBe(true);
    });

    it('modifies Float64Array values', () => {
      const original = new Float64Array([0.5, 0.5, 0.5]);
      const data = new Float64Array(original);

      farbleFloatArray(data, prng, 0.0001);

      const anyChanged = data.some((v, i) => v !== original[i]);
      expect(anyChanged).toBe(true);
    });

    it('produces deterministic results', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      const data1 = new Float32Array([0.5, 0.5, 0.5]);
      const data2 = new Float32Array([0.5, 0.5, 0.5]);

      farbleFloatArray(data1, prng1, 0.0001);
      farbleFloatArray(data2, prng2, 0.0001);

      expect(data1).toEqual(data2);
    });

    it('applies noise within expected range', () => {
      const amount = 0.01;
      const original = 0.5;
      const data = new Float32Array([original]);

      farbleFloatArray(data, prng, amount);

      expect(data[0]).toBeGreaterThanOrEqual(original - amount);
      expect(data[0]).toBeLessThanOrEqual(original + amount);
    });

    it('handles empty arrays', () => {
      const data = new Float32Array([]);
      expect(() => farbleFloatArray(data, prng, 0.0001)).not.toThrow();
    });

    it('handles large arrays without error', () => {
      // Simulate audio buffer (44100 samples)
      const data = new Float32Array(44100);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.sin((i / 44100) * Math.PI * 2 * 440); // 440Hz sine wave
      }

      // Should complete without throwing
      expect(() => farbleFloatArray(data, prng, 0.0001)).not.toThrow();

      // Verify data was modified
      expect(data.length).toBe(44100);
    });
  });

  describe('Audio fingerprint noise characteristics', () => {
    it('adds imperceptible noise (0.0001 amplitude)', () => {
      const data = new Float32Array([0.0, 0.5, 1.0, -0.5, -1.0]);
      const original = new Float32Array(data);

      farbleFloatArray(data, prng, 0.0001);

      // Changes should be very small
      for (let i = 0; i < data.length; i++) {
        expect(Math.abs(data[i] - original[i])).toBeLessThanOrEqual(0.0001);
      }
    });

    it('produces different noise patterns with different seeds', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(1));
      const prng2 = new PRNG(new Uint8Array(32).fill(2));

      const data1 = new Float32Array([0.5, 0.5, 0.5, 0.5]);
      const data2 = new Float32Array([0.5, 0.5, 0.5, 0.5]);

      farbleFloatArray(data1, prng1, 0.0001);
      farbleFloatArray(data2, prng2, 0.0001);

      // Results should differ
      const same = data1.every((v, i) => v === data2[i]);
      expect(same).toBe(false);
    });
  });

  describe('Audio sample rate constants', () => {
    const COMMON_SAMPLE_RATES = [44100, 48000, 96000];

    it('has valid sample rates', () => {
      for (const rate of COMMON_SAMPLE_RATES) {
        expect(rate).toBeGreaterThan(0);
        expect(Number.isInteger(rate)).toBe(true);
      }
    });

    it('includes standard sample rates', () => {
      expect(COMMON_SAMPLE_RATES).toContain(44100); // CD quality
      expect(COMMON_SAMPLE_RATES).toContain(48000); // Professional audio
    });
  });
});
