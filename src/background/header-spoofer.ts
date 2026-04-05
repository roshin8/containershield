/**
 * Header Spoofer - Modifies HTTP headers via webRequest API
 */

import browser from 'webextension-polyfill';
import type { SettingsStore } from './settings-store';
import type { ContainerManager } from './container-manager';
import type { HeaderConfig } from '@/types';

/**
 * Private IPv4 ranges that must be excluded from random generation.
 * Each entry is [startIP, endIP] as 32-bit unsigned integers.
 */
const PRIVATE_RANGES: [number, number][] = [
  [0x0A000000, 0x0AFFFFFF], // 10.0.0.0 – 10.255.255.255
  [0x64400000, 0x647FFFFF], // 100.64.0.0 – 100.127.255.255 (CGNAT)
  [0x7F000000, 0x7FFFFFFF], // 127.0.0.0 – 127.255.255.255
  [0xA9FE0000, 0xA9FEFFFF], // 169.254.0.0 – 169.254.255.255
  [0xAC100000, 0xAC1FFFFF], // 172.16.0.0 – 172.31.255.255
  [0xC0A80000, 0xC0A8FFFF], // 192.168.0.0 – 192.168.255.255
  [0xE0000000, 0xFFFFFFFF], // 224.0.0.0 – 255.255.255.255 (multicast + reserved)
  [0x00000000, 0x00FFFFFF], // 0.0.0.0 – 0.255.255.255
];

