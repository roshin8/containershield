/**
 * Screen Spoofer - Spoofs screen dimensions and related properties
 * Uses assigned profile for guaranteed uniqueness across containers
 */

import type { ProtectionMode, AssignedProfileData } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { farbleScreenResolution, COMMON_SCREEN_RESOLUTIONS } from '@/lib/farbling';

/**
 * Screen configuration from assigned profile
 */
interface AssignedScreenConfig {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  devicePixelRatio: number;
}

/**
 * Initialize screen spoofing
 */
export function initScreenSpoofer(
  mode: ProtectionMode,
  prng: PRNG,
  assignedScreen?: AssignedScreenConfig
): void {
  if (mode === 'off') return;

  // Use assigned profile for guaranteed uniqueness, or fall back to random
  let targetScreen: { width: number; height: number };
  let availWidth: number;
  let availHeight: number;
  let colorDepth: number;
  let pixelDepth: number;
  let devicePixelRatio: number;

  if (assignedScreen && assignedScreen.width && assignedScreen.height) {
    // Use assigned profile - guaranteed unique across containers
    targetScreen = { width: assignedScreen.width, height: assignedScreen.height };
    availWidth = assignedScreen.availWidth;
    availHeight = assignedScreen.availHeight;
    colorDepth = assignedScreen.colorDepth;
    pixelDepth = assignedScreen.pixelDepth;
    devicePixelRatio = assignedScreen.devicePixelRatio;
  } else if (mode === 'noise') {
    // Fallback to random
    targetScreen = farbleScreenResolution(prng);
    colorDepth = prng.pick([24, 32]);
    pixelDepth = colorDepth;
    devicePixelRatio = prng.pick([1, 1.25, 1.5, 2]);
    availWidth = targetScreen.width;
    availHeight = targetScreen.height - prng.nextInt(30, 50);
  } else {
    // Block mode - use a common resolution
    targetScreen = COMMON_SCREEN_RESOLUTIONS[0];
    colorDepth = 24;
    pixelDepth = 24;
    devicePixelRatio = 1;
    availWidth = targetScreen.width;
    availHeight = targetScreen.height - 40;
  }

  // Inner dimensions (viewport) - derived from screen
  const innerWidth = Math.min(targetScreen.width, prng.nextInt(1200, targetScreen.width));
  const innerHeight = Math.min(availHeight, prng.nextInt(700, availHeight));

  // Outer dimensions (including browser chrome)
  const outerWidth = innerWidth + prng.nextInt(0, 20);
  const outerHeight = innerHeight + prng.nextInt(70, 120);

  // Override screen properties
  Object.defineProperties(screen, {
    width: { value: targetScreen.width, configurable: true },
    height: { value: targetScreen.height, configurable: true },
    availWidth: { value: availWidth, configurable: true },
    availHeight: { value: availHeight, configurable: true },
    availLeft: { value: 0, configurable: true },
    availTop: { value: 0, configurable: true },
    colorDepth: { value: colorDepth, configurable: true },
    pixelDepth: { value: pixelDepth, configurable: true },
  });

  // Override window properties
  Object.defineProperties(window, {
    innerWidth: { value: innerWidth, configurable: true },
    innerHeight: { value: innerHeight, configurable: true },
    outerWidth: { value: outerWidth, configurable: true },
    outerHeight: { value: outerHeight, configurable: true },
    devicePixelRatio: { value: devicePixelRatio, configurable: true },
    screenX: { value: 0, configurable: true },
    screenY: { value: 0, configurable: true },
    screenLeft: { value: 0, configurable: true },
    screenTop: { value: prng.nextInt(0, 30), configurable: true },
  });

  // Override matchMedia for screen-related queries
  const originalMatchMedia = window.matchMedia;

  window.matchMedia = function (query: string): MediaQueryList {
    // Handle width/height queries
    const widthMatch = query.match(/\((?:min-|max-)?width:\s*(\d+)px\)/);
    const heightMatch = query.match(/\((?:min-|max-)?height:\s*(\d+)px\)/);

    if (widthMatch || heightMatch) {
      // Let it use our spoofed values
      return originalMatchMedia.call(window, query);
    }

    return originalMatchMedia.call(window, query);
  };

  console.log(
    '[ChameleonContainers] Screen spoofer initialized:',
    `${targetScreen.width}x${targetScreen.height}`
  );
}
