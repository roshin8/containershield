/**
 * Message Handler - Routes messages between extension components
 */

import browser from 'webextension-polyfill';
import type { SettingsStore } from './settings-store';
import type { ContainerManager } from './container-manager';
import type { IPIsolation } from './ip-isolation';
import type { ExtensionMessage, InjectConfig, AssignedProfileData } from '@/types';
import { ensureUniqueProfile, type AssignedProfile } from './profile-manager';

export class MessageHandler {
  private settingsStore: SettingsStore;
  private containerManager: ContainerManager;
  private ipIsolation: IPIsolation;

  constructor(
    settingsStore: SettingsStore,
    containerManager: ContainerManager,
    ipIsolation: IPIsolation
  ) {
    this.settingsStore = settingsStore;
    this.containerManager = containerManager;
    this.ipIsolation = ipIsolation;
  }

  /**
   * Initialize message handling
   */
  init(): void {
    browser.runtime.onMessage.addListener((message, sender) =>
      this.handleMessage(message as ExtensionMessage, sender)
    );

    console.log('[MessageHandler] Initialized');
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(
    message: ExtensionMessage,
    sender: browser.Runtime.MessageSender
  ): Promise<unknown> {
    switch (message.type) {
      case 'GET_SETTINGS':
        return this.handleGetSettings(message);

      case 'SET_SETTINGS':
        return this.handleSetSettings(message);

      case 'GET_ENTROPY':
        return this.handleGetEntropy(message);

      case 'GET_CONTAINER_INFO':
        return this.handleGetContainerInfo(message, sender);

      case 'GET_ALL_CONTAINERS':
        return this.handleGetAllContainers();

      case 'IP_CONFLICT_CHECK':
        return this.handleIPConflictCheck(message);

      case 'INJECT_CONFIG':
        return this.handleGetInjectConfig(sender);

      default:
        console.warn('[MessageHandler] Unknown message type:', (message as any).type);
        return null;
    }
  }

  /**
   * Handle GET_SETTINGS request
   */
  private handleGetSettings(message: import('@/types').GetSettingsMessage) {
    const { containerId, domain } = message;

    if (domain) {
      return this.settingsStore.getSettingsForDomain(containerId, domain);
    }

    return this.settingsStore.getContainerSettings(containerId);
  }

  /**
   * Handle SET_SETTINGS request
   */
  private async handleSetSettings(message: import('@/types').SetSettingsMessage) {
    const { containerId, settings } = message;
    await this.settingsStore.updateContainerSettings(containerId, settings);
    return { success: true };
  }

  /**
   * Handle GET_ENTROPY request
   */
  private handleGetEntropy(message: import('@/types').GetEntropyMessage) {
    const { containerId } = message;
    return this.settingsStore.getEntropy(containerId);
  }

  /**
   * Handle GET_CONTAINER_INFO request
   */
  private async handleGetContainerInfo(
    message: import('@/types').GetContainerInfoMessage,
    sender: browser.Runtime.MessageSender
  ) {
    const tabId = message.tabId ?? sender.tab?.id;

    if (!tabId) {
      return { containerId: 'firefox-default', containerName: 'Default' };
    }

    const containerId = await this.containerManager.getContainerForTab(tabId);
    const container = this.containerManager.getContainer(containerId);

    return {
      containerId,
      containerName: container?.name || 'Unknown',
      containerColor: container?.color || 'toolbar',
      containerIcon: container?.icon || 'circle',
    };
  }

  /**
   * Handle GET_ALL_CONTAINERS request
   */
  private handleGetAllContainers() {
    return this.containerManager.getAllContainers();
  }

  /**
   * Handle IP_CONFLICT_CHECK request
   */
  private handleIPConflictCheck(message: import('@/types').IPConflictCheckMessage) {
    const { ip, containerId } = message;
    return this.ipIsolation.checkIPConflict(ip, containerId);
  }

  /**
   * Handle INJECT_CONFIG request - prepare config for page context injection
   */
  private async handleGetInjectConfig(
    sender: browser.Runtime.MessageSender
  ): Promise<InjectConfig | null> {
    const tabId = sender.tab?.id;
    const url = sender.tab?.url || sender.url;

    if (!tabId || !url) {
      return null;
    }

    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname;

      const containerId = await this.containerManager.getContainerForTab(tabId);
      const settings = this.settingsStore.getSettingsForDomain(containerId, domain);
      const entropy = this.settingsStore.getEntropy(containerId);

      if (!entropy) {
        return null;
      }

      // Get or create unique profile for this container
      const assignedProfile = await ensureUniqueProfile(entropy);

      // Convert to serializable format for injection
      const assignedProfileData: AssignedProfileData = {
        userAgent: {
          id: assignedProfile.userAgent.id,
          name: assignedProfile.userAgent.name,
          userAgent: assignedProfile.userAgent.userAgent,
          platform: assignedProfile.userAgent.platform,
          vendor: assignedProfile.userAgent.vendor,
          appVersion: assignedProfile.userAgent.appVersion,
          oscpu: assignedProfile.userAgent.oscpu,
          mobile: assignedProfile.userAgent.mobile,
          platformName: assignedProfile.userAgent.platformName,
          platformVersion: assignedProfile.userAgent.platformVersion,
          brands: assignedProfile.userAgent.brands,
        },
        screen: {
          width: assignedProfile.screen.width,
          height: assignedProfile.screen.height,
          availWidth: assignedProfile.screen.availWidth,
          availHeight: assignedProfile.screen.availHeight,
          colorDepth: assignedProfile.screen.colorDepth,
          pixelDepth: assignedProfile.screen.pixelDepth,
          devicePixelRatio: assignedProfile.screen.devicePixelRatio,
        },
        hardwareConcurrency: assignedProfile.hardwareConcurrency,
        deviceMemory: assignedProfile.deviceMemory,
        timezoneOffset: assignedProfile.timezoneOffset,
        languages: assignedProfile.languages,
      };

      return {
        containerId,
        domain,
        seed: entropy.seed,
        settings: settings.spoofers,
        profile: settings.profile,
        assignedProfile: assignedProfileData,
      };
    } catch (error) {
      console.error('[MessageHandler] Error preparing inject config:', error);
      return null;
    }
  }
}
