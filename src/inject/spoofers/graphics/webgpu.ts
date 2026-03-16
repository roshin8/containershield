/**
 * WebGPU Spoofer
 *
 * WebGPU is the next-generation graphics API that exposes
 * detailed GPU information for fingerprinting.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';

// Common GPU info that looks normal
const COMMON_GPUS = [
  { vendor: 'Google Inc. (Intel)', architecture: 'gen-12lp', device: 'Intel Iris Xe Graphics', description: 'Intel Iris Xe Graphics' },
  { vendor: 'Google Inc. (NVIDIA)', architecture: 'ampere', device: 'NVIDIA GeForce RTX 3060', description: 'NVIDIA GeForce RTX 3060' },
  { vendor: 'Google Inc. (AMD)', architecture: 'rdna-2', device: 'AMD Radeon RX 6700', description: 'AMD Radeon RX 6700' },
  { vendor: 'Google Inc. (Apple)', architecture: 'apple-m1', device: 'Apple M1', description: 'Apple M1' },
];

/**
 * Initialize WebGPU spoofing
 */
export function initWebGPUSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return;

  const gpu = (navigator as any).gpu;
  if (!gpu) return;

  const originalRequestAdapter = gpu.requestAdapter?.bind(gpu);

  if (originalRequestAdapter) {
    gpu.requestAdapter = async function (options?: GPURequestAdapterOptions): Promise<GPUAdapter | null> {
      logAccess('navigator.gpu.requestAdapter', { spoofed: mode !== 'block' });

      if (mode === 'block') {
        return null; // Pretend WebGPU is not available
      }

      const adapter = await originalRequestAdapter(options);

      if (!adapter) return null;

      // Create a proxy to spoof adapter info
      const selectedGPU = prng.pick(COMMON_GPUS);

      const spoofedAdapter = new Proxy(adapter, {
        get(target, prop) {
          if (prop === 'requestAdapterInfo') {
            return async () => {
              logAccess('GPUAdapter.requestAdapterInfo', { spoofed: true });
              return {
                vendor: selectedGPU.vendor,
                architecture: selectedGPU.architecture,
                device: selectedGPU.device,
                description: selectedGPU.description,
              };
            };
          }

          const value = (target as any)[prop];
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        },
      });

      return spoofedAdapter;
    };
  }

  console.log('[ContainerShield] WebGPU spoofer initialized');
}
