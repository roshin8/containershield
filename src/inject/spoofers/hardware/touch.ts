/**
 * Touch Events Spoofer
 *
 * Touch capability detection can reveal device type
 * and is used for fingerprinting.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';

/**
 * Initialize Touch events spoofing
 */
export function initTouchSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  // Common desktop value (no touch)
  const spoofedMaxTouchPoints = 0;
  const spoofedTouchSupport = false;

  // Spoof maxTouchPoints
  try {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: function () {
        logAccess('navigator.maxTouchPoints', { spoofed: true });

        if (mode === 'block') {
          return 0;
        }

        // Return consistent value based on profile
        return spoofedMaxTouchPoints;
      },
      configurable: true,
    });
  } catch {
    // Can't override
  }

  // Spoof 'ontouchstart' in window check
  if (mode === 'block' || !spoofedTouchSupport) {
    try {
      Object.defineProperty(window, 'ontouchstart', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    } catch {
      // Can't override
    }
  }

  // Spoof TouchEvent constructor
  if (typeof TouchEvent !== 'undefined' && mode === 'block') {
    try {
      Object.defineProperty(window, 'TouchEvent', {
        value: undefined,
        configurable: true,
      });
    } catch {
      // Can't override
    }
  }

  // Spoof Touch constructor
  if (typeof Touch !== 'undefined' && mode === 'block') {
    try {
      Object.defineProperty(window, 'Touch', {
        value: undefined,
        configurable: true,
      });
    } catch {
      // Can't override
    }
  }

  // Spoof 'orientation' in window (mobile indicator)
  if (mode === 'block') {
    try {
      Object.defineProperty(window, 'orientation', {
        value: undefined,
        configurable: true,
      });
    } catch {
      // Can't override
    }
  }

  // Spoof screen.orientation to be consistent
  if ('orientation' in screen) {
    const originalOrientation = screen.orientation;

    try {
      Object.defineProperty(screen, 'orientation', {
        get: function () {
          logAccess('screen.orientation', { spoofed: true });

          if (mode === 'block') {
            return {
              type: 'landscape-primary',
              angle: 0,
              onchange: null,
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => true,
              lock: async () => {},
              unlock: () => {},
            };
          }

          return originalOrientation;
        },
        configurable: true,
      });
    } catch {
      // Can't override
    }
  }

  console.log('[ContainerShield] Touch events spoofer initialized');
}
