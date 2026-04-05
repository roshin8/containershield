/**
 * WebGL Spoofer - Spoofs WebGL parameters and renderer info
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { overrideMethod } from '@/lib/stealth';
import { logAccess, markWebGLSpoofed } from '../../monitor/fingerprint-monitor';

import type { AssignedProfileData } from '@/types';

// GPU combinations by platform
const WINDOWS_GPUS = [
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 4070 Ti Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)' },
];

const MAC_GPUS = [
  { vendor: 'Apple Inc.', renderer: 'Apple M1' },
  { vendor: 'Apple Inc.', renderer: 'Apple M2' },
  { vendor: 'Apple Inc.', renderer: 'Apple M3' },
  { vendor: 'Apple Inc.', renderer: 'Apple M3 Pro' },
  { vendor: 'Intel Inc.', renderer: 'Intel Iris Plus Graphics' },
  { vendor: 'AMD', renderer: 'AMD Radeon Pro 5500M' },
];

const MOBILE_GPUS = [
  { vendor: 'Apple GPU', renderer: 'Apple A16 GPU' },
  { vendor: 'Apple GPU', renderer: 'Apple A17 Pro GPU' },
  { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
  { vendor: 'Qualcomm', renderer: 'Adreno (TM) 730' },
  { vendor: 'ARM', renderer: 'Mali-G710 MC10' },
];

const LINUX_GPUS = [
  { vendor: 'X.Org', renderer: 'AMD Radeon RX 580 (polaris10, DRM 3.49.0)' },
  { vendor: 'X.Org', renderer: 'AMD Radeon RX 6700 XT (navi22, DRM 3.49.0)' },
  { vendor: 'nouveau', renderer: 'NV136' },
  { vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 630 (CFL GT2)' },
];

/**
 * Initialize WebGL spoofing
 */
export function initWebGLSpoofer(
  webglMode: ProtectionMode,
  webgl2Mode: ProtectionMode,
  prng: PRNG,
  assignedProfile?: AssignedProfileData
): void {
  if (webglMode !== 'off') {
    markWebGLSpoofed(webglMode);
  }

  // Select GPU matching the assigned profile's platform
  const platform = assignedProfile?.userAgent?.platformName?.toLowerCase() || '';
  const isMobile = assignedProfile?.userAgent?.mobile ?? false;
  let gpuList = WINDOWS_GPUS;
  if (isMobile) gpuList = MOBILE_GPUS;
  else if (platform.includes('mac') || platform.includes('ios')) gpuList = MAC_GPUS;
  else if (platform.includes('linux')) gpuList = LINUX_GPUS;

  const selectedGPU = prng.pick(gpuList);

  // WebGL parameter constants
  const GL_VENDOR = 0x1F00;
  const GL_RENDERER = 0x1F01;
  const UNMASKED_VENDOR_WEBGL = 0x9245;
  const UNMASKED_RENDERER_WEBGL = 0x9246;

  // Wrap getParameter for WebGLRenderingContext
  if (webglMode !== 'off') {
    overrideMethod(WebGLRenderingContext.prototype, 'getParameter', (original, thisArg, args) => {
      const pname = args[0] as GLenum;

      if (pname === UNMASKED_VENDOR_WEBGL || pname === UNMASKED_RENDERER_WEBGL ||
          pname === GL_VENDOR || pname === GL_RENDERER) {
        logAccess('WebGLRenderingContext.getParameter', { blocked: webglMode === 'block', spoofed: webglMode === 'noise', value: selectedGPU.renderer });
      }

      if (webglMode === 'block') {
        return null;
      }

      // Spoof both masked and unmasked vendor/renderer
      if (pname === UNMASKED_VENDOR_WEBGL || pname === GL_VENDOR) {
        return selectedGPU.vendor;
      }

      if (pname === UNMASKED_RENDERER_WEBGL || pname === GL_RENDERER) {
        return selectedGPU.renderer;
      }

      return original.call(thisArg, pname);
    });

    // Wrap getExtension to control debug extension
    overrideMethod(WebGLRenderingContext.prototype, 'getExtension', (original, thisArg, args) => {
      if (webglMode === 'block') {
        return null;
      }

      return original.call(thisArg, ...args);
    });

    console.log('[ContainerShield] WebGL spoofer initialized:', webglMode);
  }

  // Wrap getParameter for WebGL2RenderingContext
  if (webgl2Mode !== 'off' && typeof WebGL2RenderingContext !== 'undefined') {
    overrideMethod(WebGL2RenderingContext.prototype, 'getParameter', (original, thisArg, args) => {
      const pname = args[0] as GLenum;

      if (pname === UNMASKED_VENDOR_WEBGL || pname === UNMASKED_RENDERER_WEBGL ||
          pname === GL_VENDOR || pname === GL_RENDERER) {
        logAccess('WebGL2RenderingContext.getParameter', { blocked: webgl2Mode === 'block', spoofed: webgl2Mode === 'noise', value: selectedGPU.renderer });
      }

      if (webgl2Mode === 'block') {
        return null;
      }

      if (pname === UNMASKED_VENDOR_WEBGL || pname === GL_VENDOR) {
        return selectedGPU.vendor;
      }

      if (pname === UNMASKED_RENDERER_WEBGL || pname === GL_RENDERER) {
        return selectedGPU.renderer;
      }

      return original.call(thisArg, pname);
    });

    // Wrap getExtension
    overrideMethod(WebGL2RenderingContext.prototype, 'getExtension', (original, thisArg, args) => {
      if (webgl2Mode === 'block') {
        return null;
      }

      return original.call(thisArg, ...args);
    });

    console.log('[ContainerShield] WebGL2 spoofer initialized:', webgl2Mode);
  }
}
