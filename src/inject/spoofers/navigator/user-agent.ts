/**
 * Navigator Spoofer - Spoofs navigator properties
 * Uses assigned profile for guaranteed uniqueness across containers
 */

import type { NavigatorSpoofers, ProfileConfig, AssignedProfileData } from '@/types';
import type { PRNG } from '@/lib/crypto';

// Fallback values if no assigned profile
const PLATFORMS = ['Win32', 'MacIntel', 'Linux x86_64'];
const VENDORS = ['Google Inc.', '', 'Apple Computer, Inc.'];
const LANGUAGES = [
  ['en-US', 'en'],
  ['en-GB', 'en'],
  ['en-US'],
  ['de-DE', 'de', 'en-US', 'en'],
  ['fr-FR', 'fr', 'en-US', 'en'],
];

/**
 * Initialize navigator spoofing
 */
export function initNavigatorSpoofer(
  settings: NavigatorSpoofers,
  prng: PRNG,
  profile: ProfileConfig,
  assignedProfile?: AssignedProfileData
): void {
  // Get values from assigned profile (unique per container) or fall back to random
  const uaProfile = assignedProfile?.userAgent;
  const languages = assignedProfile?.languages || prng.pick(LANGUAGES);

  // Spoof userAgent - prefer assigned profile for uniqueness
  if (settings.userAgent !== 'off') {
    const userAgent = uaProfile?.userAgent || profile.userAgent;

    if (userAgent) {
      Object.defineProperty(navigator, 'userAgent', {
        value: userAgent,
        configurable: true,
        enumerable: true,
      });

      // Also spoof appVersion
      const appVersion = uaProfile?.appVersion || userAgent.replace(/^Mozilla\//, '');
      Object.defineProperty(navigator, 'appVersion', {
        value: appVersion,
        configurable: true,
        enumerable: true,
      });
    }
  }

  // Spoof platform - use assigned profile
  if (settings.userAgent !== 'off') {
    const platform = uaProfile?.platform || profile.platform || prng.pick(PLATFORMS);

    Object.defineProperty(navigator, 'platform', {
      value: platform,
      configurable: true,
      enumerable: true,
    });
  }

  // Spoof vendor - use assigned profile
  if (settings.userAgent !== 'off') {
    const vendor = uaProfile?.vendor ?? prng.pick(VENDORS);

    Object.defineProperty(navigator, 'vendor', {
      value: vendor,
      configurable: true,
      enumerable: true,
    });
  }

  // Spoof languages - use assigned profile for uniqueness
  if (settings.languages !== 'off') {
    const langArray: readonly string[] =
      profile.language
        ? [profile.language, profile.language.split('-')[0]]
        : languages;

    Object.defineProperty(navigator, 'languages', {
      value: Object.freeze(langArray),
      configurable: true,
      enumerable: true,
    });

    Object.defineProperty(navigator, 'language', {
      value: langArray[0],
      configurable: true,
      enumerable: true,
    });
  }

  // Spoof plugins
  if (settings.plugins !== 'off') {
    const emptyPluginArray = Object.create(PluginArray.prototype);
    Object.defineProperty(emptyPluginArray, 'length', { value: 0 });
    Object.defineProperty(emptyPluginArray, 'item', { value: () => null });
    Object.defineProperty(emptyPluginArray, 'namedItem', { value: () => null });
    Object.defineProperty(emptyPluginArray, 'refresh', { value: () => {} });

    Object.defineProperty(navigator, 'plugins', {
      value: emptyPluginArray,
      configurable: true,
      enumerable: true,
    });

    const emptyMimeTypeArray = Object.create(MimeTypeArray.prototype);
    Object.defineProperty(emptyMimeTypeArray, 'length', { value: 0 });
    Object.defineProperty(emptyMimeTypeArray, 'item', { value: () => null });
    Object.defineProperty(emptyMimeTypeArray, 'namedItem', { value: () => null });

    Object.defineProperty(navigator, 'mimeTypes', {
      value: emptyMimeTypeArray,
      configurable: true,
      enumerable: true,
    });
  }

  // Spoof Client Hints (userAgentData) - use assigned profile
  if (settings.clientHints !== 'off' && 'userAgentData' in navigator) {
    const brands = uaProfile?.brands || [
      { brand: 'Chromium', version: prng.pick(['120', '121', '122', '123']) },
      { brand: 'Not_A Brand', version: '8' },
    ];

    const platformName = uaProfile?.platformName || 'Windows';
    const platformVersion = uaProfile?.platformVersion || '10.0.0';
    const mobile = uaProfile?.mobile ?? false;

    const spoofedUserAgentData = {
      brands,
      mobile,
      platform: platformName,
      getHighEntropyValues: async () => {
        return {
          brands,
          mobile,
          platform: platformName,
          architecture: 'x86',
          bitness: '64',
          model: '',
          platformVersion,
          uaFullVersion: brands[0].version + '.0.0.0',
          fullVersionList: brands,
        };
      },
      toJSON: () => ({ brands, mobile, platform: platformName }),
    };

    Object.defineProperty(navigator, 'userAgentData', {
      value: spoofedUserAgentData,
      configurable: true,
      enumerable: true,
    });
  }

  console.log(
    '[ChameleonContainers] Navigator spoofer initialized:',
    uaProfile?.name || 'fallback'
  );
}
