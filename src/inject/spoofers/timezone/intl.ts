/**
 * Timezone Spoofer - Spoofs timezone and locale APIs
 * Uses assigned profile for guaranteed uniqueness across containers
 */

import type { TimezoneSpoofers, AssignedProfileData } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { farbleTimezoneOffset } from '@/lib/farbling';
import { overrideMethod } from '@/lib/stealth';
import { logAccess } from '../../monitor/fingerprint-monitor';

// Timezone IANA names for all common offsets (minutes from UTC)
const TIMEZONE_NAMES: Record<number, string> = {
  [-720]: 'Etc/GMT+12',
  [-660]: 'Pacific/Midway',
  [-600]: 'Pacific/Honolulu',
  [-570]: 'Pacific/Marquesas',
  [-540]: 'America/Anchorage',
  [-480]: 'America/Los_Angeles',
  [-420]: 'America/Denver',
  [-360]: 'America/Chicago',
  [-300]: 'America/New_York',
  [-240]: 'America/Halifax',
  [-210]: 'America/St_Johns',
  [-180]: 'America/Sao_Paulo',
  [-120]: 'Atlantic/South_Georgia',
  [-60]: 'Atlantic/Azores',
  [0]: 'UTC',
  [60]: 'Europe/Paris',
  [120]: 'Europe/Helsinki',
  [180]: 'Europe/Moscow',
  [210]: 'Asia/Tehran',
  [240]: 'Asia/Dubai',
  [270]: 'Asia/Kabul',
  [300]: 'Asia/Karachi',
  [330]: 'Asia/Kolkata',
  [345]: 'Asia/Kathmandu',
  [360]: 'Asia/Dhaka',
  [390]: 'Asia/Yangon',
  [420]: 'Asia/Bangkok',
  [480]: 'Asia/Shanghai',
  [540]: 'Asia/Tokyo',
  [570]: 'Australia/Adelaide',
  [600]: 'Australia/Sydney',
  [660]: 'Pacific/Guadalcanal',
  [720]: 'Pacific/Auckland',
  [780]: 'Pacific/Apia',
};

// Map language codes to likely timezone offsets
const LANGUAGE_TIMEZONE: Record<string, { offset: number; tz: string }> = {
  'ja': { offset: 540, tz: 'Asia/Tokyo' },
  'ko': { offset: 540, tz: 'Asia/Seoul' },
  'zh': { offset: 480, tz: 'Asia/Shanghai' },
  'fr': { offset: 60, tz: 'Europe/Paris' },
  'de': { offset: 60, tz: 'Europe/Berlin' },
  'it': { offset: 60, tz: 'Europe/Rome' },
  'es': { offset: 60, tz: 'Europe/Madrid' },
  'pt': { offset: -180, tz: 'America/Sao_Paulo' },
  'ru': { offset: 180, tz: 'Europe/Moscow' },
  'ar': { offset: 180, tz: 'Asia/Riyadh' },
  'hi': { offset: 330, tz: 'Asia/Kolkata' },
  'th': { offset: 420, tz: 'Asia/Bangkok' },
  'vi': { offset: 420, tz: 'Asia/Ho_Chi_Minh' },
  'tr': { offset: 180, tz: 'Europe/Istanbul' },
  'pl': { offset: 60, tz: 'Europe/Warsaw' },
  'nl': { offset: 60, tz: 'Europe/Amsterdam' },
  'sv': { offset: 60, tz: 'Europe/Stockholm' },
  'da': { offset: 60, tz: 'Europe/Copenhagen' },
  'fi': { offset: 120, tz: 'Europe/Helsinki' },
  'no': { offset: 60, tz: 'Europe/Oslo' },
  'he': { offset: 120, tz: 'Asia/Jerusalem' },
  'uk': { offset: 120, tz: 'Europe/Kyiv' },
  'en': { offset: -300, tz: 'America/New_York' },
};

/**
 * Initialize timezone spoofing
 */
