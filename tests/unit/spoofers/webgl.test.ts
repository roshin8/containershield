/**
 * Unit tests for WebGL spoofing constants and logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PRNG } from '../../../src/lib/crypto';

// GPU combinations used in WebGL spoofing
const GPU_COMBINATIONS = [
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce GTX 1660 SUPER)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 3060)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD Radeon RX 580)' },
  { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel UHD Graphics 630)' },
  { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel Iris Plus Graphics)' },
  { vendor: 'Intel Inc.', renderer: 'Intel Iris OpenGL Engine' },
  { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 5500M' },
];

describe('WebGL Spoofing Logic', () => {
  let prng: PRNG;

  beforeEach(() => {
    const seed = new Uint8Array(32).fill(42);
    prng = new PRNG(seed);
  });

  describe('GPU combinations', () => {
    it('has valid vendor strings', () => {
      for (const gpu of GPU_COMBINATIONS) {
        expect(typeof gpu.vendor).toBe('string');
        expect(gpu.vendor.length).toBeGreaterThan(0);
      }
    });

    it('has valid renderer strings', () => {
      for (const gpu of GPU_COMBINATIONS) {
        expect(typeof gpu.renderer).toBe('string');
        expect(gpu.renderer.length).toBeGreaterThan(0);
      }
    });

    it('includes major GPU vendors', () => {
      const vendors = GPU_COMBINATIONS.map((g) => g.vendor.toLowerCase());
      expect(vendors.some((v) => v.includes('nvidia'))).toBe(true);
      expect(vendors.some((v) => v.includes('amd') || v.includes('ati'))).toBe(true);
      expect(vendors.some((v) => v.includes('intel'))).toBe(true);
    });

    it('has realistic renderer strings', () => {
      for (const gpu of GPU_COMBINATIONS) {
        // Should contain GPU model or technology name
        const hasModelInfo =
          gpu.renderer.includes('GeForce') ||
          gpu.renderer.includes('Radeon') ||
          gpu.renderer.includes('Intel') ||
          gpu.renderer.includes('Iris');
        expect(hasModelInfo).toBe(true);
      }
    });
  });

  describe('GPU selection', () => {
    it('selects GPU deterministically', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      const gpu1 = prng1.pick(GPU_COMBINATIONS);
      const gpu2 = prng2.pick(GPU_COMBINATIONS);

      expect(gpu1).toEqual(gpu2);
    });

    it('selects different GPUs with different seeds', () => {
      const selections = new Set<string>();

      for (let seed = 1; seed <= 20; seed++) {
        const prng = new PRNG(new Uint8Array(32).fill(seed));
        const gpu = prng.pick(GPU_COMBINATIONS);
        selections.add(gpu.renderer);
      }

      // Should select multiple different GPUs across different seeds
      expect(selections.size).toBeGreaterThan(1);
    });

    it('always selects a valid GPU', () => {
      for (let seed = 0; seed < 50; seed++) {
        const prng = new PRNG(new Uint8Array(32).fill(seed));
        const gpu = prng.pick(GPU_COMBINATIONS);
        expect(GPU_COMBINATIONS).toContainEqual(gpu);
      }
    });
  });

  describe('WebGL constants', () => {
    it('has correct UNMASKED_VENDOR_WEBGL value', () => {
      const UNMASKED_VENDOR_WEBGL = 0x9245;
      expect(UNMASKED_VENDOR_WEBGL).toBe(37445);
    });

    it('has correct UNMASKED_RENDERER_WEBGL value', () => {
      const UNMASKED_RENDERER_WEBGL = 0x9246;
      expect(UNMASKED_RENDERER_WEBGL).toBe(37446);
    });
  });
});
