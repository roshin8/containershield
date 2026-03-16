/**
 * Message Handler - Routes messages between extension components
 */

import browser from 'webextension-polyfill';
import type { SettingsStore } from './settings-store';
import type { ContainerManager } from './container-manager';
import type { IPIsolation } from './ip-isolation';
import type { ExtensionMessage, InjectConfig, AssignedProfileData } from '@/types';
import { ensureUniqueProfile, type AssignedProfile } from './profile-manager';

/**
 * Fingerprint access data stored per tab
 */
interface FingerprintData {
  summary: Record<string, { count: number; blocked: number; spoofed: number }>;
  detail: Array<{
    api: string;
    category: string;
    timestamp: number;
    blocked: boolean;
    spoofed: boolean;
  }>;
  url: string;
  lastUpdated: number;
}

export class MessageHandler {
  private settingsStore: SettingsStore;
  private containerManager: ContainerManager;
  private ipIsolation: IPIsolation;
  private fingerprintData: Map<number, FingerprintData> = new Map();

  constructor(
    settingsStore: SettingsStore,
    containerManager: ContainerManager,
    ipIsolation: IPIsolation
  ) {
    this.settingsStore = settingsStore;
    this.containerManager = containerManager;
    this.ipIsolation = ipIsolation;

    // Clean up fingerprint data when tabs are closed
    browser.tabs.onRemoved.addListener((tabId) => {
      this.fingerprintData.delete(tabId);
    });
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

      case 'FINGERPRINT_REPORT':
        return this.handleFingerprintReport(message, sender);

      case 'GET_FINGERPRINT_DATA':
        return this.handleGetFingerprintData(message, sender);

      case 'GET_RECOMMENDATIONS':
        return this.handleGetRecommendations(message, sender);

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

  /**
   * Handle FINGERPRINT_REPORT - store fingerprint access data from content script
   */
  private handleFingerprintReport(
    message: any,
    sender: browser.Runtime.MessageSender
  ) {
    const tabId = sender.tab?.id;
    if (!tabId) return null;

    this.fingerprintData.set(tabId, {
      summary: message.summary,
      detail: message.detail,
      url: message.url,
      lastUpdated: Date.now(),
    });

    return { success: true };
  }

  /**
   * Handle GET_FINGERPRINT_DATA - retrieve fingerprint access data for a tab
   */
  private handleGetFingerprintData(
    message: any,
    sender: browser.Runtime.MessageSender
  ) {
    const tabId = message.tabId ?? sender.tab?.id;
    if (!tabId) return null;

    return this.fingerprintData.get(tabId) || null;
  }

  /**
   * Handle GET_RECOMMENDATIONS - get spoofer recommendations based on accessed APIs
   */
  private async handleGetRecommendations(
    message: any,
    sender: browser.Runtime.MessageSender
  ) {
    const tabId = message.tabId ?? sender.tab?.id;
    if (!tabId) return { recommendations: [], accessedCategories: [] };

    const data = this.fingerprintData.get(tabId);
    if (!data) return { recommendations: [], accessedCategories: [] };

    // Get current settings for this tab's container
    const containerId = await this.containerManager.getContainerForTab(tabId);
    const settings = this.settingsStore.getContainerSettings(containerId);

    // Map category names to setting paths
    const categoryToSetting: Record<string, { category: string; setting: string }> = {
      'Canvas': { category: 'graphics', setting: 'canvas' },
      'OffscreenCanvas': { category: 'graphics', setting: 'offscreenCanvas' },
      'WebGL': { category: 'graphics', setting: 'webgl' },
      'WebGL Shaders': { category: 'graphics', setting: 'webglShaders' },
      'WebGPU': { category: 'graphics', setting: 'webgpu' },
      'DOMRect': { category: 'graphics', setting: 'domRect' },
      'Audio': { category: 'audio', setting: 'audioContext' },
      'Offline Audio': { category: 'audio', setting: 'offlineAudio' },
      'Audio Latency': { category: 'audio', setting: 'latency' },
      'Codecs': { category: 'audio', setting: 'codecs' },
      'Screen': { category: 'hardware', setting: 'screen' },
      'Screen Frame': { category: 'hardware', setting: 'screenFrame' },
      'Screen Orientation': { category: 'hardware', setting: 'orientation' },
      'Hardware': { category: 'hardware', setting: 'deviceMemory' },
      'Touch': { category: 'hardware', setting: 'touch' },
      'Sensors': { category: 'hardware', setting: 'sensors' },
      'Battery': { category: 'hardware', setting: 'battery' },
      'Media Devices': { category: 'hardware', setting: 'mediaDevices' },
      'Navigator': { category: 'navigator', setting: 'userAgent' },
      'Client Hints': { category: 'navigator', setting: 'clientHints' },
      'Clipboard': { category: 'navigator', setting: 'clipboard' },
      'Vibration': { category: 'navigator', setting: 'vibration' },
      'Timezone': { category: 'timezone', setting: 'intl' },
      'Fonts': { category: 'fonts', setting: 'enumeration' },
      'CSS Fonts': { category: 'fonts', setting: 'cssDetection' },
      'WebRTC': { category: 'network', setting: 'webrtc' },
      'Network': { category: 'network', setting: 'connection' },
      'Timing': { category: 'timing', setting: 'performance' },
      'CSS': { category: 'css', setting: 'mediaQueries' },
      'Speech': { category: 'speech', setting: 'synthesis' },
      'Permissions': { category: 'permissions', setting: 'query' },
      'Notification': { category: 'permissions', setting: 'notification' },
      'Storage': { category: 'storage', setting: 'estimate' },
      'IndexedDB': { category: 'storage', setting: 'indexedDB' },
      'WebSQL': { category: 'storage', setting: 'webSQL' },
      'Math': { category: 'math', setting: 'functions' },
      'Keyboard': { category: 'keyboard', setting: 'layout' },
      'Workers': { category: 'workers', setting: 'fingerprint' },
      'Errors': { category: 'errors', setting: 'stackTrace' },
      'Emoji': { category: 'rendering', setting: 'emoji' },
      'MathML': { category: 'rendering', setting: 'mathml' },
      'Intl': { category: 'intl', setting: 'apis' },
      'Crypto': { category: 'crypto', setting: 'webCrypto' },
      'Gamepad': { category: 'devices', setting: 'gamepad' },
      'MIDI': { category: 'devices', setting: 'midi' },
      'Bluetooth': { category: 'devices', setting: 'bluetooth' },
      'USB': { category: 'devices', setting: 'usb' },
      'Serial': { category: 'devices', setting: 'serial' },
      'HID': { category: 'devices', setting: 'hid' },
      'Features': { category: 'features', setting: 'detection' },
      'Apple Pay': { category: 'payment', setting: 'applePay' },
    };

    const recommendations: Array<{
      api: string;
      category: string;
      settingPath: string;
      currentValue: string;
    }> = [];

    const accessedCategories = Object.keys(data.summary);
    const seenCategories = new Set<string>();

    for (const access of data.detail) {
      if (seenCategories.has(access.category)) continue;

      const settingInfo = categoryToSetting[access.category];
      if (!settingInfo) continue;

      const { category, setting } = settingInfo;
      const spooferSettings = (settings.spoofers as any)[category];

      if (spooferSettings && spooferSettings[setting] === 'off') {
        recommendations.push({
          api: access.api,
          category: access.category,
          settingPath: `${category}.${setting}`,
          currentValue: 'off',
        });
        seenCategories.add(access.category);
      }
    }

    return {
      recommendations,
      accessedCategories,
      totalAccesses: data.detail.length,
      url: data.url,
    };
  }
}
