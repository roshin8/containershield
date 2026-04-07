/**
 * WebGL Spoofer - Spoofs WebGL parameters and renderer info
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { overrideMethod, registerNative } from '@/lib/stealth';
import { GL } from '@/lib/constants';
import { logAccess, markWebGLSpoofed } from '../../monitor/fingerprint-monitor';

import type { AssignedProfileData } from '@/types';
import { selectGPUForProfile as _selectGPU, type GPUProfile } from '@/lib/gpu-profiles';

// Module-level selected GPU so Worker spoofer can access it
let _selectedGPU: GPUProfile | null = null;

export function getSelectedGPU(): GPUProfile | null {
  return _selectedGPU;
}

/**
 * Select GPU matching the profile's platform (shared by WebGL and Worker spoofers)
 */
export function selectGPUForProfile(prng: PRNG, assignedProfile?: AssignedProfileData): GPUProfile {
  return _selectGPU((arr) => prng.pick(arr), assignedProfile);
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

  // Strategy: three layers of override for maximum compatibility.
  // 1. Prototype-level via defineProperty
  // 2. Prototype-level via direct assignment
  // 3. Instance-level via getContext interception
  let webglLogged = false;
  const logWebGL = () => {
    if (!webglLogged) {
      logAccess('WebGLRenderingContext.getParameter', { spoofed: true, value: selectedGPU.renderer.substring(0, 40) });
      webglLogged = true;
    }
  };

  const spoofedGetParam = function getParameter(this: any, pname: GLenum) {
    if (webglMode === 'block') return null;
    if (pname === UNMASKED_VENDOR_WEBGL || pname === GL_VENDOR) { logWebGL(); return selectedGPU.vendor; }
    if (pname === UNMASKED_RENDERER_WEBGL || pname === GL_RENDERER) { logWebGL(); return selectedGPU.renderer; }
    return _origWGL1GetParam.call(this, pname);
  };

  const _origWGL1GetParam = WebGLRenderingContext.prototype.getParameter;
  let _origWGL2GetParam: Function | null = null;

  if (webglMode !== 'off') {
    registerNative(spoofedGetParam, 'getParameter');
    // Layer 1: defineProperty on prototype
    try {
      Object.defineProperty(WebGLRenderingContext.prototype, 'getParameter', {
        value: spoofedGetParam, writable: true, configurable: true,
      });
    } catch {}
    // Layer 2: direct assignment on prototype
    try { (WebGLRenderingContext.prototype as any).getParameter = spoofedGetParam; } catch {}
  }

  if (webgl2Mode !== 'off' && typeof WebGL2RenderingContext !== 'undefined') {
    _origWGL2GetParam = WebGL2RenderingContext.prototype.getParameter;
    let webgl2Logged = false;
    const logWebGL2 = () => {
      if (!webgl2Logged) {
        logAccess('WebGL2RenderingContext.getParameter', { spoofed: true, value: selectedGPU.renderer.substring(0, 40) });
        webgl2Logged = true;
      }
    };
    const spoofedGetParam2 = function getParameter(this: any, pname: GLenum) {
      if (webgl2Mode === 'block') return null;
      if (pname === UNMASKED_VENDOR_WEBGL || pname === GL_VENDOR) { logWebGL2(); return selectedGPU.vendor; }
      if (pname === UNMASKED_RENDERER_WEBGL || pname === GL_RENDERER) { logWebGL2(); return selectedGPU.renderer; }
      return _origWGL2GetParam!.call(this, pname);
    };
    registerNative(spoofedGetParam2, 'getParameter');
    try {
      Object.defineProperty(WebGL2RenderingContext.prototype, 'getParameter', {
        value: spoofedGetParam2, writable: true, configurable: true,
      });
    } catch {}
    try { (WebGL2RenderingContext.prototype as any).getParameter = spoofedGetParam2; } catch {}
  }

  // Layer 3: intercept getContext to patch each instance directly
  if (webglMode !== 'off' || webgl2Mode !== 'off') {
    try {
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      const patchCtx = (ctx: any, mode: ProtectionMode, origGP: Function) => {
        if (!ctx || ctx._csPatchedGP) return ctx;
        try {
          const bound = origGP.bind(ctx);
          ctx.getParameter = function(pname: GLenum) {
            if (mode === 'block') return null;
            if (pname === UNMASKED_VENDOR_WEBGL || pname === GL_VENDOR) return selectedGPU.vendor;
            if (pname === UNMASKED_RENDERER_WEBGL || pname === GL_RENDERER) return selectedGPU.renderer;
            return bound(pname);
          };
          ctx._csPatchedGP = true;
        } catch {}
        return ctx;
      };

      overrideMethod(HTMLCanvasElement.prototype, 'getContext', (original, thisArg, args) => {
        const ctx = original.call(thisArg, ...args);
        const id = args[0] as string;
        if (ctx && (id === 'webgl' || id === 'experimental-webgl') && webglMode !== 'off') {
          patchCtx(ctx, webglMode, _origWGL1GetParam);
        }
        if (ctx && id === 'webgl2' && webgl2Mode !== 'off' && _origWGL2GetParam) {
          patchCtx(ctx, webgl2Mode, _origWGL2GetParam);
        }
        return ctx;
      });

      // Also patch OffscreenCanvas.prototype.getContext (used by workers and fingerprinters)
      if (typeof OffscreenCanvas !== 'undefined') {
        const origOCGetCtx = OffscreenCanvas.prototype.getContext;
        OffscreenCanvas.prototype.getContext = function(this: OffscreenCanvas, id: string, ...rest: any[]) {
          const ctx = origOCGetCtx.call(this, id, ...rest);
          if (ctx && (id === 'webgl' || id === 'experimental-webgl') && webglMode !== 'off') {
            patchCtx(ctx, webglMode, _origWGL1GetParam);
          }
          if (ctx && id === 'webgl2' && webgl2Mode !== 'off' && _origWGL2GetParam) {
            patchCtx(ctx, webgl2Mode, _origWGL2GetParam);
          }
          return ctx;
        } as any;
      }
    } catch {}
  }

}
