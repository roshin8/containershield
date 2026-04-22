/**
 * Header Spoofer - Modifies HTTP headers and blocks tracking domains via webRequest API
 */

import browser from 'webextension-polyfill';
import type { SettingsStore } from './settings-store';
import type { ContainerManager } from './container-manager';
import type { HeaderConfig } from '@/types';
import { DNSProtection } from './dns-protection';

/** Default tracking domains — user can add/remove via UI */
export const DEFAULT_TRACKING_DOMAINS = [
  'device-metrics-us.amazon.com',
  'device-metrics-us-2.amazon.com',
];

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
  private blockedDomains: Set<string> = new Set(DEFAULT_TRACKING_DOMAINS);

  async init(): Promise<void> {
    // Load user-configured blocked domains
    try {
      const stored = await browser.storage.local.get('blockedTrackingDomains');
      if (stored.blockedTrackingDomains) {
        this.blockedDomains = new Set(stored.blockedTrackingDomains);
      }
    } catch {}

    // Block tracking domains and tracking pixels
    browser.webRequest.onBeforeRequest.addListener(
      (details) => {
        try {
          const url = new URL(details.url);

          // Block known tracking domains
          if (this.blockedDomains.has(url.hostname)) {
            return { cancel: true };
          }

          // Block DNS leak test domains (they reveal real ISP)
          if (DNSProtection.isDNSLeakTestDomain(url.hostname)) {
            return { cancel: true };
          }

          // Block tracking pixels (1x1 images used for event tracking)
          // Common patterns: /pixel, /beacon, /track, /collect, /log
          if (details.type === 'image') {
            const path = url.pathname.toLowerCase();
            const trackingPaths = ['/pixel', '/beacon', '/track', '/collect',
              '/log', '/analytics', '/telemetry', '/metrics', '/event'];
            if (trackingPaths.some(p => path.includes(p))) {
              return { cancel: true };
            }
          }
        } catch {}
        return {};
      },
      { urls: ['<all_urls>'] },
      ['blocking']
    );

    // Listen for outgoing requests — modify headers
    browser.webRequest.onBeforeSendHeaders.addListener(
      (details) => this.handleBeforeSendHeaders(details),
      { urls: ['<all_urls>'] },
      ['blocking', 'requestHeaders']
    );

    // Set container cookies on tab updates (loading state).
    // This fires when a tab starts navigating, before the page loads.
    browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status !== 'loading' || !tab.url || !tab.cookieStoreId) return;
      if (tab.url.startsWith('about:') || tab.url.startsWith('moz-extension:')) return;
      try {
        const containerId = tab.cookieStoreId;
        await this.settingsStore.ensureContainerSettings(containerId);
        await this.setContainerCookies(containerId, tab.url, containerId);
      } catch {}
    });
  }

  /**
   * Set cookies for the current active tab (called when settings change).
   */
  async refreshCookiesForTab(tabId: number): Promise<void> {
    try {
      const tab = await browser.tabs.get(tabId);
      if (!tab.url || !tab.cookieStoreId) return;
      await this.setContainerCookies(tab.cookieStoreId, tab.url, tab.cookieStoreId);
    } catch {}
  }

  /**
   * Set container seed + settings cookies via browser.cookies API.
   * Called from handleBeforeSendHeaders for main_frame requests.
   * Uses browser.cookies.set() because onHeadersReceived has tabId=-1 in Firefox MV3.
   */
  private async setContainerCookies(
    containerId: string, url: string, cookieStoreId: string
  ): Promise<void> {
    const entropy = this.settingsStore.getEntropy(containerId);
    if (!entropy?.seed) return;

    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    const cookieUrl = `${parsedUrl.protocol}//${domain}`;

    // 1. Container seed cookie (for per-container profile generation)
    // Short expiry (10s) — inject script reads at document_start then deletes.
    // Short-lived cookies minimize exposure to server-side bot detection.
    const seedPrefix = entropy.seed.substring(0, 16);
    await browser.cookies.set({
      url: cookieUrl,
      name: '_csid',
      value: seedPrefix,
      path: '/',
      sameSite: 'strict',
      expirationDate: Math.floor(Date.now() / 1000) + 10,
      storeId: cookieStoreId,
    });

    // 2. Settings cookie: encode non-default spoofer modes
    const settings = this.settingsStore.getSettingsForDomain(containerId, domain);
    const overrides: string[] = [];

    if (!settings.enabled) {
      overrides.push('_disabled');
    } else {
      for (const [category, signals] of Object.entries(settings.spoofers)) {
        if (typeof signals !== 'object' || signals === null) continue;
        for (const [signal, mode] of Object.entries(signals as Record<string, string>)) {
          if (mode !== 'noise') {
            overrides.push(`${category}.${signal}:${mode}`);
          }
        }
      }
    }

    if (overrides.length > 0) {
      await browser.cookies.set({
        url: cookieUrl,
        name: '_cscfg',
        value: encodeURIComponent(overrides.join(',')),
        path: '/',
        sameSite: 'strict',
        expirationDate: Math.floor(Date.now() / 1000) + 10,
        storeId: cookieStoreId,
      });
    } else {
      // Clear old overrides
      await browser.cookies.remove({ url: cookieUrl, name: '_cscfg', storeId: cookieStoreId }).catch(() => {});
    }
  }

  /** Update blocked domains list (called from message handler) */
  async updateBlockedDomains(domains: string[]): Promise<void> {
    this.blockedDomains = new Set(domains);
    await browser.storage.local.set({ blockedTrackingDomains: domains });
  }

  getBlockedDomains(): string[] {
    return [...this.blockedDomains];
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

      // Don't spoof User-Agent or Accept-Language headers.
      // The JS-level spoofing (navigator.userAgent etc.) is sufficient for
      // fingerprinting protection. Spoofing HTTP headers causes mismatches
      // with TLS fingerprint, HTTP/2 settings, and header ordering that
      // sophisticated servers (Amazon, Cloudflare) detect → 503 blocks.
      // Only apply non-UA header modifications (ETag, DNT, X-Forwarded-For, Via).
      const safeProfile: Record<string, any> = { ...settings.profile, userAgent: undefined, language: undefined };
      const headers = this.modifyHeaders(
        details.requestHeaders || [],
        settings.headers,
        safeProfile
      );
      return { requestHeaders: headers };
    } catch {
      return {};
    }
  }

  /**
   * Reorder HTTP headers to match the spoofed browser's typical order.
   * Chrome and Firefox send headers in different orders — a mismatch
   * reveals the real browser even if UA is spoofed.
   */
  private reorderHeaders(
    headers: browser.WebRequest.HttpHeaders,
    profile: import('@/types').ProfileConfig
  ): browser.WebRequest.HttpHeaders {
    const ua = profile.userAgent || '';
    const isChrome = ua.includes('Chrome/') && !ua.includes('Firefox/');

    // Chrome typical order: Host, Connection, sec-ch-ua, sec-ch-ua-mobile,
    // sec-ch-ua-platform, Upgrade-Insecure-Requests, User-Agent, Accept,
    // Sec-Fetch-Site, Sec-Fetch-Mode, Sec-Fetch-User, Sec-Fetch-Dest,
    // Accept-Encoding, Accept-Language
    const chromeOrder = [
      'host', 'connection', 'cache-control', 'sec-ch-ua', 'sec-ch-ua-mobile',
      'sec-ch-ua-platform', 'upgrade-insecure-requests', 'user-agent',
      'accept', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-user',
      'sec-fetch-dest', 'accept-encoding', 'accept-language', 'cookie',
    ];

    // Firefox typical order: Host, User-Agent, Accept, Accept-Language,
    // Accept-Encoding, Connection, Cookie, Upgrade-Insecure-Requests
    const firefoxOrder = [
      'host', 'user-agent', 'accept', 'accept-language', 'accept-encoding',
      'connection', 'cookie', 'upgrade-insecure-requests',
      'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-user',
    ];

    const order = isChrome ? chromeOrder : firefoxOrder;
    const headerMap = new Map<string, browser.WebRequest.HttpHeaders[0]>();
    const remaining: browser.WebRequest.HttpHeaders = [];

    for (const h of headers) {
      headerMap.set(h.name.toLowerCase(), h);
    }

    const sorted: browser.WebRequest.HttpHeaders = [];
    for (const name of order) {
      const h = headerMap.get(name);
      if (h) {
        sorted.push(h);
        headerMap.delete(name);
      }
    }
    // Append remaining headers not in the known order
    for (const h of headerMap.values()) {
      sorted.push(h);
    }

    return sorted;
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
