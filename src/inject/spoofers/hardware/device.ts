/**
 * Device Spoofer - Spoofs hardware concurrency and device memory
 * Uses assigned profile for guaranteed uniqueness across containers
 */

import type { ProtectionMode, AssignedProfileData } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { farbleDeviceMemory, farbleHardwareConcurrency } from '@/lib/farbling';

/**
 * Initialize device spoofing
 */
export function initDeviceSpoofer(
  deviceMemoryMode: ProtectionMode,
  hardwareConcurrencyMode: ProtectionMode,
  prng: PRNG,
  assignedProfile?: AssignedProfileData
): void {
  // Spoof deviceMemory - use assigned profile for guaranteed uniqueness
  if (deviceMemoryMode !== 'off' && 'deviceMemory' in navigator) {
    let spoofedMemory: number;

    if (assignedProfile?.deviceMemory) {
      // Use assigned profile value - guaranteed unique across containers
      spoofedMemory = assignedProfile.deviceMemory;
    } else if (deviceMemoryMode === 'block') {
      spoofedMemory = 8;
    } else {
      spoofedMemory = farbleDeviceMemory(prng);
    }

    Object.defineProperty(navigator, 'deviceMemory', {
      value: spoofedMemory,
      configurable: true,
      enumerable: true,
    });

    console.log('[ChameleonContainers] Device memory spoofed:', spoofedMemory);
  }

  // Spoof hardwareConcurrency - use assigned profile for guaranteed uniqueness
  if (hardwareConcurrencyMode !== 'off') {
    let spoofedConcurrency: number;

    if (assignedProfile?.hardwareConcurrency) {
      // Use assigned profile value - guaranteed unique across containers
      spoofedConcurrency = assignedProfile.hardwareConcurrency;
    } else if (hardwareConcurrencyMode === 'block') {
      spoofedConcurrency = 4;
    } else {
      spoofedConcurrency = farbleHardwareConcurrency(prng);
    }

    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: spoofedConcurrency,
      configurable: true,
      enumerable: true,
    });

    console.log('[ChameleonContainers] Hardware concurrency spoofed:', spoofedConcurrency);
  }

  // Spoof maxTouchPoints (to match profile)
  const maxTouchPoints = prng.pick([0, 0, 0, 0, 10]);

  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    configurable: true,
    enumerable: true,
  });
}
