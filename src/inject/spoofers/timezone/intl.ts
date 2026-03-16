/**
 * Timezone Spoofer - Spoofs timezone and locale APIs
 * Uses assigned profile for guaranteed uniqueness across containers
 */

import type { TimezoneSpoofers, AssignedProfileData } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { farbleTimezoneOffset } from '@/lib/farbling';

// Timezone names corresponding to common offsets
const TIMEZONE_NAMES: Record<number, string> = {
  [-720]: 'Etc/GMT+12',
  [-660]: 'Pacific/Midway',
  [-600]: 'Pacific/Honolulu',
  [-540]: 'America/Anchorage',
  [-480]: 'America/Los_Angeles',
  [-420]: 'America/Denver',
  [-360]: 'America/Chicago',
  [-300]: 'America/New_York',
  [-240]: 'America/Halifax',
  [-180]: 'America/Sao_Paulo',
  [0]: 'UTC',
  [60]: 'Europe/Paris',
  [120]: 'Europe/Helsinki',
  [180]: 'Europe/Moscow',
  [330]: 'Asia/Kolkata',
  [480]: 'Asia/Shanghai',
  [540]: 'Asia/Tokyo',
  [600]: 'Australia/Sydney',
};

/**
 * Initialize timezone spoofing
 */
export function initTimezoneSpoofer(
  settings: TimezoneSpoofers,
  prng: PRNG,
  assignedProfile?: AssignedProfileData
): void {
  // Determine timezone offset to use - prefer assigned profile for uniqueness
  let targetOffset: number;
  let targetTimezone: string;

  if (assignedProfile?.timezoneOffset !== undefined) {
    // Use assigned profile value - guaranteed unique across containers
    targetOffset = assignedProfile.timezoneOffset;
    targetTimezone = TIMEZONE_NAMES[targetOffset] || 'UTC';
  } else {
    // Fallback to random
    targetOffset = farbleTimezoneOffset(prng);
    targetTimezone = TIMEZONE_NAMES[targetOffset] || 'UTC';
  }

  // Spoof Date.prototype.getTimezoneOffset
  if (settings.date !== 'off') {
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;

    Date.prototype.getTimezoneOffset = function (): number {
      if (settings.date === 'block') {
        return 0; // UTC
      }
      return -targetOffset; // getTimezoneOffset returns negative of offset
    };

    // Also spoof toLocaleString methods to be consistent
    const originalToLocaleString = Date.prototype.toLocaleString;
    const originalToLocaleDateString = Date.prototype.toLocaleDateString;
    const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;

    Date.prototype.toLocaleString = function (
      locales?: string | string[],
      options?: Intl.DateTimeFormatOptions
    ): string {
      return originalToLocaleString.call(this, locales, {
        ...options,
        timeZone: options?.timeZone || targetTimezone,
      });
    };

    Date.prototype.toLocaleDateString = function (
      locales?: string | string[],
      options?: Intl.DateTimeFormatOptions
    ): string {
      return originalToLocaleDateString.call(this, locales, {
        ...options,
        timeZone: options?.timeZone || targetTimezone,
      });
    };

    Date.prototype.toLocaleTimeString = function (
      locales?: string | string[],
      options?: Intl.DateTimeFormatOptions
    ): string {
      return originalToLocaleTimeString.call(this, locales, {
        ...options,
        timeZone: options?.timeZone || targetTimezone,
      });
    };
  }

  // Spoof Intl.DateTimeFormat
  if (settings.intl !== 'off') {
    const OriginalDateTimeFormat = Intl.DateTimeFormat;

    // @ts-ignore - We're replacing the constructor
    Intl.DateTimeFormat = function (
      locales?: string | string[],
      options?: Intl.DateTimeFormatOptions
    ): Intl.DateTimeFormat {
      return new OriginalDateTimeFormat(locales, {
        ...options,
        timeZone: options?.timeZone || targetTimezone,
      });
    };

    // Copy static methods
    Intl.DateTimeFormat.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf;

    // Override resolvedOptions to return our timezone
    const originalResolvedOptions =
      OriginalDateTimeFormat.prototype.resolvedOptions;

    OriginalDateTimeFormat.prototype.resolvedOptions = function (): Intl.ResolvedDateTimeFormatOptions {
      const options = originalResolvedOptions.call(this);
      if (!this.resolvedOptions.__originalTimeZone) {
        return {
          ...options,
          timeZone: targetTimezone,
        };
      }
      return options;
    };
  }

  console.log('[ChameleonContainers] Timezone spoofer initialized:', targetTimezone);
}
