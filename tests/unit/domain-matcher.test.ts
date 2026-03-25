/**
 * Unit tests for domain matcher utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parsePattern,
  matchesDomain,
  matchesAnyPattern,
  validatePattern,
  DomainMatcher,
  PRESET_PATTERNS,
} from '../../src/lib/domain-matcher';

describe('Domain Matcher', () => {
  describe('parsePattern', () => {
    it('parses exact domain patterns', () => {
      const pattern = parsePattern('example.com');
      expect(pattern.type).toBe('exact');
      expect(pattern.pattern).toBe('example.com');
    });

    it('parses wildcard patterns', () => {
      const pattern = parsePattern('*.example.com');
      expect(pattern.type).toBe('wildcard');
      expect(pattern.compiled).toBeInstanceOf(RegExp);
    });

    it('parses suffix patterns', () => {
      const pattern = parsePattern('.example.com');
      expect(pattern.type).toBe('suffix');
      expect(pattern.pattern).toBe('.example.com');
    });

    it('parses regex patterns', () => {
      const pattern = parsePattern('/example\\.com$/');
      expect(pattern.type).toBe('regex');
      expect(pattern.compiled).toBeInstanceOf(RegExp);
    });

    it('normalizes to lowercase', () => {
      const pattern = parsePattern('EXAMPLE.COM');
      expect(pattern.pattern).toBe('example.com');
    });
  });

  describe('matchesDomain', () => {
    describe('exact matching', () => {
      it('matches exact domain', () => {
        const pattern = parsePattern('example.com');
        expect(matchesDomain('example.com', pattern)).toBe(true);
        expect(matchesDomain('EXAMPLE.COM', pattern)).toBe(true);
      });

      it('does not match different domains', () => {
        const pattern = parsePattern('example.com');
        expect(matchesDomain('example.org', pattern)).toBe(false);
        expect(matchesDomain('sub.example.com', pattern)).toBe(false);
      });
    });

    describe('wildcard matching', () => {
      it('matches wildcard subdomains', () => {
        const pattern = parsePattern('*.example.com');
        expect(matchesDomain('sub.example.com', pattern)).toBe(true);
        expect(matchesDomain('deep.sub.example.com', pattern)).toBe(true);
      });

      it('handles complex wildcards', () => {
        const pattern = parsePattern('api-*.example.com');
        expect(matchesDomain('api-v1.example.com', pattern)).toBe(true);
        expect(matchesDomain('api-v2.example.com', pattern)).toBe(true);
        expect(matchesDomain('web.example.com', pattern)).toBe(false);
      });

      it('matches multiple wildcards', () => {
        const pattern = parsePattern('*.*.example.com');
        expect(matchesDomain('a.b.example.com', pattern)).toBe(true);
      });
    });

    describe('suffix matching', () => {
      it('matches domain and subdomains', () => {
        const pattern = parsePattern('.example.com');
        expect(matchesDomain('example.com', pattern)).toBe(true);
        expect(matchesDomain('sub.example.com', pattern)).toBe(true);
        expect(matchesDomain('deep.sub.example.com', pattern)).toBe(true);
      });

      it('does not match partial matches', () => {
        const pattern = parsePattern('.example.com');
        expect(matchesDomain('notexample.com', pattern)).toBe(false);
        expect(matchesDomain('example.com.evil.com', pattern)).toBe(false);
      });
    });

    describe('regex matching', () => {
      it('matches regex patterns', () => {
        const pattern = parsePattern('/^(www\\.)?example\\.com$/');
        expect(matchesDomain('example.com', pattern)).toBe(true);
        expect(matchesDomain('www.example.com', pattern)).toBe(true);
        expect(matchesDomain('sub.example.com', pattern)).toBe(false);
      });

      it('is case insensitive', () => {
        const pattern = parsePattern('/example/');
        expect(matchesDomain('EXAMPLE.COM', pattern)).toBe(true);
      });
    });
  });

  describe('matchesAnyPattern', () => {
    it('returns true if any pattern matches', () => {
      const patterns = [
        parsePattern('example.com'),
        parsePattern('*.google.com'),
      ];
      expect(matchesAnyPattern('example.com', patterns)).toBe(true);
      expect(matchesAnyPattern('mail.google.com', patterns)).toBe(true);
    });

    it('returns false if no pattern matches', () => {
      const patterns = [
        parsePattern('example.com'),
        parsePattern('*.google.com'),
      ];
      expect(matchesAnyPattern('facebook.com', patterns)).toBe(false);
    });
  });

  describe('validatePattern', () => {
    it('accepts valid patterns', () => {
      expect(validatePattern('example.com').valid).toBe(true);
      expect(validatePattern('*.example.com').valid).toBe(true);
      expect(validatePattern('.example.com').valid).toBe(true);
      expect(validatePattern('/example/').valid).toBe(true);
    });

    it('rejects empty patterns', () => {
      expect(validatePattern('').valid).toBe(false);
      expect(validatePattern('   ').valid).toBe(false);
    });

    it('rejects invalid regex', () => {
      const result = validatePattern('/[invalid/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid regular expression');
    });

    it('rejects patterns with invalid characters', () => {
      expect(validatePattern('example .com').valid).toBe(false);
      expect(validatePattern('example<script>.com').valid).toBe(false);
    });
  });

  describe('DomainMatcher class', () => {
    let matcher: DomainMatcher;

    beforeEach(() => {
      matcher = new DomainMatcher([
        'example.com',
        '*.google.com',
        '.microsoft.com',
      ]);
    });

    it('matches domains correctly', () => {
      expect(matcher.matches('example.com')).toBe(true);
      expect(matcher.matches('mail.google.com')).toBe(true);
      expect(matcher.matches('microsoft.com')).toBe(true);
      expect(matcher.matches('office.microsoft.com')).toBe(true);
    });

    it('does not match non-matching domains', () => {
      expect(matcher.matches('facebook.com')).toBe(false);
      expect(matcher.matches('notmicrosoft.com')).toBe(false);
    });

    it('supports adding patterns', () => {
      matcher.addPattern('facebook.com');
      expect(matcher.matches('facebook.com')).toBe(true);
      expect(matcher.size).toBe(4);
    });

    it('supports removing patterns', () => {
      matcher.removePattern('example.com');
      expect(matcher.matches('example.com')).toBe(false);
      expect(matcher.size).toBe(2);
    });

    it('returns all patterns', () => {
      const patterns = matcher.getPatterns();
      expect(patterns).toHaveLength(3);
      expect(patterns).toContain('example.com');
    });
  });

  describe('PRESET_PATTERNS', () => {
    it('has banking patterns', () => {
      expect(PRESET_PATTERNS.banking.length).toBeGreaterThan(0);
      const matcher = new DomainMatcher(PRESET_PATTERNS.banking);
      expect(matcher.matches('www.chase.com')).toBe(true);
    });

    it('has streaming patterns', () => {
      expect(PRESET_PATTERNS.streaming.length).toBeGreaterThan(0);
      const matcher = new DomainMatcher(PRESET_PATTERNS.streaming);
      expect(matcher.matches('www.netflix.com')).toBe(true);
    });

    it('has video conference patterns', () => {
      expect(PRESET_PATTERNS.videoConference.length).toBeGreaterThan(0);
      const matcher = new DomainMatcher(PRESET_PATTERNS.videoConference);
      expect(matcher.matches('us02web.zoom.us')).toBe(true);
    });
  });
});
