/**
 * Event Loop Timing Jitter
 *
 * Advanced fingerprinters measure how long setTimeout/setInterval callbacks
 * take to fire, which reflects CPU performance and system load.
 *
 * Only add jitter to zero/near-zero timeouts (fingerprinting probes).
 * Leave normal timeouts (>50ms) untouched to avoid breaking site functionality.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';

export function initEventLoopJitter(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  const maxJitter = mode === 'block' ? 5 : 2;
  // Only jitter short timeouts that look like timing probes
  const jitterThreshold = 10;
  let logged = false;

  const origSetTimeout = window.setTimeout;
  const origRAF = window.requestAnimationFrame;

  window.setTimeout = function(handler: TimerHandler, timeout?: number, ...args: any[]): number {
    const t = timeout || 0;
    // Only add jitter to very short timeouts (likely fingerprinting probes)
    // Leave normal timers alone to avoid breaking site functionality
    if (t <= jitterThreshold) {
      if (!logged) { logAccess('setTimeout', { spoofed: true, value: `±${maxJitter}ms jitter` }); logged = true; }
      const jitter = Math.floor(prng.nextFloat() * maxJitter);
      return origSetTimeout(handler, t + jitter, ...args);
    }
    return origSetTimeout(handler, t, ...args);
  } as typeof setTimeout;

  // Add sub-ms noise to rAF timestamp (used for frame timing fingerprinting)
  if (origRAF) {
    window.requestAnimationFrame = function(callback: FrameRequestCallback): number {
      return origRAF((timestamp) => {
        const noise = prng.nextFloat() * 0.1;
        callback(timestamp + noise);
      });
    };
  }
}
