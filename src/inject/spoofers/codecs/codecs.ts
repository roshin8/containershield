/**
 * Codec Support Spoofer
 *
 * The canPlayType() and MediaSource.isTypeSupported() APIs reveal
 * which audio/video codecs are supported, creating a fingerprint.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';

// Common codec support (what a typical Chrome browser would return)
const CODEC_SUPPORT: Record<string, 'probably' | 'maybe' | ''> = {
  // Video
  'video/mp4': 'probably',
  'video/mp4; codecs="avc1.42E01E"': 'probably',
  'video/mp4; codecs="avc1.42E01E, mp4a.40.2"': 'probably',
  'video/mp4; codecs="avc1.4D401E"': 'probably',
  'video/mp4; codecs="avc1.64001E"': 'probably',
  'video/mp4; codecs="mp4a.40.2"': 'probably',
  'video/mp4; codecs="hev1"': 'probably',
  'video/mp4; codecs="hvc1"': 'probably',
  'video/webm': 'probably',
  'video/webm; codecs="vp8"': 'probably',
  'video/webm; codecs="vp8, vorbis"': 'probably',
  'video/webm; codecs="vp9"': 'probably',
  'video/webm; codecs="vp09.00.10.08"': 'probably',
  'video/ogg': 'probably',
  'video/ogg; codecs="theora"': 'probably',

  // Audio
  'audio/mp4': 'probably',
  'audio/mp4; codecs="mp4a.40.2"': 'probably',
  'audio/mpeg': 'probably',
  'audio/mp3': 'probably',
  'audio/ogg': 'probably',
  'audio/ogg; codecs="vorbis"': 'probably',
  'audio/ogg; codecs="opus"': 'probably',
  'audio/webm': 'probably',
  'audio/webm; codecs="opus"': 'probably',
  'audio/webm; codecs="vorbis"': 'probably',
  'audio/wav': 'probably',
  'audio/wave': 'probably',
  'audio/x-wav': 'probably',
  'audio/flac': 'probably',
  'audio/x-flac': 'probably',

  // Not supported in most browsers
  'video/x-matroska': '',
  'audio/x-matroska': '',
};

/**
 * Initialize codec spoofing
 */
export function initCodecSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  // Spoof HTMLMediaElement.canPlayType
  const originalCanPlayType = HTMLMediaElement.prototype.canPlayType;

  HTMLMediaElement.prototype.canPlayType = function (type: string): CanPlayTypeResult {
    logAccess('HTMLMediaElement.canPlayType', { spoofed: true });

    if (mode === 'block') {
      return ''; // Can't play anything
    }

    // Return consistent results based on our codec map
    const normalizedType = type.toLowerCase().trim();

    // Check exact match first
    if (normalizedType in CODEC_SUPPORT) {
      return CODEC_SUPPORT[normalizedType];
    }

    // Check base type (without codecs)
    const baseType = normalizedType.split(';')[0].trim();
    if (baseType in CODEC_SUPPORT) {
      return 'maybe'; // We support the container but aren't sure about codec
    }

    // Unknown type - use original
    return originalCanPlayType.call(this, type);
  };

  // Spoof MediaSource.isTypeSupported
  if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported) {
    const originalIsTypeSupported = MediaSource.isTypeSupported;

    MediaSource.isTypeSupported = function (type: string): boolean {
      logAccess('MediaSource.isTypeSupported', { spoofed: true });

      if (mode === 'block') {
        return false;
      }

      const normalizedType = type.toLowerCase().trim();

      // Check our map
      if (normalizedType in CODEC_SUPPORT) {
        return CODEC_SUPPORT[normalizedType] === 'probably';
      }

      // Use original for unknown types
      return originalIsTypeSupported.call(MediaSource, type);
    };
  }

  // Spoof RTCRtpSender.getCapabilities (WebRTC codecs)
  if (typeof RTCRtpSender !== 'undefined' && RTCRtpSender.getCapabilities) {
    const originalGetCapabilities = RTCRtpSender.getCapabilities;

    RTCRtpSender.getCapabilities = function (kind: string) {
      logAccess('RTCRtpSender.getCapabilities', { spoofed: true });

      if (mode === 'block') {
        return null;
      }

      // Return original but could be modified
      return originalGetCapabilities.call(RTCRtpSender, kind);
    };
  }

  console.log('[ContainerShield] Codec spoofer initialized');
}
