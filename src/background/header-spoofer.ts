/**
 * Header Spoofer - Modifies HTTP headers via webRequest API
 */

import browser from 'webextension-polyfill';
import type { SettingsStore } from './settings-store';
import type { ContainerManager } from './container-manager';

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

    return modifiedHeaders;
  }
}
