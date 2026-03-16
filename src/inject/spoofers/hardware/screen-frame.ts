/**
 * Screen Frame Spoofer
 *
 * Spoofs window position and outer dimensions which can be used for fingerprinting.
 * - window.screenX / window.screenLeft
 * - window.screenY / window.screenTop
 * - window.outerWidth
 * - window.outerHeight
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';

/**
 * Initialize screen frame spoofing
 */
export function initScreenFrameSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  // Generate consistent spoofed values
  const spoofedScreenX = mode === 'block' ? 0 : Math.floor(prng.random() * 100);
  const spoofedScreenY = mode === 'block' ? 0 : Math.floor(prng.random() * 100);

  // Outer dimensions should be slightly larger than inner
  const innerWidth = window.innerWidth;
  const innerHeight = window.innerHeight;
  const spoofedOuterWidth = mode === 'block' ? innerWidth : innerWidth + Math.floor(prng.random() * 20) + 10;
  const spoofedOuterHeight = mode === 'block' ? innerHeight : innerHeight + Math.floor(prng.random() * 100) + 50;

  // Spoof window.screenX
  try {
    Object.defineProperty(window, 'screenX', {
      get: function () {
        logAccess('window.screenX', { spoofed: true });
        return spoofedScreenX;
      },
      configurable: true,
    });
  } catch {
    // Can't override
  }

  // Spoof window.screenLeft (alias for screenX)
  try {
    Object.defineProperty(window, 'screenLeft', {
      get: function () {
        logAccess('window.screenLeft', { spoofed: true });
        return spoofedScreenX;
      },
      configurable: true,
    });
  } catch {
    // Can't override
  }

  // Spoof window.screenY
  try {
    Object.defineProperty(window, 'screenY', {
      get: function () {
        logAccess('window.screenY', { spoofed: true });
        return spoofedScreenY;
      },
      configurable: true,
    });
  } catch {
    // Can't override
  }

  // Spoof window.screenTop (alias for screenY)
  try {
    Object.defineProperty(window, 'screenTop', {
      get: function () {
        logAccess('window.screenTop', { spoofed: true });
        return spoofedScreenY;
      },
      configurable: true,
    });
  } catch {
    // Can't override
  }

  // Spoof window.outerWidth
  try {
    Object.defineProperty(window, 'outerWidth', {
      get: function () {
        logAccess('window.outerWidth', { spoofed: true });
        return spoofedOuterWidth;
      },
      configurable: true,
    });
  } catch {
    // Can't override
  }

  // Spoof window.outerHeight
  try {
    Object.defineProperty(window, 'outerHeight', {
      get: function () {
        logAccess('window.outerHeight', { spoofed: true });
        return spoofedOuterHeight;
      },
      configurable: true,
    });
  } catch {
    // Can't override
  }

  console.log('[ContainerShield] Screen frame spoofer initialized');
}
