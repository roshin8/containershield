/**
 * Architecture Spoofer
 *
 * FingerprintJS detects 32-bit vs 64-bit architecture via:
 * - Float32Array: f32[0] = 1e308 then read back
 * - Math.fround() precision differences
 * - ArrayBuffer behavior
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { overrideMethod } from '@/lib/stealth';
import { logAccess } from '../../monitor/fingerprint-monitor';

export function initArchitectureSpoofer(mode: ProtectionMode, _prng: PRNG): void {
  if (mode === 'off') return;

  logAccess('Math.fround', { spoofed: true, value: 'x86_64' });

  const originalFround = Math.fround;
  overrideMethod(Math as any, 'fround', (original, _thisArg, args) => {
    return original.apply(Math, args);
  });
}
