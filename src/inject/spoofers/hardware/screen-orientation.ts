/**
 * Screen Orientation Spoofer
 *
 * Spoofs screen.orientation API which can reveal device orientation state.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';

/**
 * Initialize screen orientation spoofing
 */
export function initScreenOrientationSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  if (!screen.orientation) return;

  const originalOrientation = screen.orientation;

  // Common orientation types
  const orientationTypes: OrientationType[] = [
    'landscape-primary',
    'portrait-primary',
  ];

  // Select consistent orientation
  const typeIndex = Math.floor(prng.random() * orientationTypes.length);
  const spoofedType = mode === 'block' ? 'landscape-primary' : orientationTypes[typeIndex];
  const spoofedAngle = spoofedType.startsWith('landscape') ? 0 : 90;

  // Create spoofed orientation object
  const spoofedOrientation = {
    get type() {
      logAccess('screen.orientation.type', { spoofed: true });
      return spoofedType;
    },
    get angle() {
      logAccess('screen.orientation.angle', { spoofed: true });
      return spoofedAngle;
    },
    addEventListener: originalOrientation.addEventListener.bind(originalOrientation),
    removeEventListener: originalOrientation.removeEventListener.bind(originalOrientation),
    dispatchEvent: originalOrientation.dispatchEvent.bind(originalOrientation),
    lock: function (orientation: OrientationLockType): Promise<void> {
      logAccess('screen.orientation.lock', { spoofed: true });
      if (mode === 'block') {
        return Promise.reject(new DOMException('Orientation lock denied', 'NotSupportedError'));
      }
      return originalOrientation.lock(orientation);
    },
    unlock: function (): void {
      logAccess('screen.orientation.unlock', { spoofed: true });
      if (mode !== 'block') {
        originalOrientation.unlock();
      }
    },
  };

  // Replace screen.orientation
  try {
    Object.defineProperty(screen, 'orientation', {
      get: function () {
        logAccess('screen.orientation', { spoofed: true });
        return spoofedOrientation;
      },
      configurable: true,
    });
  } catch {
    // Can't override
  }

  console.log('[ContainerShield] Screen orientation spoofer initialized');
}
