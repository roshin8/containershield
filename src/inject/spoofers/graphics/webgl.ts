/**
 * WebGL Spoofer - Spoofs WebGL parameters and renderer info
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { overrideMethod, registerNative } from '@/lib/stealth';
import { GL } from '@/lib/constants';
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

  const { VENDOR: GL_VENDOR, RENDERER: GL_RENDERER, UNMASKED_VENDOR: UNMASKED_VENDOR_WEBGL, UNMASKED_RENDERER: UNMASKED_RENDERER_WEBGL } = GL;

  // Spoof getParameter: return a Proxy wrapper from getContext that intercepts
  // all method calls. This is the most reliable approach — it doesn't depend on
  // prototype configurability or own-property behavior in Firefox's C++ bindings.
  const spoofGetParam = (origGP: Function, ctx: any, mode: ProtectionMode, pname: GLenum) => {
    if (mode === 'block') return null;
    if (pname === UNMASKED_VENDOR_WEBGL || pname === GL_VENDOR) return selectedGPU.vendor;
    if (pname === UNMASKED_RENDERER_WEBGL || pname === GL_RENDERER) return selectedGPU.renderer;
    return origGP.call(ctx, pname);
  };

  function wrapGLContext(ctx: any, mode: ProtectionMode): any {
    const origGetParam = ctx.getParameter.bind(ctx);
    const origGetExt = ctx.getExtension.bind(ctx);
    let gpLogged = false;

    return new Proxy(ctx, {
      get(target, prop, receiver) {
        if (prop === 'getParameter') {
          return function(pname: GLenum) {
            if (!gpLogged && (pname === UNMASKED_VENDOR_WEBGL || pname === GL_VENDOR)) {
              logAccess('WebGL.getParameter', { spoofed: true, value: selectedGPU.renderer });
              gpLogged = true;
            }
            return spoofGetParam(origGetParam, target, mode, pname);
          };
        }
        if (prop === 'getExtension') {
          return function(name: string) {
            if (mode === 'block') return null;
            return origGetExt(name);
          };
        }
        const val = (target as any)[prop];
        if (typeof val === 'function') return val.bind(target);
        return val;
      },
    });
  }

  // Intercept canvas.getContext — return Proxy-wrapped WebGL contexts
  if (webglMode !== 'off' || webgl2Mode !== 'off') {
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, contextId: string, ...rest: any[]) {
      const ctx = origGetContext.call(this, contextId, ...rest);
      if (!ctx) return ctx;
      if ((contextId === 'webgl' || contextId === 'experimental-webgl') && webglMode !== 'off') {
        return wrapGLContext(ctx, webglMode);
      }
      if (contextId === 'webgl2' && webgl2Mode !== 'off') {
        return wrapGLContext(ctx, webgl2Mode);
      }
      return ctx;
    } as any;
    registerNative(HTMLCanvasElement.prototype.getContext, 'getContext');
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