export function initTimezoneSpoofer(
  settings: TimezoneSpoofers,
  prng: PRNG,
  assignedProfile?: AssignedProfileData
): void {
  // Determine timezone - prefer assigned profile, then infer from language
  let targetOffset: number;
  let targetTimezone: string;

  if (assignedProfile?.timezoneOffset !== undefined) {
    targetOffset = assignedProfile.timezoneOffset;
    targetTimezone = TIMEZONE_NAMES[targetOffset] || 'UTC';

    // If timezone name doesn't match, try to get a better one from language
    if (targetTimezone === 'UTC' && assignedProfile?.languages?.length) {
      const lang = assignedProfile.languages[0].split('-')[0];
      const langTZ = LANGUAGE_TIMEZONE[lang];
      if (langTZ && langTZ.offset === targetOffset) {
        targetTimezone = langTZ.tz;
      }
    }
  } else if (assignedProfile?.languages?.length) {
    // Infer timezone from language
    const lang = assignedProfile.languages[0].split('-')[0];
    const langTZ = LANGUAGE_TIMEZONE[lang];
    if (langTZ) {
      targetOffset = langTZ.offset;
      targetTimezone = langTZ.tz;
    } else {
      targetOffset = farbleTimezoneOffset(prng);
      targetTimezone = TIMEZONE_NAMES[targetOffset] || 'UTC';
    }
  } else {
    targetOffset = farbleTimezoneOffset(prng);
    targetTimezone = TIMEZONE_NAMES[targetOffset] || 'UTC';
  }

  // Spoof Date.prototype.getTimezoneOffset
  if (settings.date !== 'off') {
    let tzLogged = false;
    overrideMethod(Date.prototype, 'getTimezoneOffset', () => {
      if (!tzLogged) {
        logAccess('Date.getTimezoneOffset', { spoofed: true, value: targetTimezone });
        tzLogged = true;
      }
      return settings.date === 'block' ? 0 : -targetOffset;
    });

    // Also spoof toLocaleString methods to be consistent
    overrideMethod(Date.prototype, 'toLocaleString', (original, thisArg, args) => {
      const locales = args[0] as string | string[] | undefined;
      const options = args[1] as Intl.DateTimeFormatOptions | undefined;
      return original.call(thisArg, locales, {
        ...options,
        timeZone: options?.timeZone || targetTimezone,
      });
    });

    overrideMethod(Date.prototype, 'toLocaleDateString', (original, thisArg, args) => {
      const locales = args[0] as string | string[] | undefined;
      const options = args[1] as Intl.DateTimeFormatOptions | undefined;
      return original.call(thisArg, locales, {
        ...options,
        timeZone: options?.timeZone || targetTimezone,
      });
    });

    overrideMethod(Date.prototype, 'toLocaleTimeString', (original, thisArg, args) => {
      const locales = args[0] as string | string[] | undefined;
      const options = args[1] as Intl.DateTimeFormatOptions | undefined;
      return original.call(thisArg, locales, {
        ...options,
        timeZone: options?.timeZone || targetTimezone,
      });
    });
  }

  // Spoof Intl.DateTimeFormat
  if (settings.intl !== 'off') {
    const OriginalDateTimeFormat = Intl.DateTimeFormat;

    let intlLogged = false;
    // @ts-ignore - We're replacing the constructor
    Intl.DateTimeFormat = function (
      locales?: string | string[],
      options?: Intl.DateTimeFormatOptions
    ): Intl.DateTimeFormat {
      if (!intlLogged) {
        logAccess('Intl.DateTimeFormat', { spoofed: true, value: targetTimezone });
        intlLogged = true;
      }
      return new OriginalDateTimeFormat(locales, {
        ...options,
        timeZone: options?.timeZone || targetTimezone,
      });
    };

    // Copy static methods
    Intl.DateTimeFormat.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf;

    // Override resolvedOptions to return our timezone
    overrideMethod(OriginalDateTimeFormat.prototype, 'resolvedOptions', (original, thisArg, _args) => {
      const options = original.call(thisArg) as Intl.ResolvedDateTimeFormatOptions;
      if (!(thisArg as any).resolvedOptions.__originalTimeZone) {
        return {
          ...options,
          timeZone: targetTimezone,
        };
      }
      return options;
    });
  }

  console.log('[ContainerShield] Timezone spoofer initialized:', targetTimezone);
}
