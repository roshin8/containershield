/**
 * Font Enumeration Spoofer - Prevents font fingerprinting
 *
 * Font fingerprinting works by:
 * 1. Measuring text rendered with specific fonts
 * 2. Checking which system fonts are available
 * 3. Using the unique combination of available fonts as an identifier
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';

// Common fonts that should be "available" on all systems
const COMMON_FONTS = [
  'Arial',
  'Arial Black',
  'Comic Sans MS',
  'Courier New',
  'Georgia',
  'Impact',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'Helvetica',
  'Tahoma',
];

// Fonts that fingerprinters often test for
const FINGERPRINT_FONTS = [
  'Abadi MT Condensed Light',
  'Academy Engraved LET',
  'ADOBE CASLON PRO',
  'Adobe Garamond',
  'ADOBE GARAMOND PRO',
  'Agency FB',
  'Aharoni',
  'Albertus Extra Bold',
  'Albertus Medium',
  'Algerian',
  'Amazone BT',
  'American Typewriter',
  'Andale Mono',
  'Andalus',
  'Angsana New',
  'AngsanaUPC',
  'Aparajita',
  'Apple Chancery',
  'Apple Color Emoji',
  'Apple SD Gothic Neo',
  'Arabic Typesetting',
  'ARCHER',
  'ARdistribution',
  'Arial Hebrew',
  'Arial MT',
  'Arial Narrow',
  'Arial Rounded MT Bold',
  'Arial Unicode MS',
  'ARNO PRO',
  'Arrus BT',
  'Aurora Cn BT',
  'AvantGarde Bk BT',
  'AvantGarde Md BT',
  'AVENIR',
  'Ayuthaya',
  'Bandy',
  'Bangla Sangam MN',
  'Bank Gothic',
  'BankGothic Md BT',
  'Baskerville',
  'Baskerville Old Face',
  'Batang',
  'BatangChe',
  'Bauer Bodoni',
  'Bauhaus 93',
  'Bazooka',
  'Bell MT',
  'Bembo',
  'Benguiat Bk BT',
  'Berlin Sans FB',
  'Berlin Sans FB Demi',
  'Bernard MT Condensed',
  'BernhardFashworkin BT',
  'BernhardMod BT',
  'Big Caslon',
  'BinnerD',
  'Bitstream Vera Sans Mono',
  'Blackadder ITC',
  'BlairMdITC TT',
  'Bodoni 72',
  'Bodoni 72 Oldstyle',
  'Bodoni 72 Smallcaps',
  'Bodoni MT',
  'Bodoni MT Black',
  'Bodoni MT Condensed',
  'Bodoni MT Poster Compressed',
  'Book Antiqua',
  'Bookman Old Style',
  'Bookshelf Symbol 7',
  'Boulder',
  'Bradley Hand',
  'Bradley Hand ITC',
  'Bremen Bd BT',
  'Britannic Bold',
  'Broadway',
  'Browallia New',
  'BrowalliaUPC',
  'Brush Script MT',
  'Calibri',
  'Californian FB',
  'Calisto MT',
  'Calligrapher',
  'Cambria',
  'Cambria Math',
  'Candara',
  'CaslopwnryEF Demi',
  'Castellar',
  'Centaur',
  'Century',
  'Century Gothic',
  'Century Schoolbook',
  'Cezanne',
  'CG Omega',
  'CG Times',
  'Chalkboard',
  'Chalkboard SE',
  'Chalkduster',
  'Charlesworth',
  'Charter Bd BT',
  'Charter BT',
  'Chaucer',
  'CheltshmITC Bk BT',
  'Chiller',
  'Clarendon',
  'Clarendon Condensed',
  'CloisterBlack BT',
  'Cochin',
  'Colonna MT',
  'Consolas',
  'Constantia',
  'Cooper Black',
  'Copperplate',
  'Copperplate Gothic Bold',
  'Copperplate Gothic Light',
  'CopswriterBlack BT',
  'Corbel',
  'Cordia New',
  'CordiaUPC',
];

/**
 * Initialize font enumeration spoofing
 */
export function initFontSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  // Select a subset of fonts to "have installed" based on container seed
  let availableFonts: Set<string>;

  if (mode === 'block') {
    // Only common fonts
    availableFonts = new Set(COMMON_FONTS);
  } else {
    // Random subset of fingerprint fonts + common fonts
    const shuffledFingerprint = prng.shuffle([...FINGERPRINT_FONTS]);
    const numExtra = prng.nextInt(5, 20);
    availableFonts = new Set([
      ...COMMON_FONTS,
      ...shuffledFingerprint.slice(0, numExtra),
    ]);
  }

  // Override document.fonts if available
  if ('fonts' in document && document.fonts) {
    const originalCheck = document.fonts.check.bind(document.fonts);

    document.fonts.check = function (font: string, text?: string): boolean {
      // Extract font family from font string (e.g., "12px Arial" -> "Arial")
      const fontFamily = extractFontFamily(font);

      if (fontFamily && !availableFonts.has(fontFamily)) {
        return false;
      }

      return originalCheck(font, text);
    };

    // Override FontFaceSet.prototype.check
    const originalFontFaceSetCheck = FontFaceSet.prototype.check;

    FontFaceSet.prototype.check = function (
      this: FontFaceSet,
      font: string,
      text?: string
    ): boolean {
      const fontFamily = extractFontFamily(font);

      if (fontFamily && !availableFonts.has(fontFamily)) {
        return false;
      }

      return originalFontFaceSetCheck.call(this, font, text);
    };
  }

  // Override CSS font-family resolution via computed styles
  // This is trickier - we intercept getComputedStyle
  const originalGetComputedStyle = window.getComputedStyle;

  window.getComputedStyle = function (
    element: Element,
    pseudoElt?: string | null
  ): CSSStyleDeclaration {
    const styles = originalGetComputedStyle.call(window, element, pseudoElt);

    // Return a proxy that filters font-family
    return new Proxy(styles, {
      get(target, prop) {
        const value = (target as any)[prop];

        if (prop === 'fontFamily' && typeof value === 'string') {
          // Filter to only available fonts
          const families = value.split(',').map((f) => f.trim().replace(/["']/g, ''));
          const filtered = families.filter(
            (f) => availableFonts.has(f) || f === 'serif' || f === 'sans-serif' || f === 'monospace'
          );
          return filtered.join(', ') || 'sans-serif';
        }

        if (typeof value === 'function') {
          return value.bind(target);
        }

        return value;
      },
    });
  };

  console.log(
    '[ChameleonContainers] Font spoofer initialized:',
    mode,
    `(${availableFonts.size} fonts)`
  );
}

/**
 * Extract font family name from CSS font string
 */
function extractFontFamily(font: string): string | null {
  // Handle formats like "12px Arial", "bold 14px/1.5 'Times New Roman'"
  const match = font.match(/(?:\d+(?:px|pt|em|rem|%)\s+)?['"]?([^'"]+)['"]?/i);
  if (match) {
    // Get the last part which should be the font family
    const parts = font.split(/\s+/);
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].replace(/["']/g, '');
      if (!part.match(/^\d+/) && !['bold', 'italic', 'normal', 'lighter', 'bolder'].includes(part.toLowerCase())) {
        return part;
      }
    }
  }
  return null;
}