function ipToUint32(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function uint32ToIp(n: number): string {
  return [
    (n >>> 24) & 0xFF,
    (n >>> 16) & 0xFF,
    (n >>> 8) & 0xFF,
    n & 0xFF,
  ].join('.');
}

function isPrivateIP(ip: number): boolean {
  return PRIVATE_RANGES.some(([start, end]) => ip >= start && ip <= end);
}

/**
 * Generate a random public IPv4 address (not in any private/reserved range).
 */
function generateRandomPublicIPv4(): string {
  let ip: number;
  do {
    // Generate a random 32-bit unsigned integer
    ip = (Math.random() * 0xFFFFFFFF) >>> 0;
  } while (isPrivateIP(ip));
  return uint32ToIp(ip);
}

/**
 * Generate an IP from a range string like "1.1.1.1-2.2.2.2".
 */
function generateIPFromRange(range: string): string {
  const parts = range.split('-').map((s) => s.trim());
  if (parts.length !== 2) {
    return generateRandomPublicIPv4();
  }
  const start = ipToUint32(parts[0]);
  const end = ipToUint32(parts[1]);
  if (start > end || isNaN(start) || isNaN(end)) {
    return generateRandomPublicIPv4();
  }
  const ip = (start + Math.floor(Math.random() * (end - start + 1))) >>> 0;
  return uint32ToIp(ip);
}

/**
 * Random Via proxy version/pseudonym templates.
 */
const VIA_PROTOCOLS = ['1.0', '1.1', '2.0'];
const VIA_PSEUDONYMS = [
  'proxy', 'cache', 'edge', 'cdn', 'gateway', 'relay',
  'forward', 'node', 'hop', 'accelerator',
];

function generateViaHeader(): string {
  const proto = VIA_PROTOCOLS[Math.floor(Math.random() * VIA_PROTOCOLS.length)];
  const pseudonym = VIA_PSEUDONYMS[Math.floor(Math.random() * VIA_PSEUDONYMS.length)];
  const id = Math.floor(Math.random() * 900 + 100); // 3-digit number
  return `${proto} ${pseudonym}${id}`;
}

export class HeaderSpoofer {
  private settingsStore: SettingsStore;
  private containerManager: ContainerManager;

  constructor(settingsStore: SettingsStore, containerManager: ContainerManager) {
    this.settingsStore = settingsStore;
    this.containerManager = containerManager;
  }

  /**
   * Initialize header spoofing
   */
  async init(): Promise<void> {
    // Listen for outgoing requests
    browser.webRequest.onBeforeSendHeaders.addListener(
      (details) => this.handleBeforeSendHeaders(details),
      { urls: ['<all_urls>'] },
      ['blocking', 'requestHeaders']
    );

    console.log('[HeaderSpoofer] Initialized');
  }

  /**
   * Handle request headers before they're sent
   */
  private async handleBeforeSendHeaders(
    details: browser.WebRequest.OnBeforeSendHeadersDetailsType
  ): Promise<browser.WebRequest.BlockingResponse> {
    // Skip if no tab ID (e.g., service worker requests)
    if (details.tabId === -1) {
      return {};
    }

    try {
      // Get container for this tab
      const containerId = await this.containerManager.getContainerForTab(details.tabId);

      // Get settings for this container and domain
      const url = new URL(details.url);
      const settings = this.settingsStore.getSettingsForDomain(containerId, url.hostname);

      // Skip if protection is disabled
      if (!settings.enabled || settings.protectionLevel === 0) {
        return {};
      }

      // Modify headers
      const headers = this.modifyHeaders(
        details.requestHeaders || [],
        settings.headers,
        settings.profile
      );

      return { requestHeaders: headers };
    } catch (error) {
      console.error('[HeaderSpoofer] Error:', error);
      return {};
    }
  }

  /**
   * Modify headers based on settings
   */
  private modifyHeaders(
    headers: browser.WebRequest.HttpHeaders,
    headerSettings: import('@/types').HeaderConfig,
    profile: import('@/types').ProfileConfig
  ): browser.WebRequest.HttpHeaders {
    const modifiedHeaders = headers.map((header) => {
      const name = header.name.toLowerCase();

      // User-Agent
      if (name === 'user-agent' && headerSettings.spoofUserAgent && profile.userAgent) {
        return { name: header.name, value: profile.userAgent };
      }

      // Accept-Language
      if (name === 'accept-language' && headerSettings.spoofAcceptLanguage && profile.language) {
        return { name: header.name, value: profile.language };
      }

      // Referer
      if (name === 'referer' && headerSettings.refererPolicy !== 'off') {
        if (headerSettings.refererPolicy === 'origin') {
          // Send only origin
          try {
            const refererUrl = new URL(header.value || '');
            return { name: header.name, value: refererUrl.origin };
          } catch {
            return { name: header.name, value: '' };
          }
        } else if (headerSettings.refererPolicy === 'same-origin') {
          // Only send if same origin - handled by blocking below
          return header;
        }
      }

      return header;
    });

    // Remove ETag if disabled
    if (headerSettings.disableEtag) {
      const etagIndex = modifiedHeaders.findIndex(
        (h) => h.name.toLowerCase() === 'if-none-match'
      );
      if (etagIndex !== -1) {
        modifiedHeaders.splice(etagIndex, 1);
      }
    }

    // Add DNT header if enabled
    if (headerSettings.sendDNT) {
      const dntExists = modifiedHeaders.some((h) => h.name.toLowerCase() === 'dnt');
      if (!dntExists) {
        modifiedHeaders.push({ name: 'DNT', value: '1' });
      }
    }

    // Add X-Forwarded-For header if enabled
    if (headerSettings.spoofXForwardedFor) {
      const xffValue = this.generateXForwardedFor(headerSettings);
      // Remove any existing X-Forwarded-For header to avoid appending
      const xffIndex = modifiedHeaders.findIndex(
        (h) => h.name.toLowerCase() === 'x-forwarded-for'
      );
      if (xffIndex !== -1) {
        modifiedHeaders.splice(xffIndex, 1);
      }
      modifiedHeaders.push({ name: 'X-Forwarded-For', value: xffValue });
    }

    // Add Via header if enabled
    if (headerSettings.spoofVia) {
      const viaIndex = modifiedHeaders.findIndex(
        (h) => h.name.toLowerCase() === 'via'
      );
      if (viaIndex !== -1) {
        modifiedHeaders.splice(viaIndex, 1);
      }
      modifiedHeaders.push({ name: 'Via', value: generateViaHeader() });
    }

    return modifiedHeaders;
  }

  /**
   * Generate an X-Forwarded-For IP based on the current header settings mode.
   */
  private generateXForwardedFor(headerSettings: HeaderConfig): string {
    switch (headerSettings.xForwardedForMode) {
      case 'custom':
        return headerSettings.xForwardedForValue || generateRandomPublicIPv4();
      case 'range':
        return generateIPFromRange(headerSettings.xForwardedForValue);
      case 'random':
      default:
        return generateRandomPublicIPv4();
    }
  }
}
