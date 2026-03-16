/**
 * Feature Detection Spoofer
 *
 * Browser feature detection patterns can be used for fingerprinting.
 * This includes CSS support, JS API availability, etc.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';

/**
 * Initialize feature detection spoofing
 */
export function initFeatureSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  // Spoof CSS.supports()
  if (typeof CSS !== 'undefined' && CSS.supports) {
    const originalSupports = CSS.supports.bind(CSS);

    CSS.supports = function (
      propertyOrCondition: string,
      value?: string
    ): boolean {
      logAccess('CSS.supports', { spoofed: true });

      // In block mode, return true for common features, false for fingerprinting features
      if (mode === 'block') {
        const fingerPrintFeatures = [
          'backdrop-filter',
          'font-variation-settings',
          'image-rendering',
          'text-decoration-skip-ink',
        ];

        const prop = propertyOrCondition.toLowerCase();
        if (fingerPrintFeatures.some(f => prop.includes(f))) {
          return true; // Normalize to true
        }
      }

      if (value !== undefined) {
        return originalSupports(propertyOrCondition, value);
      }
      return originalSupports(propertyOrCondition);
    };
  }

  // Spoof document.implementation.hasFeature (deprecated but still used)
  if (document.implementation && document.implementation.hasFeature) {
    document.implementation.hasFeature = function (
      feature: string,
      version?: string
    ): boolean {
      logAccess('document.implementation.hasFeature', { spoofed: true });
      return true; // Always return true (it's deprecated anyway)
    };
  }

  // Spoof 'in' checks for sensitive APIs by ensuring consistent behavior
  // This is done by the individual spoofers for each API

  // Spoof navigator.pdfViewerEnabled
  if ('pdfViewerEnabled' in navigator) {
    try {
      Object.defineProperty(navigator, 'pdfViewerEnabled', {
        get: function () {
          logAccess('navigator.pdfViewerEnabled', { spoofed: true });
          return true; // Common value
        },
        configurable: true,
      });
    } catch {
      // Can't override
    }
  }

  // Spoof navigator.webdriver (bot detection)
  try {
    Object.defineProperty(navigator, 'webdriver', {
      get: function () {
        logAccess('navigator.webdriver', { spoofed: true });
        return false; // Not automated
      },
      configurable: true,
    });
  } catch {
    // Can't override
  }

  // Spoof navigator.doNotTrack
  try {
    Object.defineProperty(navigator, 'doNotTrack', {
      get: function () {
        logAccess('navigator.doNotTrack', { spoofed: true });
        return '1'; // DNT enabled
      },
      configurable: true,
    });
  } catch {
    // Can't override
  }

  // Spoof navigator.globalPrivacyControl
  try {
    Object.defineProperty(navigator, 'globalPrivacyControl', {
      get: function () {
        logAccess('navigator.globalPrivacyControl', { spoofed: true });
        return true; // GPC enabled
      },
      configurable: true,
    });
  } catch {
    // Can't override
  }

  // Spoof navigator.cookieEnabled
  try {
    Object.defineProperty(navigator, 'cookieEnabled', {
      get: function () {
        logAccess('navigator.cookieEnabled', { spoofed: true });
        return true;
      },
      configurable: true,
    });
  } catch {
    // Can't override
  }

  // Spoof navigator.onLine
  try {
    Object.defineProperty(navigator, 'onLine', {
      get: function () {
        logAccess('navigator.onLine', { spoofed: true });
        return true;
      },
      configurable: true,
    });
  } catch {
    // Can't override
  }

  // Spoof navigator.javaEnabled()
  if (navigator.javaEnabled) {
    navigator.javaEnabled = function (): boolean {
      logAccess('navigator.javaEnabled', { spoofed: true });
      return false; // Java is dead
    };
  }

  console.log('[ContainerShield] Feature detection spoofer initialized');
}
