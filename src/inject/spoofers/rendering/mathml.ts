/**
 * MathML Rendering Spoofer
 *
 * MathML element rendering can be used for fingerprinting
 * as different browsers render mathematical notation differently.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';

/**
 * Initialize MathML rendering spoofing
 */
export function initMathMLSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  // MathML fingerprinting typically uses getBoundingClientRect on math elements
  // We already spoof DOMRect, but we can add MathML-specific detection

  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

  Element.prototype.getBoundingClientRect = function (): DOMRect {
    const rect = originalGetBoundingClientRect.call(this);

    // Check if this is a MathML element
    const isMathElement = this.namespaceURI === 'http://www.w3.org/1998/Math/MathML' ||
      this.tagName.toLowerCase().startsWith('math') ||
      this.closest('math') !== null;

    if (isMathElement) {
      logAccess('MathML.getBoundingClientRect', { spoofed: true });

      if (mode === 'block') {
        return new DOMRect(0, 0, 0, 0);
      }

      // Add noise to MathML element measurements
      const noise = () => prng.nextNoise(0.5);
      return new DOMRect(
        rect.x + noise(),
        rect.y + noise(),
        rect.width + noise(),
        rect.height + noise()
      );
    }

    return rect;
  };

  // Also spoof getComputedStyle for math elements
  const originalGetComputedStyle = window.getComputedStyle;

  window.getComputedStyle = function (
    element: Element,
    pseudoElt?: string | null
  ): CSSStyleDeclaration {
    const style = originalGetComputedStyle.call(window, element, pseudoElt);

    const isMathElement = element.namespaceURI === 'http://www.w3.org/1998/Math/MathML' ||
      element.tagName.toLowerCase().startsWith('math') ||
      element.closest('math') !== null;

    if (isMathElement) {
      logAccess('MathML.getComputedStyle', { spoofed: true });
    }

    return style;
  };

  console.log('[ContainerShield] MathML spoofer initialized');
}
