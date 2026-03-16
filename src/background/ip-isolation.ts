/**
 * IP Isolation - Tracks IP addresses per container and warns on conflicts
 */

import browser from 'webextension-polyfill';
import type { SettingsStore } from './settings-store';
import type { ContainerManager } from './container-manager';
import type { IPRecord } from '@/types';
import { IP_PATTERNS, MAX_IP_URL_HISTORY } from '@/lib/constants';

export class IPIsolation {
  private settingsStore: SettingsStore;
  private containerManager: ContainerManager;

  constructor(settingsStore: SettingsStore, containerManager: ContainerManager) {
    this.settingsStore = settingsStore;
    this.containerManager = containerManager;
  }

  /**
   * Initialize IP isolation
   */
  async init(): Promise<void> {
    // Listen for navigation to IP addresses
    browser.webNavigation.onBeforeNavigate.addListener(
      (details) => this.handleBeforeNavigate(details)
    );

    console.log('[IPIsolation] Initialized');
  }

  /**
   * Check if a hostname is an IP address
   */
  isIPAddress(hostname: string): boolean {
    return IP_PATTERNS.IPV4.test(hostname) || IP_PATTERNS.IPV6.test(hostname);
  }

  /**
   * Check if an IP is a local network IP
   */
  isLocalIP(ip: string): boolean {
    return IP_PATTERNS.LOCAL_IPV4.test(ip);
  }

  /**
   * Check if an IP is localhost
   */
  isLocalhostIP(ip: string): boolean {
    return IP_PATTERNS.LOCALHOST.test(ip);
  }

  /**
   * Handle navigation before it happens
   */
  private async handleBeforeNavigate(
    details: browser.WebNavigation.OnBeforeNavigateDetailsType
  ): Promise<void> {
    // Only handle main frame navigation
    if (details.frameId !== 0 || details.tabId === -1) {
      return;
    }

    try {
      const url = new URL(details.url);
      const hostname = url.hostname;

      // Check if this is an IP address
      if (!this.isIPAddress(hostname)) {
        return;
      }

      // Get IP isolation settings
      const ipDatabase = this.settingsStore.getIPDatabase();
      const settings = ipDatabase.settings;

      // Check if IP isolation is enabled
      if (!settings.enabled) {
        return;
      }

      // Check if we should track this type of IP
      if (this.isLocalhostIP(hostname) && !settings.trackLocalhostIPs) {
        return;
      }

      if (this.isLocalIP(hostname) && !settings.trackLocalIPs) {
        return;
      }

      // Check if IP is in exceptions
      if (ipDatabase.exceptions.includes(hostname)) {
        return;
      }

      // Get current container
      const containerId = await this.containerManager.getContainerForTab(details.tabId);
      const containerName = this.containerManager.getContainerName(containerId);

      // Check if this IP was accessed from another container
      const existingRecord = ipDatabase.ipRecords[hostname];

      if (existingRecord && existingRecord.containerId !== containerId) {
        // IP conflict detected!
        await this.handleIPConflict(details.tabId, {
          ip: hostname,
          url: details.url,
          currentContainerId: containerId,
          currentContainerName: containerName,
          originalRecord: existingRecord,
          warnOnly: settings.warnOnly,
        });
      } else {
        // Record this IP access
        await this.recordIPAccess(hostname, containerId, containerName, details.url);
      }
    } catch (error) {
      console.error('[IPIsolation] Error:', error);
    }
  }

  /**
   * Record IP access for a container
   */
  async recordIPAccess(
    ip: string,
    containerId: string,
    containerName: string,
    url: string
  ): Promise<void> {
    const ipDatabase = this.settingsStore.getIPDatabase();
    const existingRecord = ipDatabase.ipRecords[ip];

    const urls = existingRecord?.urls || [];
    urls.unshift(url);

    const record: IPRecord = {
      ip,
      containerId,
      containerName,
      firstAccessed: existingRecord?.firstAccessed || Date.now(),
      lastAccessed: Date.now(),
      accessCount: (existingRecord?.accessCount || 0) + 1,
      urls: urls.slice(0, MAX_IP_URL_HISTORY),
    };

    await this.settingsStore.updateIPDatabase({
      ipRecords: {
        ...ipDatabase.ipRecords,
        [ip]: record,
      },
    });
  }

  /**
   * Handle IP conflict - show warning to user
   */
  private async handleIPConflict(
    tabId: number,
    conflict: {
      ip: string;
      url: string;
      currentContainerId: string;
      currentContainerName: string;
      originalRecord: IPRecord;
      warnOnly: boolean;
    }
  ): Promise<void> {
    console.warn('[IPIsolation] IP conflict detected:', conflict);

    if (conflict.warnOnly) {
      // Just log a warning notification
      await browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('icons/icon-48.png'),
        title: 'IP Address Conflict',
        message: `${conflict.ip} was previously accessed from "${conflict.originalRecord.containerName}"`,
      });

      // Still record the access
      await this.recordIPAccess(
        conflict.ip,
        conflict.currentContainerId,
        conflict.currentContainerName,
        conflict.url
      );
    } else {
      // Redirect to warning page
      const warningUrl = browser.runtime.getURL(
        `pages/ip-warning.html?${new URLSearchParams({
          ip: conflict.ip,
          url: conflict.url,
          currentContainer: conflict.currentContainerName,
          originalContainer: conflict.originalRecord.containerName,
          originalContainerId: conflict.originalRecord.containerId,
          lastAccessed: conflict.originalRecord.lastAccessed.toString(),
        }).toString()}`
      );

      await browser.tabs.update(tabId, { url: warningUrl });
    }
  }

  /**
   * Check if an IP would conflict with another container
   */
  checkIPConflict(
    ip: string,
    containerId: string
  ): { hasConflict: boolean; originalRecord?: IPRecord } {
    const ipDatabase = this.settingsStore.getIPDatabase();
    const record = ipDatabase.ipRecords[ip];

    if (record && record.containerId !== containerId) {
      return { hasConflict: true, originalRecord: record };
    }

    return { hasConflict: false };
  }

  /**
   * Clear IP record
   */
  async clearIPRecord(ip: string): Promise<void> {
    const ipDatabase = this.settingsStore.getIPDatabase();
    const { [ip]: _, ...remaining } = ipDatabase.ipRecords;

    await this.settingsStore.updateIPDatabase({
      ipRecords: remaining,
    });
  }

  /**
   * Add IP to exceptions
   */
  async addException(ip: string): Promise<void> {
    const ipDatabase = this.settingsStore.getIPDatabase();

    if (!ipDatabase.exceptions.includes(ip)) {
      await this.settingsStore.updateIPDatabase({
        exceptions: [...ipDatabase.exceptions, ip],
      });
    }
  }

  /**
   * Remove IP from exceptions
   */
  async removeException(ip: string): Promise<void> {
    const ipDatabase = this.settingsStore.getIPDatabase();

    await this.settingsStore.updateIPDatabase({
      exceptions: ipDatabase.exceptions.filter((e) => e !== ip),
    });
  }

  /**
   * Reassign IP to a different container
   */
  async reassignIP(ip: string, newContainerId: string): Promise<void> {
    const ipDatabase = this.settingsStore.getIPDatabase();
    const record = ipDatabase.ipRecords[ip];

    if (record) {
      const containerName = this.containerManager.getContainerName(newContainerId);

      await this.settingsStore.updateIPDatabase({
        ipRecords: {
          ...ipDatabase.ipRecords,
          [ip]: {
            ...record,
            containerId: newContainerId,
            containerName,
          },
        },
      });
    }
  }
}
