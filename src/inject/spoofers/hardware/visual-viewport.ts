/**
 * Visual Viewport Spoofer
 *
 * window.visualViewport exposes zoom level, offset, and dimensions
 * that can fingerprint the user's display setup.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { overrideGetterWithValue } from '@/lib/stealth';
import { logAccess } from '../../monitor/fingerprint-monitor';

export function initVisualViewportSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off' || !window.visualViewport) return;

  logAccess('visualViewport.scale', { spoofed: true, value: '1.0 (no zoom)' });

  overrideGetterWithValue(VisualViewport.prototype, 'scale', () => 1);
  overrideGetterWithValue(VisualViewport.prototype, 'offsetLeft', () => 0);
  overrideGetterWithValue(VisualViewport.prototype, 'offsetTop', () => 0);
  overrideGetterWithValue(VisualViewport.prototype, 'pageLeft', () => 0);
  overrideGetterWithValue(VisualViewport.prototype, 'pageTop', () => 0);
}
