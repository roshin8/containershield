/**
 * TextMetrics Spoofer - Adds noise to canvas measureText
 * Used for font fingerprinting via text width measurements
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';

/**
 * Initialize TextMetrics spoofing
 */
export function initTextMetricsSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  const maxNoise = mode === 'noise' ? 0.3 : 0;

  // Store original measureText
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;

  CanvasRenderingContext2D.prototype.measureText = function (
    this: CanvasRenderingContext2D,
    text: string
  ): TextMetrics {
    const metrics = originalMeasureText.call(this, text);

    if (mode === 'block') {
      // Return zeroed metrics
      return createFakeTextMetrics(0);
    }

    // Add noise to all metric properties
    const noise = () => prng.nextNoise(maxNoise);

    // Create a proxy to intercept property access
    return new Proxy(metrics, {
      get(target, prop) {
        const value = (target as any)[prop];

        // Add noise to numeric properties
        if (typeof value === 'number') {
          return value + noise();
        }

        return value;
      },
    });
  };

  // Also wrap OffscreenCanvasRenderingContext2D if available
  if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
    const originalOffscreenMeasureText =
      OffscreenCanvasRenderingContext2D.prototype.measureText;

    OffscreenCanvasRenderingContext2D.prototype.measureText = function (
      this: OffscreenCanvasRenderingContext2D,
      text: string
    ): TextMetrics {
      const metrics = originalOffscreenMeasureText.call(this, text);

      if (mode === 'block') {
        return createFakeTextMetrics(0);
      }

      const noise = () => prng.nextNoise(maxNoise);

      return new Proxy(metrics, {
        get(target, prop) {
          const value = (target as any)[prop];
          if (typeof value === 'number') {
            return value + noise();
          }
          return value;
        },
      });
    };
  }

  console.log('[ChameleonContainers] TextMetrics spoofer initialized:', mode);
}

/**
 * Create a fake TextMetrics object with specified width
 */
function createFakeTextMetrics(width: number): TextMetrics {
  return {
    width,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: width,
    actualBoundingBoxAscent: 0,
    actualBoundingBoxDescent: 0,
    fontBoundingBoxAscent: 0,
    fontBoundingBoxDescent: 0,
    emHeightAscent: 0,
    emHeightDescent: 0,
    hangingBaseline: 0,
    alphabeticBaseline: 0,
    ideographicBaseline: 0,
  } as TextMetrics;
}
