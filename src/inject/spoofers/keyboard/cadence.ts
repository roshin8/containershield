/**
 * Keyboard Cadence Spoofer
 *
 * Typing rhythm/cadence is a behavioral fingerprint. Instead of delaying
 * events (which breaks site functionality), we add noise to performance.now()
 * readings during keyboard event processing. Fingerprinters that measure
 * inter-keystroke timing via performance.now() get noisy data.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';

export function initKeyboardCadenceSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  const maxJitter = mode === 'block' ? 30 : 15;
  let inKeyboardHandler = false;

  // During keyboard event handling, performance.now() returns a jittered value.
  // This makes inter-keystroke timing measurements unreliable for fingerprinting
  // without interfering with event dispatch or listener execution.
  const origPerformanceNow = performance.now.bind(performance);
  const origNow = performance.now;
  let jitterOffset = 0;

  Object.defineProperty(performance, 'now', {
    value: function now(): number {
      const real = origPerformanceNow();
      if (inKeyboardHandler) {
        return real + jitterOffset;
      }
      return real;
    },
    writable: true,
    configurable: true,
  });

  // Wrap keyboard event dispatch to set the jitter flag
  const keyEvents = new Set(['keydown', 'keyup', 'keypress']);
  const origDispatchEvent = EventTarget.prototype.dispatchEvent;

  document.addEventListener('keydown', () => {
    jitterOffset = (prng.nextFloat() - 0.5) * 2 * maxJitter;
    inKeyboardHandler = true;
    // Reset after microtask (all synchronous handlers will have run)
    Promise.resolve().then(() => { inKeyboardHandler = false; });
  }, true); // capture phase - fires before any site handlers

  document.addEventListener('keyup', () => {
    jitterOffset = (prng.nextFloat() - 0.5) * 2 * maxJitter;
    inKeyboardHandler = true;
    Promise.resolve().then(() => { inKeyboardHandler = false; });
  }, true);

  logAccess('KeyboardEvent.timing', { spoofed: true, value: `±${maxJitter}ms jitter` });
}
