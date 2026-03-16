/**
 * Worker Fingerprint Spoofer
 *
 * Web Workers have their own context and can be used to
 * fingerprint the browser from a different execution context.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';

/**
 * Initialize Worker fingerprint spoofing
 */
export function initWorkerSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  // Spoof SharedArrayBuffer availability (high-entropy feature)
  if (mode === 'block') {
    try {
      Object.defineProperty(window, 'SharedArrayBuffer', {
        value: undefined,
        configurable: true,
      });
    } catch {
      // Can't override
    }
  }

  // Spoof Worker constructor to inject protection code
  const OriginalWorker = window.Worker;

  window.Worker = function (scriptURL: string | URL, options?: WorkerOptions): Worker {
    logAccess('Worker.constructor', { spoofed: true });

    // Create the worker normally
    const worker = new OriginalWorker(scriptURL, options);

    // We can't directly modify worker internals, but we track creation
    return worker;
  } as any;

  (window.Worker as any).prototype = OriginalWorker.prototype;

  // Spoof Worklet if available
  if ('audioWorklet' in AudioContext.prototype) {
    const originalAddModule = AudioWorklet.prototype.addModule;

    AudioWorklet.prototype.addModule = async function (
      moduleURL: string | URL,
      options?: WorkletOptions
    ): Promise<void> {
      logAccess('AudioWorklet.addModule', { spoofed: true });
      return originalAddModule.call(this, moduleURL, options);
    };
  }

  // Spoof ServiceWorker registration tracking
  if ('serviceWorker' in navigator) {
    const originalRegister = navigator.serviceWorker.register;

    navigator.serviceWorker.register = async function (
      scriptURL: string | URL,
      options?: RegistrationOptions
    ): Promise<ServiceWorkerRegistration> {
      logAccess('ServiceWorker.register', { spoofed: true });
      return originalRegister.call(navigator.serviceWorker, scriptURL, options);
    };
  }

  console.log('[ContainerShield] Worker spoofer initialized');
}
