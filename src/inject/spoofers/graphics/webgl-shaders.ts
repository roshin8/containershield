/**
 * WebGL Shader Spoofer
 *
 * Shader compilation and precision can be used for fingerprinting.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';

/**
 * Initialize WebGL shader spoofing
 */
export function initWebGLShaderSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  const contexts = ['WebGLRenderingContext', 'WebGL2RenderingContext'];

  for (const ctxName of contexts) {
    const ctx = (window as any)[ctxName];
    if (!ctx?.prototype) continue;

    // Spoof getShaderPrecisionFormat
    const originalGetShaderPrecisionFormat = ctx.prototype.getShaderPrecisionFormat;

    if (originalGetShaderPrecisionFormat) {
      ctx.prototype.getShaderPrecisionFormat = function (
        shaderType: number,
        precisionType: number
      ): WebGLShaderPrecisionFormat | null {
        logAccess(`${ctxName}.getShaderPrecisionFormat`, { spoofed: true });

        if (mode === 'block') {
          // Return common values
          return {
            rangeMin: 127,
            rangeMax: 127,
            precision: 23,
          } as WebGLShaderPrecisionFormat;
        }

        const result = originalGetShaderPrecisionFormat.call(this, shaderType, precisionType);

        if (result && mode === 'noise') {
          // Slightly modify precision values
          return {
            rangeMin: result.rangeMin,
            rangeMax: result.rangeMax,
            precision: Math.max(0, result.precision + prng.nextInt(-1, 1)),
          } as WebGLShaderPrecisionFormat;
        }

        return result;
      };
    }

    // Spoof getShaderInfoLog (can reveal compiler info)
    const originalGetShaderInfoLog = ctx.prototype.getShaderInfoLog;

    if (originalGetShaderInfoLog) {
      ctx.prototype.getShaderInfoLog = function (shader: WebGLShader): string | null {
        logAccess(`${ctxName}.getShaderInfoLog`, { spoofed: true });

        if (mode === 'block') {
          return '';
        }

        return originalGetShaderInfoLog.call(this, shader);
      };
    }

    // Spoof getProgramInfoLog
    const originalGetProgramInfoLog = ctx.prototype.getProgramInfoLog;

    if (originalGetProgramInfoLog) {
      ctx.prototype.getProgramInfoLog = function (program: WebGLProgram): string | null {
        logAccess(`${ctxName}.getProgramInfoLog`, { spoofed: true });

        if (mode === 'block') {
          return '';
        }

        return originalGetProgramInfoLog.call(this, program);
      };
    }
  }

  console.log('[ContainerShield] WebGL shader spoofer initialized');
}
