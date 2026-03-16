/**
 * Canvas Spoofer - Adds noise to canvas fingerprinting APIs
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { farbleImageData } from '@/lib/farbling';

/**
 * Initialize canvas spoofing
 */
export function initCanvasSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  // Store original methods
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  // Wrap toDataURL
  HTMLCanvasElement.prototype.toDataURL = function (
    this: HTMLCanvasElement,
    type?: string,
    quality?: number
  ): string {
    if (mode === 'block') {
      return 'data:image/png;base64,';
    }

    // Get context and apply noise
    const ctx = this.getContext('2d');
    if (ctx) {
      const imageData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
      farbleImageData(imageData.data, prng);
      ctx.putImageData(imageData, 0, 0);
    }

    return originalToDataURL.call(this, type, quality);
  };

  // Wrap toBlob
  HTMLCanvasElement.prototype.toBlob = function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
    type?: string,
    quality?: number
  ): void {
    if (mode === 'block') {
      callback(null);
      return;
    }

    // Get context and apply noise
    const ctx = this.getContext('2d');
    if (ctx) {
      const imageData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
      farbleImageData(imageData.data, prng);
      ctx.putImageData(imageData, 0, 0);
    }

    return originalToBlob.call(this, callback, type, quality);
  };

  // Wrap getImageData
  CanvasRenderingContext2D.prototype.getImageData = function (
    this: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    settings?: ImageDataSettings
  ): ImageData {
    const imageData = originalGetImageData.call(this, sx, sy, sw, sh, settings);

    if (mode === 'block') {
      // Return blank image data
      return new ImageData(sw, sh);
    }

    // Apply noise
    farbleImageData(imageData.data, prng);
    return imageData;
  };

  // Also wrap OffscreenCanvas if available
  if (typeof OffscreenCanvas !== 'undefined') {
    const originalOffscreenToBlob = OffscreenCanvas.prototype.convertToBlob;

    OffscreenCanvas.prototype.convertToBlob = async function (
      this: OffscreenCanvas,
      options?: ImageEncodeOptions
    ): Promise<Blob> {
      if (mode === 'block') {
        return new Blob([]);
      }

      const ctx = this.getContext('2d') as OffscreenCanvasRenderingContext2D | null;
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        farbleImageData(imageData.data, prng);
        ctx.putImageData(imageData, 0, 0);
      }

      return originalOffscreenToBlob.call(this, options);
    };
  }

  console.log('[ChameleonContainers] Canvas spoofer initialized:', mode);
}
