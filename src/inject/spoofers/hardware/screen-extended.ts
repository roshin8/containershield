/**
 * Screen Extended Spoofer
 *
 * screen.isExtended reveals multi-monitor setups.
 * Fingerprint.com uses this to identify desktop configurations.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { overrideGetterWithValue } from '@/lib/stealth';
import { logAccess } from '../../monitor/fingerprint-monitor';

export function initScreenExtendedSpoofer(mode: ProtectionMode, _prng: PRNG): void {
  if (mode === 'off') return;

  if ('isExtended' in Screen.prototype) {
    overrideGetterWithValue(Screen.prototype, 'isExtended', () => {
      logAccess('screen.isExtended', { spoofed: true, value: 'false (single)' });
      return false;
    });
  }
}
