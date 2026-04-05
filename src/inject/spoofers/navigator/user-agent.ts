/**
 * Navigator Spoofer - Spoofs navigator properties
 * Uses assigned profile for guaranteed uniqueness across containers.
 * Overrides on PROTOTYPE level to match native descriptor behavior.
 */

import type { NavigatorSpoofers, ProfileConfig, AssignedProfileData } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { overrideGetter, overrideGetterWithValue, overrideValue } from '@/lib/stealth';
import { logAccess, markNavigatorSpoofed } from '../../monitor/fingerprint-monitor';

const PLATFORMS = ['Win32', 'MacIntel', 'Linux x86_64'];
const VENDORS = ['Google Inc.', '', 'Apple Computer, Inc.'];
const LANGUAGES = [
  ['en-US', 'en'],
  ['en-GB', 'en'],
  ['en-US'],
  ['de-DE', 'de', 'en-US', 'en'],
  ['fr-FR', 'fr', 'en-US', 'en'],
];

export function initNavigatorSpoofer(
  settings: NavigatorSpoofers,
  prng: PRNG,
  profile: ProfileConfig,
  assignedProfile?: AssignedProfileData
): void {
  if (settings.userAgent !== 'off') {
    markNavigatorSpoofed(settings.userAgent);
  }

  const uaProfile = assignedProfile?.userAgent;
  const languages = assignedProfile?.languages || prng.pick(LANGUAGES);

  // Spoof userAgent on Navigator.prototype (not instance)
  if (settings.userAgent !== 'off') {
    const userAgent = uaProfile?.userAgent || profile.userAgent;
    const uaName = uaProfile?.name || (userAgent ? userAgent.substring(0, 40) : undefined);

    let navigatorLogged = false;
    const logNav = () => {
      if (!navigatorLogged) {
        logAccess('navigator.userAgent', { spoofed: true, value: uaName });
        navigatorLogged = true;
      }
    };

    if (userAgent) {
      overrideGetter(Navigator.prototype, 'userAgent', () => {
        logNav();
        return userAgent;
      });

      const appVersion = uaProfile?.appVersion || userAgent.replace(/^Mozilla\//, '');
      overrideGetter(Navigator.prototype, 'appVersion', () => {
        logNav();
        return appVersion;
      });
    }

    // Platform
    const platform = uaProfile?.platform || profile.platform || prng.pick(PLATFORMS);
    overrideGetter(Navigator.prototype, 'platform', () => {
      logNav();
      return platform;
    });

    // Vendor
    const vendor = uaProfile?.vendor ?? prng.pick(VENDORS);
    overrideGetter(Navigator.prototype, 'vendor', () => {
      logNav();
      return vendor;
    });
  }

  // Languages
  if (settings.languages !== 'off') {
    const langArray: readonly string[] =
      profile.language
        ? [profile.language, profile.language.split('-')[0]]
        : languages;
    const frozenLangs = Object.freeze([...langArray]);

    let langsLogged = false;
    const logLangs = () => {
      if (!langsLogged) {
        logAccess('navigator.languages', { spoofed: true, value: langArray.join(', ') });
        langsLogged = true;
      }
    };

    overrideGetter(Navigator.prototype, 'languages', () => {
      logLangs();
      return frozenLangs;
    });

    overrideGetter(Navigator.prototype, 'language', () => {
      logLangs();
      return langArray[0];
    });
  }

  // Plugins - spoof to match the profile's browser
  if (settings.plugins !== 'off') {
    // Chrome/Edge report 5 standard plugins, Firefox reports 5 since FF87+
    const STANDARD_PLUGINS = [
      { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    ];

    const fakePluginArray = Object.create(PluginArray.prototype);
    Object.defineProperty(fakePluginArray, 'length', { value: STANDARD_PLUGINS.length });
    Object.defineProperty(fakePluginArray, 'item', { value: (i: number) => i < STANDARD_PLUGINS.length ? STANDARD_PLUGINS[i] : null });
    Object.defineProperty(fakePluginArray, 'namedItem', { value: (name: string) => STANDARD_PLUGINS.find(p => p.name === name) || null });
    Object.defineProperty(fakePluginArray, 'refresh', { value: () => {} });
    // Make it iterable
    for (let i = 0; i < STANDARD_PLUGINS.length; i++) {
      Object.defineProperty(fakePluginArray, i, { value: STANDARD_PLUGINS[i], enumerable: true });
    }

    const emptyPluginArray = fakePluginArray;

    overrideGetter(Navigator.prototype, 'plugins', () => emptyPluginArray);

    const emptyMimeTypeArray = Object.create(MimeTypeArray.prototype);
    Object.defineProperty(emptyMimeTypeArray, 'length', { value: 0 });
    Object.defineProperty(emptyMimeTypeArray, 'item', { value: () => null });
    Object.defineProperty(emptyMimeTypeArray, 'namedItem', { value: () => null });

    overrideGetter(Navigator.prototype, 'mimeTypes', () => emptyMimeTypeArray);
  }

  // Client Hints (userAgentData)
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
        logAccess('navigator.userAgentData.getHighEntropyValues', { spoofed: true });
        return {
          brands, mobile, platform: platformName,
          architecture: 'x86', bitness: '64', model: '',
          platformVersion, uaFullVersion: brands[0].version + '.0.0.0',
          fullVersionList: brands,
        };
      },
      toJSON: () => ({ brands, mobile, platform: platformName }),
    };

    overrideGetter(Navigator.prototype, 'userAgentData', () => {
      logAccess('navigator.userAgentData', { spoofed: true });
      return spoofedUserAgentData;
    });
  }
}
