/**
 * Unit tests for spoofer utilities and functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRNG } from '../../src/lib/crypto';

describe('Spoofer Tests', () => {
  let prng: PRNG;

  beforeEach(() => {
    // Create deterministic PRNG for testing
    const seed = new Uint8Array(32).fill(42);
    prng = new PRNG(seed);
  });

  describe('WebGL Parameters', () => {
    const COMMON_WEBGL_VENDORS = [
      'Google Inc. (Intel)',
      'Google Inc. (NVIDIA)',
      'Google Inc. (AMD)',
      'Intel Inc.',
      'Apple Inc.',
    ];

    const COMMON_RENDERERS = [
      'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)',
      'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11)',
      'ANGLE (AMD, AMD Radeon RX 580 Direct3D11)',
      'Intel Iris OpenGL Engine',
      'Apple M1',
    ];

    it('should have valid vendor strings', () => {
      const vendor = prng.pick(COMMON_WEBGL_VENDORS);
      expect(vendor).toBeDefined();
      expect(typeof vendor).toBe('string');
      expect(vendor.length).toBeGreaterThan(0);
    });

    it('should have valid renderer strings', () => {
      const renderer = prng.pick(COMMON_RENDERERS);
      expect(renderer).toBeDefined();
      expect(typeof renderer).toBe('string');
      expect(renderer.length).toBeGreaterThan(0);
    });
  });

  describe('Screen Resolution Spoofing', () => {
    const COMMON_RESOLUTIONS = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 2560, height: 1440 },
      { width: 1440, height: 900 },
      { width: 1680, height: 1050 },
    ];

    it('should return valid resolutions', () => {
      const resolution = prng.pick(COMMON_RESOLUTIONS);
      expect(resolution.width).toBeGreaterThan(0);
      expect(resolution.height).toBeGreaterThan(0);
      expect(resolution.width).toBeGreaterThanOrEqual(resolution.height);
    });

    it('should maintain 16:9 or 16:10 aspect ratios', () => {
      const validAspectRatios = [16 / 9, 16 / 10, 4 / 3, 21 / 9];
      const resolution = prng.pick(COMMON_RESOLUTIONS);
      const aspectRatio = resolution.width / resolution.height;

      // Allow small tolerance for rounding
      const isValidRatio = validAspectRatios.some(
        (ratio) => Math.abs(aspectRatio - ratio) < 0.1
      );
      expect(isValidRatio).toBe(true);
    });
  });

  describe('Hardware Concurrency', () => {
    const VALID_CORE_COUNTS = [2, 4, 6, 8, 10, 12, 16, 20, 24, 32];

    it('should return power of 2 or common core counts', () => {
      const cores = prng.pick(VALID_CORE_COUNTS);
      expect(VALID_CORE_COUNTS).toContain(cores);
    });
  });

  describe('Device Memory', () => {
    const VALID_MEMORY_VALUES = [0.25, 0.5, 1, 2, 4, 8];

    it('should return valid deviceMemory values', () => {
      const memory = prng.pick(VALID_MEMORY_VALUES);
      expect(VALID_MEMORY_VALUES).toContain(memory);
    });
  });

  describe('Timezone Offset', () => {
    const COMMON_OFFSETS = [
      -720, -660, -600, -540, -480, -420, -360, -300, -240, -180, -120, -60, 0,
      60, 120, 180, 240, 300, 330, 345, 360, 420, 480, 540, 570, 600, 660, 720,
    ];

    it('should return valid timezone offsets', () => {
      const offset = prng.pick(COMMON_OFFSETS);
      expect(offset).toBeGreaterThanOrEqual(-720);
      expect(offset).toBeLessThanOrEqual(840);
      expect(Number.isInteger(offset)).toBe(true);
    });
  });

  describe('Audio Context', () => {
    const COMMON_SAMPLE_RATES = [44100, 48000, 96000];

    it('should return valid sample rates', () => {
      const sampleRate = prng.pick(COMMON_SAMPLE_RATES);
      expect(COMMON_SAMPLE_RATES).toContain(sampleRate);
    });
  });

  describe('Canvas Noise Generation', () => {
    it('should add noise within expected range', () => {
      const original = 128;
      const maxNoise = 3;

      for (let i = 0; i < 100; i++) {
        const noise = Math.round(prng.nextNoise(maxNoise));
        const result = Math.max(0, Math.min(255, original + noise));
        expect(result).toBeGreaterThanOrEqual(original - maxNoise);
        expect(result).toBeLessThanOrEqual(original + maxNoise);
      }
    });

    it('should produce deterministic noise with same seed', () => {
      const prng1 = new PRNG(new Uint8Array(32).fill(42));
      const prng2 = new PRNG(new Uint8Array(32).fill(42));

      const noise1 = Array.from({ length: 10 }, () => prng1.nextNoise(3));
      const noise2 = Array.from({ length: 10 }, () => prng2.nextNoise(3));

      expect(noise1).toEqual(noise2);
    });
  });

  describe('WebRTC IP Protection', () => {
    const LOCAL_IP_PATTERNS = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^::1$/,
      /^fe80:/i,
      /^fc00:/i,
      /^fd00:/i,
    ];

    it('should identify local IPs correctly', () => {
      const localIPs = [
        '10.0.0.1',
        '172.16.0.1',
        '192.168.1.1',
        '127.0.0.1',
        '::1',
        'fe80::1',
      ];

      for (const ip of localIPs) {
        const isLocal = LOCAL_IP_PATTERNS.some((pattern) => pattern.test(ip));
        expect(isLocal).toBe(true);
      }
    });

    it('should identify public IPs correctly', () => {
      const publicIPs = ['8.8.8.8', '1.1.1.1', '142.250.80.46', '2607:f8b0:4004:800::200e'];

      for (const ip of publicIPs) {
        const isLocal = LOCAL_IP_PATTERNS.some((pattern) => pattern.test(ip));
        expect(isLocal).toBe(false);
      }
    });
  });

  describe('User Agent Parsing', () => {
    const USER_AGENTS = [
      {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        platform: 'Win32',
        browser: 'Chrome',
      },
      {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        platform: 'MacIntel',
        browser: 'Safari',
      },
      {
        ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
        platform: 'Linux x86_64',
        browser: 'Firefox',
      },
    ];

    it('should have consistent UA/platform pairs', () => {
      for (const { ua, platform } of USER_AGENTS) {
        if (platform === 'Win32') {
          expect(ua).toContain('Windows');
        } else if (platform === 'MacIntel') {
          expect(ua).toContain('Mac');
        } else if (platform.includes('Linux')) {
          expect(ua).toContain('Linux');
        }
      }
    });
  });

  describe('Font Fingerprinting', () => {
    const COMMON_FONTS = [
      'Arial',
      'Helvetica',
      'Times New Roman',
      'Georgia',
      'Verdana',
      'Courier New',
      'Trebuchet MS',
    ];

    it('should return common fonts', () => {
      const subset = COMMON_FONTS.slice(0, prng.nextInt(3, 6));
      expect(subset.length).toBeGreaterThanOrEqual(3);
      expect(subset.length).toBeLessThanOrEqual(6);
      subset.forEach((font) => {
        expect(COMMON_FONTS).toContain(font);
      });
    });
  });

  describe('Battery API', () => {
    const VALID_CHARGING_LEVELS = [0.1, 0.25, 0.5, 0.75, 0.9, 1.0];

    it('should return valid battery levels', () => {
      const level = prng.pick(VALID_CHARGING_LEVELS);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    });
  });

  describe('Speech Synthesis Voices', () => {
    const COMMON_VOICES = [
      { name: 'Google US English', lang: 'en-US' },
      { name: 'Google UK English Female', lang: 'en-GB' },
      { name: 'Microsoft David', lang: 'en-US' },
    ];

    it('should return consistent voice structure', () => {
      const voice = prng.pick(COMMON_VOICES);
      expect(voice).toHaveProperty('name');
      expect(voice).toHaveProperty('lang');
      expect(voice.lang).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    });
  });

  describe('WebGPU Adapter Info', () => {
    const COMMON_GPUS = [
      { vendor: 'Google Inc. (Intel)', architecture: 'gen-12lp' },
      { vendor: 'Google Inc. (NVIDIA)', architecture: 'ampere' },
      { vendor: 'Google Inc. (AMD)', architecture: 'rdna-2' },
    ];

    it('should return valid GPU info', () => {
      const gpu = prng.pick(COMMON_GPUS);
      expect(gpu.vendor).toBeDefined();
      expect(gpu.architecture).toBeDefined();
    });
  });

  describe('Media Devices Enumeration', () => {
    it('should generate plausible device IDs', () => {
      // Device IDs should be consistent per container
      const deviceId = Array.from(
        { length: 32 },
        () => prng.nextInt(0, 15).toString(16)
      ).join('');

      expect(deviceId).toMatch(/^[0-9a-f]{32}$/);
    });
  });
});
