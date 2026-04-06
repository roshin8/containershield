/**
 * WebGL Spoofer - Spoofs WebGL parameters and renderer info
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { overrideMethod, registerNative } from '@/lib/stealth';
import { logAccess, markWebGLSpoofed } from '../../monitor/fingerprint-monitor';

import type { AssignedProfileData } from '@/types';

// GPU combinations by platform — no Intel (too similar to real hardware on Macs)
const WINDOWS_GPUS = [
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 4070 Ti Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD Radeon RX 7800 XT Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)' },
];

const MAC_GPUS = [
  { vendor: 'Apple Inc.', renderer: 'Apple M1' },
  { vendor: 'Apple Inc.', renderer: 'Apple M1 Pro' },
  { vendor: 'Apple Inc.', renderer: 'Apple M2' },
  { vendor: 'Apple Inc.', renderer: 'Apple M2 Pro' },
  { vendor: 'Apple Inc.', renderer: 'Apple M3' },
  { vendor: 'Apple Inc.', renderer: 'Apple M3 Pro' },
  { vendor: 'Apple Inc.', renderer: 'Apple M4' },
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
  { vendor: 'X.Org', renderer: 'AMD Radeon RX 7800 XT (navi32, DRM 3.54.0)' },
  { vendor: 'nouveau', renderer: 'NV136' },
  { vendor: 'nouveau', renderer: 'NV167' },
];

// Module-level selected GPU so Worker spoofer can access it
let _selectedGPU: { vendor: string; renderer: string } | null = null;

export function getSelectedGPU(): { vendor: string; renderer: string } | null {
  return _selectedGPU;
}

/**
 * Select GPU matching the profile's platform (shared by WebGL and Worker spoofers)
 */
