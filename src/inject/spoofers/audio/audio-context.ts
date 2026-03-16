/**
 * Audio Context Spoofer - Adds noise to AudioContext fingerprinting
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { farbleFloatArray } from '@/lib/farbling';

/**
 * Initialize audio context spoofing
 */
export function initAudioSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  // Wrap AnalyserNode.getFloatFrequencyData
  const originalGetFloatFrequencyData = AnalyserNode.prototype.getFloatFrequencyData;

  AnalyserNode.prototype.getFloatFrequencyData = function (
    this: AnalyserNode,
    array: Float32Array
  ): void {
    if (mode === 'block') {
      // Fill with silence
      array.fill(-Infinity);
      return;
    }

    originalGetFloatFrequencyData.call(this, array);
    farbleFloatArray(array, prng, 0.0001);
  };

  // Wrap AnalyserNode.getByteFrequencyData
  const originalGetByteFrequencyData = AnalyserNode.prototype.getByteFrequencyData;

  AnalyserNode.prototype.getByteFrequencyData = function (
    this: AnalyserNode,
    array: Uint8Array
  ): void {
    if (mode === 'block') {
      array.fill(0);
      return;
    }

    originalGetByteFrequencyData.call(this, array);

    // Add small noise to byte values
    for (let i = 0; i < array.length; i++) {
      const noise = Math.round(prng.nextNoise(2));
      array[i] = Math.max(0, Math.min(255, array[i] + noise));
    }
  };

  // Wrap AnalyserNode.getFloatTimeDomainData
  const originalGetFloatTimeDomainData = AnalyserNode.prototype.getFloatTimeDomainData;

  AnalyserNode.prototype.getFloatTimeDomainData = function (
    this: AnalyserNode,
    array: Float32Array
  ): void {
    if (mode === 'block') {
      array.fill(0);
      return;
    }

    originalGetFloatTimeDomainData.call(this, array);
    farbleFloatArray(array, prng, 0.0001);
  };

  // Wrap AudioBuffer.getChannelData
  const originalGetChannelData = AudioBuffer.prototype.getChannelData;

  AudioBuffer.prototype.getChannelData = function (
    this: AudioBuffer,
    channel: number
  ): Float32Array {
    const data = originalGetChannelData.call(this, channel);

    if (mode === 'block') {
      return new Float32Array(data.length);
    }

    // Create a copy and add noise
    const noisyData = new Float32Array(data);
    farbleFloatArray(noisyData, prng, 0.0001);
    return noisyData;
  };

  // Wrap OfflineAudioContext.startRendering
  if (typeof OfflineAudioContext !== 'undefined') {
    const originalStartRendering = OfflineAudioContext.prototype.startRendering;

    OfflineAudioContext.prototype.startRendering = async function (
      this: OfflineAudioContext
    ): Promise<AudioBuffer> {
      const buffer = await originalStartRendering.call(this);

      if (mode === 'block') {
        // Return silent buffer
        return buffer;
      }

      // Add noise to all channels
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const channelData = buffer.getChannelData(c);
        farbleFloatArray(channelData, prng, 0.0001);
      }

      return buffer;
    };
  }

  console.log('[ChameleonContainers] Audio spoofer initialized:', mode);
}
