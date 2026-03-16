/**
 * Emoji Rendering Spoofer
 *
 * Emoji rendering differs across OS/browser combinations,
 * creating a fingerprint when drawn to canvas.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';
import { farbleImageData } from '@/lib/farbling';

// Emoji characters commonly used for fingerprinting
const FINGERPRINT_EMOJIS = [
  '😀', '🎨', '🔒', '🌈', '🎭', '🎪', '🏳️‍🌈', '👨‍👩‍👧‍👦',
  '🧑‍🤝‍🧑', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '👁️‍🗨️', '⚡', '❤️', '🔥'
];

/**
 * Initialize emoji rendering spoofing
 */
export function initEmojiSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  // The main vector is canvas text rendering of emojis
  // We already spoof canvas, but we can add emoji-specific protection

  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  const originalStrokeText = CanvasRenderingContext2D.prototype.strokeText;
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;

  // Detect if text contains emoji
  const containsEmoji = (text: string): boolean => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1F02F}]/u;
    return emojiRegex.test(text);
  };

  // Spoof measureText for emoji
  CanvasRenderingContext2D.prototype.measureText = function (text: string): TextMetrics {
    const result = originalMeasureText.call(this, text);

    if (containsEmoji(text)) {
      logAccess('CanvasRenderingContext2D.measureText(emoji)', { spoofed: true });

      if (mode === 'block') {
        // Return zeroed metrics
        return {
          width: 0,
          actualBoundingBoxLeft: 0,
          actualBoundingBoxRight: 0,
          actualBoundingBoxAscent: 0,
          actualBoundingBoxDescent: 0,
          fontBoundingBoxAscent: 0,
          fontBoundingBoxDescent: 0,
          emHeightAscent: 0,
          emHeightDescent: 0,
          alphabeticBaseline: 0,
          hangingBaseline: 0,
          ideographicBaseline: 0,
        } as TextMetrics;
      }

      // Add noise to metrics
      const noise = () => prng.nextNoise(0.5);
      return new Proxy(result, {
        get(target, prop) {
          const value = (target as any)[prop];
          if (typeof value === 'number') {
            return value + noise();
          }
          return value;
        },
      });
    }

    return result;
  };

  console.log('[ContainerShield] Emoji rendering spoofer initialized');
}
