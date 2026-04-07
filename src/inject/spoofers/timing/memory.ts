/**
 * Memory API Spoofer
 *
 * performance.measureUserAgentSpecificMemory() and performance.memory
 * reveal memory layout that can fingerprint browser build and extensions.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { overrideMethod, overrideGetterWithValue } from '@/lib/stealth';
import { logAccess } from '../../monitor/fingerprint-monitor';

export function initMemorySpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  // performance.measureUserAgentSpecificMemory (Chrome)
  if ('measureUserAgentSpecificMemory' in performance) {
    overrideMethod(performance as any, 'measureUserAgentSpecificMemory', () => {
      const fakeBytes = prng.nextInt(50, 200) * 1024 * 1024;
      logAccess('performance.memory', { spoofed: true, value: `${Math.round(fakeBytes / 1024 / 1024)}MB` });
      return Promise.resolve({
        bytes: fakeBytes,
        breakdown: [{
          bytes: fakeBytes,
          attribution: [{ url: window.location.href, scope: 'Window' }],
          types: ['JS'],
        }],
      });
    });
  }

  // performance.memory (Chrome non-standard)
  if ('memory' in performance) {
    const fakeMemory = {
      jsHeapSizeLimit: 2172649472,
      totalJSHeapSize: prng.nextInt(10, 50) * 1024 * 1024,
      usedJSHeapSize: prng.nextInt(5, 30) * 1024 * 1024,
    };

    logAccess('performance.memory', { spoofed: true, value: `${Math.round(fakeMemory.usedJSHeapSize / 1024 / 1024)}MB heap` });
    try {
      Object.defineProperty(performance, 'memory', {
        get: () => fakeMemory,
        configurable: true,
      });
    } catch {
      // May not be configurable
    }
  }
}
