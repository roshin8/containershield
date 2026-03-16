/**
 * DOMRect Spoofer - Adds noise to getBoundingClientRect and getClientRects
 * These APIs are used for font fingerprinting and layout-based fingerprinting
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { farbleDOMRect } from '@/lib/farbling';

/**
 * Initialize DOMRect spoofing
 */
export function initDOMRectSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  const maxNoise = mode === 'noise' ? 0.5 : 0;

  // Wrap Element.prototype.getBoundingClientRect
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

  Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
    const rect = originalGetBoundingClientRect.call(this);

    if (mode === 'block') {
      // Return zeroed rect
      return new DOMRect(0, 0, 0, 0);
    }

    // Add noise to the rect
    const noisy = farbleDOMRect(rect, prng, maxNoise);

    // Create a new DOMRect with noisy values
    return new DOMRect(noisy.x, noisy.y, noisy.width, noisy.height);
  };

  // Wrap Element.prototype.getClientRects
  const originalGetClientRects = Element.prototype.getClientRects;

  Element.prototype.getClientRects = function (this: Element): DOMRectList {
    const rects = originalGetClientRects.call(this);

    if (mode === 'block') {
      // Return empty DOMRectList-like object
      const emptyList = {
        length: 0,
        item: () => null,
        [Symbol.iterator]: function* () {},
      } as unknown as DOMRectList;
      return emptyList;
    }

    // Create array of noisy rects
    const noisyRects: DOMRect[] = [];
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      const noisy = farbleDOMRect(rect, prng, maxNoise);
      noisyRects.push(new DOMRect(noisy.x, noisy.y, noisy.width, noisy.height));
    }

    // Create a DOMRectList-like object
    const result = {
      length: noisyRects.length,
      item: (index: number) => noisyRects[index] || null,
      [Symbol.iterator]: function* () {
        for (const rect of noisyRects) {
          yield rect;
        }
      },
    };

    // Add indexed access
    for (let i = 0; i < noisyRects.length; i++) {
      (result as any)[i] = noisyRects[i];
    }

    return result as unknown as DOMRectList;
  };

  // Wrap Range.prototype.getBoundingClientRect
  const originalRangeGetBoundingClientRect = Range.prototype.getBoundingClientRect;

  Range.prototype.getBoundingClientRect = function (this: Range): DOMRect {
    const rect = originalRangeGetBoundingClientRect.call(this);

    if (mode === 'block') {
      return new DOMRect(0, 0, 0, 0);
    }

    const noisy = farbleDOMRect(rect, prng, maxNoise);
    return new DOMRect(noisy.x, noisy.y, noisy.width, noisy.height);
  };

  // Wrap Range.prototype.getClientRects
  const originalRangeGetClientRects = Range.prototype.getClientRects;

  Range.prototype.getClientRects = function (this: Range): DOMRectList {
    const rects = originalRangeGetClientRects.call(this);

    if (mode === 'block') {
      const emptyList = {
        length: 0,
        item: () => null,
        [Symbol.iterator]: function* () {},
      } as unknown as DOMRectList;
      return emptyList;
    }

    const noisyRects: DOMRect[] = [];
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      const noisy = farbleDOMRect(rect, prng, maxNoise);
      noisyRects.push(new DOMRect(noisy.x, noisy.y, noisy.width, noisy.height));
    }

    const result = {
      length: noisyRects.length,
      item: (index: number) => noisyRects[index] || null,
      [Symbol.iterator]: function* () {
        for (const rect of noisyRects) {
          yield rect;
        }
      },
    };

    for (let i = 0; i < noisyRects.length; i++) {
      (result as any)[i] = noisyRects[i];
    }

    return result as unknown as DOMRectList;
  };

  console.log('[ChameleonContainers] DOMRect spoofer initialized:', mode);
}