export function selectGPUForProfile(prng: PRNG, assignedProfile?: AssignedProfileData): { vendor: string; renderer: string } {
  const platform = assignedProfile?.userAgent?.platformName?.toLowerCase() || '';
  const isMobile = assignedProfile?.userAgent?.mobile ?? false;
  let gpuList = WINDOWS_GPUS;
  if (isMobile) gpuList = MOBILE_GPUS;
  else if (platform.includes('mac') || platform.includes('ios')) gpuList = MAC_GPUS;
  else if (platform.includes('linux')) gpuList = LINUX_GPUS;
  return prng.pick(gpuList);
}

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

  const selectedGPU = selectGPUForProfile(prng, assignedProfile);
  _selectedGPU = selectedGPU;

  // WebGL parameter constants
  const GL_VENDOR = 0x1F00;
  const GL_RENDERER = 0x1F01;
  const UNMASKED_VENDOR_WEBGL = 0x9245;
  const UNMASKED_RENDERER_WEBGL = 0x9246;

  // Helper to create a getParameter wrapper
  const wrapGetParameter = (mode: ProtectionMode, label: string) => {
    return (original: Function, thisArg: any, args: any[]) => {
      const pname = args[0] as GLenum;

      if (pname === UNMASKED_VENDOR_WEBGL || pname === UNMASKED_RENDERER_WEBGL ||
          pname === GL_VENDOR || pname === GL_RENDERER) {
        logAccess(label, { blocked: mode === 'block', spoofed: mode === 'noise', value: selectedGPU.renderer });
      }

      if (mode === 'block') return null;

      if (pname === UNMASKED_VENDOR_WEBGL || pname === GL_VENDOR) return selectedGPU.vendor;
      if (pname === UNMASKED_RENDERER_WEBGL || pname === GL_RENDERER) return selectedGPU.renderer;

      return original.call(thisArg, pname);
    };
  };

  // Wrap getParameter for WebGLRenderingContext
  // Use BOTH overrideMethod (Proxy) AND direct defineProperty for maximum compatibility
  if (webglMode !== 'off') {
    const origWGL1GetParam = WebGLRenderingContext.prototype.getParameter;
    const spoofedWGL1GetParam = function getParameter(this: WebGLRenderingContext, pname: GLenum) {
      if (pname === UNMASKED_VENDOR_WEBGL || pname === UNMASKED_RENDERER_WEBGL ||
          pname === GL_VENDOR || pname === GL_RENDERER) {
        logAccess('WebGLRenderingContext.getParameter', { spoofed: true, value: selectedGPU.renderer });
      }
      if (webglMode === 'block') return null;
      if (pname === UNMASKED_VENDOR_WEBGL || pname === GL_VENDOR) return selectedGPU.vendor;
      if (pname === UNMASKED_RENDERER_WEBGL || pname === GL_RENDERER) return selectedGPU.renderer;
      return origWGL1GetParam.call(this, pname);
    };
    registerNative(spoofedWGL1GetParam, 'getParameter');
    Object.defineProperty(WebGLRenderingContext.prototype, 'getParameter', {
      value: spoofedWGL1GetParam,
      writable: true,
      configurable: true,
    });

    // Wrap getExtension to control debug extension
    overrideMethod(WebGLRenderingContext.prototype, 'getExtension', (original, thisArg, args) => {
      if (webglMode === 'block') return null;
      return original.call(thisArg, ...args);
    });
  }

  // Also intercept canvas.getContext to patch each WebGL context instance directly.
  // Firefox may bind getParameter as an own property (not on prototype), so
  // prototype-level overrides won't catch it. Patch each context at creation.
  if (webglMode !== 'off' || webgl2Mode !== 'off') {
    overrideMethod(HTMLCanvasElement.prototype, 'getContext', (original, thisArg, args) => {
      const ctx = original.call(thisArg, ...args);
      const contextId = args[0] as string;
      if (ctx && (contextId === 'webgl' || contextId === 'experimental-webgl') && webglMode !== 'off') {
        patchContextInstance(ctx, webglMode);
      }
      if (ctx && contextId === 'webgl2' && webgl2Mode !== 'off') {
        patchContextInstance(ctx, webgl2Mode);
      }
      return ctx;
    });
  }

  function patchContextInstance(ctx: any, mode: ProtectionMode) {
    if (ctx._csPatchedGP) return;
    const origGP = ctx.getParameter.bind(ctx);
    ctx.getParameter = function(pname: GLenum) {
      if (mode === 'block') return null;
      if (pname === UNMASKED_VENDOR_WEBGL || pname === GL_VENDOR) return selectedGPU.vendor;
      if (pname === UNMASKED_RENDERER_WEBGL || pname === GL_RENDERER) return selectedGPU.renderer;
      return origGP(pname);
    };
    ctx._csPatchedGP = true;
  }

  // Wrap getParameter for WebGL2RenderingContext
  if (webgl2Mode !== 'off' && typeof WebGL2RenderingContext !== 'undefined') {
    const origWGL2GetParam = WebGL2RenderingContext.prototype.getParameter;
    const spoofedWGL2GetParam = function getParameter(this: WebGL2RenderingContext, pname: GLenum) {
      if (pname === UNMASKED_VENDOR_WEBGL || pname === UNMASKED_RENDERER_WEBGL ||
          pname === GL_VENDOR || pname === GL_RENDERER) {
        logAccess('WebGL2RenderingContext.getParameter', { spoofed: true, value: selectedGPU.renderer });
      }
      if (webgl2Mode === 'block') return null;
      if (pname === UNMASKED_VENDOR_WEBGL || pname === GL_VENDOR) return selectedGPU.vendor;
      if (pname === UNMASKED_RENDERER_WEBGL || pname === GL_RENDERER) return selectedGPU.renderer;
      return origWGL2GetParam.call(this, pname);
    };
    registerNative(spoofedWGL2GetParam, 'getParameter');
    Object.defineProperty(WebGL2RenderingContext.prototype, 'getParameter', {
      value: spoofedWGL2GetParam,
      writable: true,
      configurable: true,
    });

    // Wrap getExtension
    overrideMethod(WebGL2RenderingContext.prototype, 'getExtension', (original, thisArg, args) => {
      if (webgl2Mode === 'block') return null;
      return original.call(thisArg, ...args);
    });
  }
}
