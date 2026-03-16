/**
 * OffscreenCanvas Spoofer
 *
 * OffscreenCanvas can be used in workers for fingerprinting,
 * bypassing main-thread canvas protections.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';
import { farbleImageData } from '@/lib/farbling';

/**
 * Initialize OffscreenCanvas spoofing
 */
export function initOffscreenCanvasSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  if (typeof OffscreenCanvas === 'undefined') return;

  // Spoof OffscreenCanvas.convertToBlob
  const originalConvertToBlob = OffscreenCanvas.prototype.convertToBlob;

  if (originalConvertToBlob) {
    OffscreenCanvas.prototype.convertToBlob = async function (
      options?: ImageEncodeOptions
    ): Promise<Blob> {
      logAccess('OffscreenCanvas.convertToBlob', { spoofed: mode !== 'block' });

      if (mode === 'block') {
        return new Blob([], { type: options?.type || 'image/png' });
      }

      // Get 2D context and add noise
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        farbleImageData(imageData.data, prng, 3);
        ctx.putImageData(imageData, 0, 0);
      }

      return originalConvertToBlob.call(this, options);
    };
  }

  // Spoof getContext to track WebGL usage
  const originalGetContext = OffscreenCanvas.prototype.getContext;

  OffscreenCanvas.prototype.getContext = function (
    contextType: string,
    options?: any
  ): RenderingContext | null {
    logAccess(`OffscreenCanvas.getContext(${contextType})`, { spoofed: true });
    return originalGetContext.call(this, contextType, options);
  };

  console.log('[ContainerShield] OffscreenCanvas spoofer initialized');
}
