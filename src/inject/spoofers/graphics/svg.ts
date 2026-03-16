/**
 * SVG Spoofer - Adds noise to SVG-based fingerprinting
 * SVG can be used for fingerprinting via:
 * - SVG filters (feConvolveMatrix, feTurbulence)
 * - SVG path rendering differences
 * - SVG text metrics
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { farbleDOMRect } from '@/lib/farbling';

/**
 * Initialize SVG spoofing
 */
export function initSVGSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  const maxNoise = mode === 'noise' ? 0.3 : 0;

  // Wrap SVGGraphicsElement.getBBox
  if (typeof SVGGraphicsElement !== 'undefined') {
    const originalGetBBox = SVGGraphicsElement.prototype.getBBox;

    SVGGraphicsElement.prototype.getBBox = function (
      this: SVGGraphicsElement,
      options?: SVGBoundingBoxOptions
    ): DOMRect {
      const bbox = originalGetBBox.call(this, options);

      if (mode === 'block') {
        return new DOMRect(0, 0, 0, 0);
      }

      const noisy = farbleDOMRect(bbox, prng, maxNoise);
      return new DOMRect(noisy.x, noisy.y, noisy.width, noisy.height);
    };

    // Wrap getCTM (Current Transformation Matrix)
    const originalGetCTM = SVGGraphicsElement.prototype.getCTM;

    SVGGraphicsElement.prototype.getCTM = function (
      this: SVGGraphicsElement
    ): DOMMatrix | null {
      const ctm = originalGetCTM.call(this);

      if (!ctm || mode === 'block') {
        return ctm;
      }

      // Add tiny noise to matrix values
      const noise = () => prng.nextNoise(0.0001);

      return new DOMMatrix([
        ctm.a + noise(),
        ctm.b + noise(),
        ctm.c + noise(),
        ctm.d + noise(),
        ctm.e + noise(),
        ctm.f + noise(),
      ]);
    };

    // Wrap getScreenCTM
    const originalGetScreenCTM = SVGGraphicsElement.prototype.getScreenCTM;

    SVGGraphicsElement.prototype.getScreenCTM = function (
      this: SVGGraphicsElement
    ): DOMMatrix | null {
      const ctm = originalGetScreenCTM.call(this);

      if (!ctm || mode === 'block') {
        return ctm;
      }

      const noise = () => prng.nextNoise(0.0001);

      return new DOMMatrix([
        ctm.a + noise(),
        ctm.b + noise(),
        ctm.c + noise(),
        ctm.d + noise(),
        ctm.e + noise(),
        ctm.f + noise(),
      ]);
    };
  }

  // Wrap SVGTextContentElement methods
  if (typeof SVGTextContentElement !== 'undefined') {
    // getComputedTextLength
    const originalGetComputedTextLength =
      SVGTextContentElement.prototype.getComputedTextLength;

    SVGTextContentElement.prototype.getComputedTextLength = function (
      this: SVGTextContentElement
    ): number {
      const length = originalGetComputedTextLength.call(this);

      if (mode === 'block') {
        return 0;
      }

      return length + prng.nextNoise(maxNoise);
    };

    // getSubStringLength
    const originalGetSubStringLength =
      SVGTextContentElement.prototype.getSubStringLength;

    SVGTextContentElement.prototype.getSubStringLength = function (
      this: SVGTextContentElement,
      charnum: number,
      nchars: number
    ): number {
      const length = originalGetSubStringLength.call(this, charnum, nchars);

      if (mode === 'block') {
        return 0;
      }

      return length + prng.nextNoise(maxNoise);
    };

    // getStartPositionOfChar
    const originalGetStartPositionOfChar =
      SVGTextContentElement.prototype.getStartPositionOfChar;

    SVGTextContentElement.prototype.getStartPositionOfChar = function (
      this: SVGTextContentElement,
      charnum: number
    ): DOMPoint {
      const point = originalGetStartPositionOfChar.call(this, charnum);

      if (mode === 'block') {
        return new DOMPoint(0, 0);
      }

      return new DOMPoint(
        point.x + prng.nextNoise(maxNoise),
        point.y + prng.nextNoise(maxNoise)
      );
    };

    // getEndPositionOfChar
    const originalGetEndPositionOfChar =
      SVGTextContentElement.prototype.getEndPositionOfChar;

    SVGTextContentElement.prototype.getEndPositionOfChar = function (
      this: SVGTextContentElement,
      charnum: number
    ): DOMPoint {
      const point = originalGetEndPositionOfChar.call(this, charnum);

      if (mode === 'block') {
        return new DOMPoint(0, 0);
      }

      return new DOMPoint(
        point.x + prng.nextNoise(maxNoise),
        point.y + prng.nextNoise(maxNoise)
      );
    };

    // getExtentOfChar
    const originalGetExtentOfChar =
      SVGTextContentElement.prototype.getExtentOfChar;

    SVGTextContentElement.prototype.getExtentOfChar = function (
      this: SVGTextContentElement,
      charnum: number
    ): DOMRect {
      const rect = originalGetExtentOfChar.call(this, charnum);

      if (mode === 'block') {
        return new DOMRect(0, 0, 0, 0);
      }

      const noisy = farbleDOMRect(rect, prng, maxNoise);
      return new DOMRect(noisy.x, noisy.y, noisy.width, noisy.height);
    };
  }

  // Wrap SVGGeometryElement methods
  if (typeof SVGGeometryElement !== 'undefined') {
    // getTotalLength
    const originalGetTotalLength = SVGGeometryElement.prototype.getTotalLength;

    SVGGeometryElement.prototype.getTotalLength = function (
      this: SVGGeometryElement
    ): number {
      const length = originalGetTotalLength.call(this);

      if (mode === 'block') {
        return 0;
      }

      return length + prng.nextNoise(maxNoise);
    };

    // getPointAtLength
    const originalGetPointAtLength =
      SVGGeometryElement.prototype.getPointAtLength;

    SVGGeometryElement.prototype.getPointAtLength = function (
      this: SVGGeometryElement,
      distance: number
    ): DOMPoint {
      const point = originalGetPointAtLength.call(this, distance);

      if (mode === 'block') {
        return new DOMPoint(0, 0);
      }

      return new DOMPoint(
        point.x + prng.nextNoise(maxNoise),
        point.y + prng.nextNoise(maxNoise)
      );
    };
  }

  console.log('[ChameleonContainers] SVG spoofer initialized:', mode);
}
