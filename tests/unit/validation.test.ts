/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  isObject,
  isNonEmptyString,
  isNumber,
  isPositiveInteger,
  isValidTabId,
  isValidContainerId,
  isValidUrl,
  isValidDomain,
  isValidProtectionMode,
  isValidWebRTCMode,
  isValidProtectionLevel,
  validateMessageType,
  validateGetSettingsMessage,
  validateFingerprintAccess,
  validateFingerprintSummary,
  sanitizeString,
  validateAndSanitize,
} from '../../src/lib/validation';

describe('validation utilities', () => {
  describe('isObject', () => {
    it('returns true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
    });

    it('returns false for non-objects', () => {
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject([])).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('returns true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString(' ')).toBe(true);
    });

    it('returns false for empty strings and non-strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('returns true for valid numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(123)).toBe(true);
      expect(isNumber(-45.67)).toBe(true);
      expect(isNumber(Infinity)).toBe(true);
    });

    it('returns false for NaN and non-numbers', () => {
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber('123')).toBe(false);
      expect(isNumber(null)).toBe(false);
    });
  });

  describe('isPositiveInteger', () => {
    it('returns true for positive integers', () => {
      expect(isPositiveInteger(1)).toBe(true);
      expect(isPositiveInteger(100)).toBe(true);
    });

    it('returns false for zero, negative, and non-integers', () => {
      expect(isPositiveInteger(0)).toBe(false);
      expect(isPositiveInteger(-1)).toBe(false);
      expect(isPositiveInteger(1.5)).toBe(false);
    });
  });

  describe('isValidTabId', () => {
    it('returns true for valid tab IDs', () => {
      expect(isValidTabId(0)).toBe(true);
      expect(isValidTabId(1)).toBe(true);
      expect(isValidTabId(12345)).toBe(true);
    });

    it('returns false for invalid tab IDs', () => {
      expect(isValidTabId(-1)).toBe(false);
      expect(isValidTabId(1.5)).toBe(false);
      expect(isValidTabId('1')).toBe(false);
    });
  });

  describe('isValidContainerId', () => {
    it('returns true for valid container IDs', () => {
      expect(isValidContainerId('firefox-default')).toBe(true);
      expect(isValidContainerId('firefox-container-1')).toBe(true);
      expect(isValidContainerId('firefox-container-123')).toBe(true);
    });

    it('returns false for invalid container IDs', () => {
      expect(isValidContainerId('')).toBe(false);
      expect(isValidContainerId('invalid')).toBe(false);
      expect(isValidContainerId('firefox-container-')).toBe(false);
      expect(isValidContainerId('firefox-container-abc')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('returns true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('file:///path/to/file')).toBe(true);
    });

    it('returns false for invalid URLs', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('http://')).toBe(false);
    });
  });

  describe('isValidDomain', () => {
    it('returns true for valid domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('sub.example.com')).toBe(true);
      expect(isValidDomain('localhost')).toBe(true);
    });

    it('returns false for invalid domains', () => {
      expect(isValidDomain('')).toBe(false);
      expect(isValidDomain('.example.com')).toBe(false);
      expect(isValidDomain('example..com')).toBe(false);
    });
  });

  describe('isValidProtectionMode', () => {
    it('returns true for valid modes', () => {
      expect(isValidProtectionMode('off')).toBe(true);
      expect(isValidProtectionMode('noise')).toBe(true);
      expect(isValidProtectionMode('block')).toBe(true);
    });

    it('returns false for invalid modes', () => {
      expect(isValidProtectionMode('invalid')).toBe(false);
      expect(isValidProtectionMode('')).toBe(false);
    });
  });

  describe('isValidWebRTCMode', () => {
    it('returns true for valid WebRTC modes', () => {
      expect(isValidWebRTCMode('off')).toBe(true);
      expect(isValidWebRTCMode('public_only')).toBe(true);
      expect(isValidWebRTCMode('block')).toBe(true);
    });

    it('returns false for invalid modes', () => {
      expect(isValidWebRTCMode('noise')).toBe(false);
      expect(isValidWebRTCMode('')).toBe(false);
    });
  });

  describe('isValidProtectionLevel', () => {
    it('returns true for valid protection levels', () => {
      expect(isValidProtectionLevel(0)).toBe(true);
      expect(isValidProtectionLevel(1)).toBe(true);
      expect(isValidProtectionLevel(2)).toBe(true);
      expect(isValidProtectionLevel(3)).toBe(true);
    });

    it('returns false for invalid levels', () => {
      expect(isValidProtectionLevel(-1)).toBe(false);
      expect(isValidProtectionLevel(4)).toBe(false);
      expect(isValidProtectionLevel('1')).toBe(false);
    });
  });

  describe('validateMessageType', () => {
    it('validates known message types', () => {
      const result = validateMessageType({ type: 'GET_SETTINGS' });
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ type: 'GET_SETTINGS' });
    });

    it('rejects unknown message types', () => {
      const result = validateMessageType({ type: 'UNKNOWN_TYPE' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown message type');
    });

    it('rejects non-object messages', () => {
      const result = validateMessageType('string');
      expect(result.valid).toBe(false);
    });

    it('rejects messages without type', () => {
      const result = validateMessageType({ data: 'value' });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateGetSettingsMessage', () => {
    it('validates valid message', () => {
      const result = validateGetSettingsMessage({
        containerId: 'firefox-container-1',
      });
      expect(result.valid).toBe(true);
      expect(result.data?.containerId).toBe('firefox-container-1');
    });

    it('validates message with domain', () => {
      const result = validateGetSettingsMessage({
        containerId: 'firefox-container-1',
        domain: 'example.com',
      });
      expect(result.valid).toBe(true);
      expect(result.data?.domain).toBe('example.com');
    });

    it('rejects invalid containerId', () => {
      const result = validateGetSettingsMessage({
        containerId: 'invalid',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateFingerprintAccess', () => {
    it('validates valid fingerprint access', () => {
      const result = validateFingerprintAccess({
        api: 'toDataURL',
        category: 'Canvas',
        timestamp: Date.now(),
        blocked: false,
        spoofed: true,
      });
      expect(result.valid).toBe(true);
      expect(result.data?.api).toBe('toDataURL');
    });

    it('rejects missing required fields', () => {
      expect(validateFingerprintAccess({}).valid).toBe(false);
      expect(validateFingerprintAccess({ api: 'test' }).valid).toBe(false);
      expect(validateFingerprintAccess({ api: 'test', category: 'Canvas' }).valid).toBe(false);
    });
  });

  describe('validateFingerprintSummary', () => {
    it('validates valid summary', () => {
      const result = validateFingerprintSummary({
        Canvas: { count: 5, blocked: 0, spoofed: 5 },
        WebGL: { count: 3, blocked: 1, spoofed: 2 },
      });
      expect(result.valid).toBe(true);
      expect(result.data?.Canvas.count).toBe(5);
    });

    it('provides defaults for missing fields', () => {
      const result = validateFingerprintSummary({
        Canvas: {},
      });
      expect(result.valid).toBe(true);
      expect(result.data?.Canvas.count).toBe(0);
      expect(result.data?.Canvas.blocked).toBe(0);
    });
  });

  describe('sanitizeString', () => {
    it('escapes HTML entities', () => {
      expect(sanitizeString('<script>')).toBe('&lt;script&gt;');
      expect(sanitizeString('"quotes"')).toBe('&quot;quotes&quot;');
      expect(sanitizeString("'apostrophe'")).toBe('&#039;apostrophe&#039;');
      expect(sanitizeString('a & b')).toBe('a &amp; b');
    });

    it('handles normal strings', () => {
      expect(sanitizeString('Hello World')).toBe('Hello World');
    });
  });

  describe('validateAndSanitize', () => {
    it('validates and sanitizes strings', () => {
      const result = validateAndSanitize('<script>alert("xss")</script>');
      expect(result.valid).toBe(true);
      expect(result.data).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('rejects empty strings', () => {
      const result = validateAndSanitize('');
      expect(result.valid).toBe(false);
    });

    it('rejects strings exceeding max length', () => {
      const result = validateAndSanitize('a'.repeat(1001), 1000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum length');
    });
  });
});
