/**
 * Unit tests for crypto utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSeed,
  uint8ArrayToBase64,
  base64ToUint8Array,
  sha256,
  sha256Hex,
  deriveKey,
  PRNG,
  generateFingerprintHash,
} from '../../src/lib/crypto';

describe('crypto utilities', () => {
  describe('generateSeed', () => {
    it('generates a 32-byte seed', async () => {
      const seed = await generateSeed();
      expect(seed).toBeInstanceOf(Uint8Array);
      expect(seed.length).toBe(32);
    });

    it('generates different seeds each time', async () => {
      const seed1 = await generateSeed();
      const seed2 = await generateSeed();
      expect(uint8ArrayToBase64(seed1)).not.toBe(uint8ArrayToBase64(seed2));
    });
  });

  describe('base64 conversion', () => {
    it('converts Uint8Array to base64 and back', () => {
      const original = new Uint8Array([1, 2, 3, 4, 255, 128, 0]);
      const base64 = uint8ArrayToBase64(original);
      const restored = base64ToUint8Array(base64);
      expect(restored).toEqual(original);
    });

    it('handles empty array', () => {
      const original = new Uint8Array([]);
      const base64 = uint8ArrayToBase64(original);
      const restored = base64ToUint8Array(base64);
      expect(restored).toEqual(original);
    });
  });

  describe('sha256', () => {
    it('hashes a string to 32 bytes', async () => {
      const hash = await sha256('test');
      expect(hash).toBeInstanceOf(Uint8Array);
      expect(hash.length).toBe(32);
    });

    it('produces consistent hashes', async () => {
      const hash1 = await sha256('test');
      const hash2 = await sha256('test');
      expect(uint8ArrayToBase64(hash1)).toBe(uint8ArrayToBase64(hash2));
    });

    it('produces different hashes for different inputs', async () => {
      const hash1 = await sha256('test1');
      const hash2 = await sha256('test2');
      expect(uint8ArrayToBase64(hash1)).not.toBe(uint8ArrayToBase64(hash2));
    });
  });

  describe('sha256Hex', () => {
    it('produces a 64-character hex string', async () => {
      const hex = await sha256Hex('test');
      expect(hex.length).toBe(64);
      expect(hex).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('deriveKey', () => {
    it('derives consistent keys for same inputs', async () => {
      const seed = new Uint8Array(32).fill(1);
      const key1 = await deriveKey(seed, 'example.com', 'canvas');
      const key2 = await deriveKey(seed, 'example.com', 'canvas');
      expect(uint8ArrayToBase64(key1)).toBe(uint8ArrayToBase64(key2));
    });

    it('derives different keys for different domains', async () => {
      const seed = new Uint8Array(32).fill(1);
      const key1 = await deriveKey(seed, 'example.com', 'canvas');
      const key2 = await deriveKey(seed, 'other.com', 'canvas');
      expect(uint8ArrayToBase64(key1)).not.toBe(uint8ArrayToBase64(key2));
    });

    it('derives different keys for different APIs', async () => {
      const seed = new Uint8Array(32).fill(1);
      const key1 = await deriveKey(seed, 'example.com', 'canvas');
      const key2 = await deriveKey(seed, 'example.com', 'webgl');
      expect(uint8ArrayToBase64(key1)).not.toBe(uint8ArrayToBase64(key2));
    });

    it('accepts string seed', async () => {
      const seedBase64 = uint8ArrayToBase64(new Uint8Array(32).fill(1));
      const key = await deriveKey(seedBase64, 'example.com', 'canvas');
      expect(key.length).toBe(32);
    });
  });

  describe('PRNG', () => {
    let prng: PRNG;

    beforeEach(() => {
      const seed = new Uint8Array(32).fill(42);
      prng = new PRNG(seed);
    });

    it('produces deterministic results from same seed', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      for (let i = 0; i < 10; i++) {
        expect(prng1.nextFloat()).toBe(prng2.nextFloat());
      }
    });

    it('produces different results from different seeds', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(1));
      const prng2 = new PRNG(new Uint8Array(32).fill(2));

      expect(prng1.nextFloat()).not.toBe(prng2.nextFloat());
    });

    describe('nextFloat', () => {
      it('returns values in [0, 1)', () => {
        for (let i = 0; i < 100; i++) {
          const value = prng.nextFloat();
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThan(1);
        }
      });
    });

    describe('nextFloatRange', () => {
      it('returns values in [min, max)', () => {
        for (let i = 0; i < 100; i++) {
          const value = prng.nextFloatRange(10, 20);
          expect(value).toBeGreaterThanOrEqual(10);
          expect(value).toBeLessThan(20);
        }
      });
    });

    describe('nextInt', () => {
      it('returns integers in [min, max]', () => {
        const counts: Record<number, number> = {};
        for (let i = 0; i < 100; i++) {
          const value = prng.nextInt(1, 5);
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(1);
          expect(value).toBeLessThanOrEqual(5);
          counts[value] = (counts[value] || 0) + 1;
        }
        // Most values should appear at least once with 100 tries
        expect(Object.keys(counts).length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('nextNoise', () => {
      it('returns values in [-amount, +amount]', () => {
        for (let i = 0; i < 100; i++) {
          const value = prng.nextNoise(0.5);
          expect(value).toBeGreaterThanOrEqual(-0.5);
          expect(value).toBeLessThanOrEqual(0.5);
        }
      });
    });

    describe('pick', () => {
      it('picks elements from array', () => {
        const items = ['a', 'b', 'c', 'd'];
        const picked = new Set<string>();
        for (let i = 0; i < 100; i++) {
          picked.add(prng.pick(items));
        }
        // Should pick all items eventually
        expect(picked.size).toBe(4);
      });
    });

    describe('shuffle', () => {
      it('shuffles array in place', () => {
        const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const array = [...original];
        const result = prng.shuffle(array);

        expect(result).toBe(array); // In place
        expect(array.sort()).toEqual(original); // Same elements
      });
    });

    describe('fromBase64', () => {
      it('creates PRNG from base64 seed', () => {
        const seed = new Uint8Array(32).fill(42);
        const base64 = uint8ArrayToBase64(seed);
        const prng1 = new PRNG(seed);
        const prng2 = PRNG.fromBase64(base64);

        expect(prng1.nextFloat()).toBe(prng2.nextFloat());
      });
    });

    describe('fromDerivedKey', () => {
      it('creates PRNG with domain-specific seed', async () => {
        const seed = new Uint8Array(32).fill(42);

        const prng1 = await PRNG.fromDerivedKey(seed, 'example.com', 'canvas');
        const prng2 = await PRNG.fromDerivedKey(seed, 'example.com', 'canvas');
        const prng3 = await PRNG.fromDerivedKey(seed, 'other.com', 'canvas');

        // Same domain = same sequence
        expect(prng1.nextFloat()).toBe(prng2.nextFloat());

        // Different domain = different sequence (reset for clean comparison)
        const p1 = await PRNG.fromDerivedKey(seed, 'example.com', 'canvas');
        const p2 = await PRNG.fromDerivedKey(seed, 'other.com', 'canvas');
        expect(p1.nextFloat()).not.toBe(p2.nextFloat());
      });
    });
  });

  describe('generateFingerprintHash', () => {
    it('generates consistent hashes', async () => {
      const hash1 = await generateFingerprintHash('seed', 'example.com', 'canvas');
      const hash2 = await generateFingerprintHash('seed', 'example.com', 'canvas');
      expect(hash1).toBe(hash2);
    });

    it('generates different hashes for different containers', async () => {
      const hash1 = await generateFingerprintHash('seed1', 'example.com', 'canvas');
      const hash2 = await generateFingerprintHash('seed2', 'example.com', 'canvas');
      expect(hash1).not.toBe(hash2);
    });
  });
});
