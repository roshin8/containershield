/**
 * WebGL Spoofer - Spoofs WebGL parameters and renderer info
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';

// Common GPU vendor/renderer combinations for spoofing
const GPU_COMBINATIONS = [
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce GTX 1660 SUPER)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 3060)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD Radeon RX 580)' },
  { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel UHD Graphics 630)' },
  { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel Iris Plus Graphics)' },
  { vendor: 'Intel Inc.', renderer: 'Intel Iris OpenGL Engine' },
  { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 5500M' },
];

/**
 * Initialize WebGL spoofing
 */
export function initWebGLSpoofer(
  webglMode: ProtectionMode,
  webgl2Mode: ProtectionMode,
  prng: PRNG
): void {
  // Select a consistent GPU for this container+domain
  const selectedGPU = prng.pick(GPU_COMBINATIONS);

  // Get WebGL debug extension for UNMASKED_VENDOR/RENDERER
  const UNMASKED_VENDOR_WEBGL = 0x9245;
  const UNMASKED_RENDERER_WEBGL = 0x9246;

  // Wrap getParameter for WebGLRenderingContext
  if (webglMode !== 'off') {
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;

    WebGLRenderingContext.prototype.getParameter = function (
      this: WebGLRenderingContext,
      pname: GLenum
    ): unknown {
      if (webglMode === 'block') {
        return null;
      }

      // Spoof UNMASKED_VENDOR and UNMASKED_RENDERER
      if (pname === UNMASKED_VENDOR_WEBGL) {
        return selectedGPU.vendor;
      }

      if (pname === UNMASKED_RENDERER_WEBGL) {
        return selectedGPU.renderer;
      }

      return originalGetParameter.call(this, pname);
    };

    // Wrap getExtension to control debug extension
    const originalGetExtension = WebGLRenderingContext.prototype.getExtension;

    WebGLRenderingContext.prototype.getExtension = function (
      this: WebGLRenderingContext,
      name: string
    ): unknown {
      if (webglMode === 'block') {
        return null;
      }

      // Allow the debug extension but our getParameter will handle it
      return originalGetExtension.call(this, name);
    };

    console.log('[ChameleonContainers] WebGL spoofer initialized:', webglMode);
  }

  // Wrap getParameter for WebGL2RenderingContext
  if (webgl2Mode !== 'off' && typeof WebGL2RenderingContext !== 'undefined') {
    const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;

    WebGL2RenderingContext.prototype.getParameter = function (
      this: WebGL2RenderingContext,
      pname: GLenum
    ): unknown {
      if (webgl2Mode === 'block') {
        return null;
      }

      // Spoof UNMASKED_VENDOR and UNMASKED_RENDERER
      if (pname === UNMASKED_VENDOR_WEBGL) {
        return selectedGPU.vendor;
      }

      if (pname === UNMASKED_RENDERER_WEBGL) {
        return selectedGPU.renderer;
      }

      return originalGetParameter2.call(this, pname);
    };

    // Wrap getExtension
    const originalGetExtension2 = WebGL2RenderingContext.prototype.getExtension;

    WebGL2RenderingContext.prototype.getExtension = function (
      this: WebGL2RenderingContext,
      name: string
    ): unknown {
      if (webgl2Mode === 'block') {
        return null;
      }

      return originalGetExtension2.call(this, name);
    };

    console.log('[ChameleonContainers] WebGL2 spoofer initialized:', webgl2Mode);
  }
}
