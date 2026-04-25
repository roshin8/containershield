/**
 * Message Handler - Routes messages between extension components
 */

import browser from 'webextension-polyfill';
import type { SettingsStore } from './settings-store';
import type { ContainerManager } from './container-manager';
import type { IPIsolation } from './ip-isolation';
import type { ProfileRotation } from './profile-rotation';
import type { StatisticsStore } from './statistics-store';
import type {
  ExtensionMessage,
  InjectConfig,
  AssignedProfileData,
  FingerprintReportMessage,
  GetFingerprintDataMessage,
  GetRecommendationsMessage,
  FingerprintData,
  SpooferRecommendation,
  RecommendationsResponse,
} from '@/types';
import { ensureUniqueProfile, getAssignedProfile } from './profile-manager';
import { CollisionDetector } from './collision-detector';
import {
  MSG_GET_SETTINGS,
  MSG_SET_SETTINGS,
  MSG_GET_ENTROPY,
  MSG_GET_CONTAINER_INFO,
  MSG_GET_ALL_CONTAINERS,
  MSG_IP_CONFLICT_CHECK,
  MSG_INJECT_CONFIG,
  MSG_FINGERPRINT_REPORT,
  MSG_GET_FINGERPRINT_DATA,
  MSG_GET_RECOMMENDATIONS,
  MSG_GET_ASSIGNED_PROFILE,
  MSG_GET_IP_DATABASE,
  MSG_ADD_TRACKED_DOMAIN,
  MSG_REMOVE_TRACKED_DOMAIN,
  MSG_CLEAR_IP_RECORD,
  MSG_UPDATE_IP_SETTINGS,
  MSG_ADD_IP_EXCEPTION,
  MSG_REMOVE_IP_EXCEPTION,
  MSG_GET_ROTATION_SETTINGS,
  MSG_SET_ROTATION_SETTINGS,
  MSG_ROTATE_NOW,
  MSG_GET_STATS,
  MSG_CHECK_COLLISIONS,
} from '@/constants';
import { CATEGORY_TO_SETTING } from '@/constants/categories';
import { PRNG } from '@/lib/crypto';
import { selectGPUForProfile } from '@/lib/gpu-profiles';
import { TIMEZONE_IANA } from '@/lib/constants';

export class MessageHandler {
  private settingsStore: SettingsStore;
  private containerManager: ContainerManager;
  private ipIsolation: IPIsolation;
  private profileRotation: ProfileRotation;
  private statisticsStore: StatisticsStore;
  private fingerprintData: Map<number, FingerprintData> = new Map();

  constructor(
    settingsStore: SettingsStore,
    containerManager: ContainerManager,
    ipIsolation: IPIsolation,
    profileRotation: ProfileRotation,
    statisticsStore: StatisticsStore
  ) {
    this.settingsStore = settingsStore;
    this.containerManager = containerManager;
    this.ipIsolation = ipIsolation;
    this.profileRotation = profileRotation;
    this.statisticsStore = statisticsStore;

    browser.tabs.onRemoved.addListener((tabId) => {
      this.fingerprintData.delete(tabId);
    });
  }

  init(): void {
    browser.runtime.onMessage.addListener((message: unknown, sender: browser.Runtime.MessageSender) => {
      return this.handleMessage(message as ExtensionMessage, sender);
    });
  }

  private async handleMessage(
    message: ExtensionMessage,
    sender: browser.Runtime.MessageSender
  ): Promise<unknown> {
    try {
      switch (message.type) {
      case MSG_GET_SETTINGS:
        return this.handleGetSettings(message);

      case MSG_SET_SETTINGS:
        return this.handleSetSettings(message);

      case MSG_GET_ENTROPY:
        return this.handleGetEntropy(message);

      case MSG_GET_CONTAINER_INFO:
        return this.handleGetContainerInfo(message, sender);

      case MSG_GET_ALL_CONTAINERS:
        return this.handleGetAllContainers();

      case MSG_IP_CONFLICT_CHECK:
        return this.handleIPConflictCheck(message);

      case MSG_INJECT_CONFIG:
        return this.handleGetInjectConfig(sender);

      case MSG_FINGERPRINT_REPORT:
        return this.handleFingerprintReport(message, sender);

      case 'ACTIVE_PROFILE':
        return this.handleActiveProfile(message, sender);

      case MSG_GET_FINGERPRINT_DATA:
        return this.handleGetFingerprintData(message, sender);

      case MSG_GET_RECOMMENDATIONS:
        return this.handleGetRecommendations(message, sender);

      case MSG_GET_ASSIGNED_PROFILE:
        return this.handleGetAssignedProfile(message);

      case MSG_GET_IP_DATABASE:
        return this.settingsStore.getIPDatabase();

      case MSG_ADD_TRACKED_DOMAIN:
        await this.ipIsolation.addTrackedDomain((message as any).domain);
        return { success: true };

      case MSG_REMOVE_TRACKED_DOMAIN:
        await this.ipIsolation.removeTrackedDomain((message as any).domain);
        return { success: true };

      case MSG_CLEAR_IP_RECORD:
        await this.ipIsolation.clearIPRecord((message as any).ip);
        return { success: true };

      case MSG_UPDATE_IP_SETTINGS:
        await this.settingsStore.updateIPDatabase({ settings: (message as any).settings });
        return { success: true };

      case MSG_ADD_IP_EXCEPTION:
        await this.ipIsolation.addException((message as any).ip);
        return { success: true };

      case MSG_REMOVE_IP_EXCEPTION:
        await this.ipIsolation.removeException((message as any).ip);
        return { success: true };

      case MSG_GET_ROTATION_SETTINGS:
        return this.profileRotation.getSettings();

      case MSG_SET_ROTATION_SETTINGS:
        await this.profileRotation.updateSettings((message as any).settings);
        return { success: true };

      case MSG_ROTATE_NOW:
        await this.profileRotation.rotateAllContainers();
        return { success: true };

      case MSG_GET_STATS:
        return this.statisticsStore.getStatsSummary();

      case MSG_CHECK_COLLISIONS:
        return this.handleCheckCollisions();

      case 'GET_SIGNAL_VALUES':
        return this.handleGetSignalValues(message as any);

      case 'ROTATE_AND_SET_COOKIE':
        return this.handleRotateAndSetCookie(message as any);

      case 'IP_RECHECK':
        return this.ipIsolation.handleRecheck(message as any);

      default:
        return null;
      }
    } catch (error) {
      console.error('[MessageHandler] Error handling message:', (message as any).type, error);
      return null;
    }
  }

  private handleGetSettings(message: import('@/types').GetSettingsMessage) {
    const { containerId, domain } = message;
    if (domain) {
      return this.settingsStore.getSettingsForDomain(containerId, domain);
    }
    return this.settingsStore.getContainerSettings(containerId);
  }

  private async handleSetSettings(message: import('@/types').SetSettingsMessage) {
    const { containerId, settings } = message;
    await this.settingsStore.updateContainerSettings(containerId, settings);
    // Refresh settings cookies for all tabs in this container so the
    // inject script picks up the new settings on next page load.
    try {
      const tabs = await browser.tabs.query({ cookieStoreId: containerId });
      for (const tab of tabs) {
        if (tab.id && tab.url && !tab.url.startsWith('about:')) {
          const domain = new URL(tab.url).hostname;
          const updated = this.settingsStore.getSettingsForDomain(containerId, domain);
          const overrides: string[] = [];
          if (!updated.enabled) {
            overrides.push('_disabled');
          } else {
            for (const [cat, signals] of Object.entries(updated.spoofers)) {
              if (typeof signals !== 'object' || signals === null) continue;
              for (const [sig, mode] of Object.entries(signals as Record<string, string>)) {
                if (mode !== 'noise') overrides.push(`${cat}.${sig}:${mode}`);
              }
            }
          }
          const cookieUrl = `${new URL(tab.url).protocol}//${domain}`;
          if (overrides.length > 0) {
            await browser.cookies.set({
              url: cookieUrl, name: '_cscfg',
              value: encodeURIComponent(overrides.join(',')),
              path: '/', expirationDate: Math.floor(Date.now() / 1000) + 10,
              storeId: containerId,
            });
          } else {
            await browser.cookies.remove({ url: cookieUrl, name: '_cscfg', storeId: containerId }).catch(() => {});
          }
        }
      }
    } catch {}
    return { success: true };
  }

  private handleGetEntropy(message: import('@/types').GetEntropyMessage) {
    return this.settingsStore.getEntropy(message.containerId);
  }

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

  private handleGetAllContainers() {
    return this.containerManager.getAllContainers();
  }

  private handleIPConflictCheck(message: import('@/types').IPConflictCheckMessage) {
    return this.ipIsolation.checkIPConflict(message.ip, message.containerId);
  }

  /**
   * Prepare config for page context injection
   */
  private async handleGetInjectConfig(
    sender: browser.Runtime.MessageSender
  ): Promise<InjectConfig | null> {
    const tabId = sender.tab?.id;
    const url = sender.tab?.url || sender.url;

    if (!tabId || !url) return null;

    try {
      const domain = new URL(url).hostname;
      const containerId = await this.containerManager.getContainerForTab(tabId);

      await this.settingsStore.ensureContainerSettings(containerId);

      const settings = this.settingsStore.getSettingsForDomain(containerId, domain);
      const entropy = this.settingsStore.getEntropy(containerId);

      if (!entropy) return null;

      const assignedProfile = await ensureUniqueProfile(entropy);

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

  private async handleFingerprintReport(
    message: FingerprintReportMessage,
    sender: browser.Runtime.MessageSender
  ): { success: boolean } | null {
    const tabId = sender.tab?.id;
    if (!tabId) return null;

    const fpData = {
      summary: message.summary,
      detail: message.detail,
      url: message.url,
      lastUpdated: Date.now(),
    };
    this.fingerprintData.set(tabId, fpData);

    // Also persist to storage (event page may suspend and lose in-memory data)
    try {
      await browser.storage.local.set({ [`fpData:${tabId}`]: fpData });
    } catch {}

    // Feed stats store
    try {
      const containerId = await this.containerManager.getContainerForTab(tabId);
      const containerName = this.containerManager.getContainerName(containerId);
      const domain = message.url ? new URL(message.url).hostname : 'unknown';
      for (const d of message.detail) {
        this.statisticsStore.recordAccess(containerId, containerName, {
          api: d.api, category: d.category, timestamp: d.timestamp,
          wasBlocked: d.blocked, wasSpoofed: d.spoofed, domain,
        });
      }
    } catch {}

    // Update badge with count of UNIQUE spoofed/blocked APIs
    if (message.detail?.length) {
      const uniqueAPIs = new Map<string, { spoofed: boolean; blocked: boolean }>();
      for (const d of message.detail) {
        if (!uniqueAPIs.has(d.api)) {
          uniqueAPIs.set(d.api, { spoofed: d.spoofed, blocked: d.blocked });
        }
      }
      const activeCount = Array.from(uniqueAPIs.values()).filter(d => d.spoofed || d.blocked).length;
      const total = uniqueAPIs.size;
      try {
        const badgeText = activeCount > 0 ? String(activeCount) : '';
        const rate = total > 0 ? (activeCount / total) * 100 : 100;
        const color = rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444';
        browser.action.setBadgeBackgroundColor({ color, tabId });
        browser.action.setBadgeText({ text: badgeText, tabId });
      } catch {}
    }

    return { success: true };
  }

  /**
   * Store the inject script's active profile so the popup can display
   * the actual spoofed values (not the background's assigned profile).
   */
  private async handleActiveProfile(
    message: any,
    sender: browser.Runtime.MessageSender
  ): Promise<{ success: boolean }> {
    const tabId = sender.tab?.id;
    if (tabId && message.profile) {
      await browser.storage.local.set({
        [`activeProfile:${tabId}`]: {
          profile: message.profile,
          domain: message.domain,
          timestamp: Date.now(),
        },
      });
    }
    return { success: true };
  }

  private handleGetFingerprintData(
    message: GetFingerprintDataMessage,
    sender: browser.Runtime.MessageSender
  ): FingerprintData | null {
    const tabId = message.tabId ?? sender.tab?.id;
    if (!tabId) return null;
    return this.fingerprintData.get(tabId) || null;
  }

  private async handleGetRecommendations(
    message: GetRecommendationsMessage,
    sender: browser.Runtime.MessageSender
  ): Promise<RecommendationsResponse> {
    const empty: RecommendationsResponse = {
      recommendations: [],
      accessedCategories: [],
      accessedAPIs: [],
      totalAccesses: 0,
      url: '',
    };

    const tabId = message.tabId ?? sender.tab?.id;
    if (!tabId) return empty;

    let data = this.fingerprintData.get(tabId);
    // Fallback: check storage (event page may have restarted)
    if (!data) {
      try {
        const stored = await browser.storage.local.get(`fpData:${tabId}`) as Record<string, any>;
        data = stored[`fpData:${tabId}`];
        if (data) this.fingerprintData.set(tabId, data);
      } catch {}
    }
    if (!data) return empty;

    const recommendations: SpooferRecommendation[] = [];
    const categorySet = new Set<string>();
    const seenCategories = new Set<string>();

    // Container lookup may fail for tabs in other windows
    let settings: any = null;
    try {
      const containerId = await this.containerManager.getContainerForTab(tabId);
      settings = this.settingsStore.getContainerSettings(containerId);
    } catch {}

    for (const access of data.detail) {
      if (access.category) categorySet.add(access.category);
      if (seenCategories.has(access.category)) continue;

      if (!settings) continue;
      const settingInfo = CATEGORY_TO_SETTING[access.category];
      if (!settingInfo) continue;

      const { category, setting } = settingInfo;
      const spooferSettings = (settings.spoofers as any)?.[category];

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
      accessedCategories: Array.from(categorySet),
      accessedAPIs: data.detail,
      totalAccesses: data.detail.length,
      url: data.url,
    };
  }

  /**
   * Get the assigned profile for a container, with user overrides applied
   */
  private async handleGetAssignedProfile(
    message: { containerId: string }
  ): Promise<AssignedProfileData | null> {
    const { containerId } = message;
    const settings = this.settingsStore.getContainerSettings(containerId);
    const profileSettings = settings.profile;

    let profile = getAssignedProfile(containerId);

    if (!profile) {
      const entropy = this.settingsStore.getEntropy(containerId);
      if (!entropy) return null;
      profile = await ensureUniqueProfile(entropy);
    }

    return {
      userAgent: {
        id: profile.userAgent.id,
        name: profile.userAgent.name,
        userAgent: profileSettings.userAgent || profile.userAgent.userAgent,
        platform: profileSettings.platform || profile.userAgent.platform,
        vendor: profile.userAgent.vendor,
        appVersion: profile.userAgent.appVersion,
        oscpu: profile.userAgent.oscpu,
        mobile: profile.userAgent.mobile,
        platformName: profile.userAgent.platformName,
        platformVersion: profile.userAgent.platformVersion,
        brands: profile.userAgent.brands,
      },
      screen: profileSettings.screen
        ? {
            width: profileSettings.screen.width,
            height: profileSettings.screen.height,
            availWidth: profileSettings.screen.width,
            availHeight: profileSettings.screen.height - 40,
            colorDepth: profile.screen.colorDepth || 24,
            pixelDepth: profile.screen.pixelDepth || 24,
            devicePixelRatio: profile.screen.devicePixelRatio || 1,
          }
        : {
            width: profile.screen.width,
            height: profile.screen.height,
            availWidth: profile.screen.availWidth,
            availHeight: profile.screen.availHeight,
            colorDepth: profile.screen.colorDepth,
            pixelDepth: profile.screen.pixelDepth,
            devicePixelRatio: profile.screen.devicePixelRatio,
          },
      hardwareConcurrency: profileSettings.hardwareConcurrency || profile.hardwareConcurrency,
      deviceMemory: profileSettings.deviceMemory || profile.deviceMemory,
      timezoneOffset: profileSettings.timezone && profileSettings.timezone !== 'real' && profileSettings.timezone !== 'ip'
        ? parseInt(profileSettings.timezone, 10)
        : profile.timezoneOffset,
      languages: profileSettings.language
        ? profileSettings.language.split(', ').map(l => l.trim())
        : profile.languages,
    };
  }

  /**
   * Check for fingerprint collisions between containers
   */
  private async handleCheckCollisions() {
    const detector = new CollisionDetector(this.settingsStore, this.containerManager);
    return detector.checkAllContainers();
  }

  /**
   * Compute signal values from the assigned profile + entropy.
   * No need to wait for site access — values are known at spoof time.
   */
  private async handleGetSignalValues(
    message: { containerId: string }
  ): Promise<Record<string, string>> {
    const { containerId } = message;
    const vals: Record<string, string> = {};

    const settings = this.settingsStore.getContainerSettings(containerId);
    const entropy = this.settingsStore.getEntropy(containerId);
    if (!entropy) return vals;

    let profile = getAssignedProfile(containerId);
    if (!profile) {
      profile = await ensureUniqueProfile(entropy);
    }
    if (!profile) return vals;

    const prng = PRNG.fromBase64(entropy.seed);
    const sp = settings.spoofers;

    // Navigator / UA
    if (sp.navigator.userAgent !== 'off') {
      vals['navigator.userAgent'] = profile.userAgent.name || profile.userAgent.userAgent.substring(0, 40);
      vals['navigator.languages'] = (profile.languages || ['en-US']).join(', ');
      if (profile.userAgent.brands) {
        vals['navigator.userAgentData'] = profile.userAgent.platformName || 'Windows';
      }
      vals['navigator.plugins'] = '5 standard';
    }

    // Screen
    if (sp.hardware.screen !== 'off') {
      vals['screen.width'] = `${profile.screen.width}x${profile.screen.height}`;
    }
    if (sp.hardware.screenFrame !== 'off') {
      vals['window.outerWidth'] = `${profile.screen.width}x${profile.screen.height}`;
    }
    if (sp.hardware.deviceMemory !== 'off' && profile.deviceMemory) {
      vals['navigator.deviceMemory'] = `${profile.deviceMemory}GB`;
    }
    if (sp.hardware.hardwareConcurrency !== 'off') {
      vals['navigator.hardwareConcurrency'] = `${profile.hardwareConcurrency} cores`;
    }

    // Timezone
    if (sp.timezone.intl !== 'off') {
      const tzName = TIMEZONE_IANA[profile.timezoneOffset] || 'UTC';
      vals['Date.getTimezoneOffset'] = tzName;
      vals['Intl.DateTimeFormat'] = tzName;
    }

    // WebGL GPU
    if (sp.graphics.webgl !== 'off') {
      const gpu = selectGPUForProfile((arr) => prng.pick(arr), profile);
      vals['WebGLRenderingContext.getParameter'] = gpu.renderer.substring(0, 40);
      vals['WebGL2RenderingContext.getParameter'] = gpu.renderer.substring(0, 40);
    }

    // Graphics — noise-based
    const blockOrNoise = (mode: string) => mode === 'block' ? 'blocked' : '±noise per seed';
    if (sp.graphics.canvas !== 'off') {
      vals['HTMLCanvasElement.toDataURL'] = blockOrNoise(sp.graphics.canvas);
    }
    if (sp.graphics.offscreenCanvas !== 'off') {
      vals['OffscreenCanvas.convertToBlob'] = blockOrNoise(sp.graphics.offscreenCanvas);
    }
    if (sp.graphics.domRect !== 'off') {
      vals['Element.getBoundingClientRect'] = sp.graphics.domRect === 'block' ? 'blocked' : '±0.5px noise';
    }
    if (sp.graphics.textMetrics !== 'off') {
      vals['CanvasRenderingContext2D.measureText'] = '±noise';
      vals['CanvasRenderingContext2D.measureText(emoji)'] = '±noise';
    }
    if (sp.graphics.svg !== 'off') {
      vals['SVGGraphicsElement.getBBox'] = '±0.5px noise';
    }
    if (sp.graphics.webglShaders !== 'off') {
      vals['WebGLRenderingContext.getShaderPrecisionFormat'] = 'precision spoofed';
    }
    if (sp.graphics.webgpu !== 'off') {
      vals['navigator.gpu.requestAdapter'] = sp.graphics.webgpu === 'block' ? 'blocked' : 'spoofed';
    }

    // Audio
    if (sp.audio.audioContext !== 'off') {
      vals['AnalyserNode.getFloatFrequencyData'] = sp.audio.audioContext === 'block' ? 'silent' : '±0.0001 noise';
    }
    if (sp.audio.offlineAudio !== 'off') {
      vals['OfflineAudioContext.startRendering'] = sp.audio.offlineAudio === 'block' ? 'silent' : '±0.0001 noise';
    }
    if (sp.audio.latency !== 'off') {
      vals['AudioContext.baseLatency'] = 'spoofed sample rate';
    }
    if (sp.audio.codecs !== 'off') {
      vals['HTMLMediaElement.canPlayType'] = 'standardized responses';
    }

    // Hardware
    if (sp.hardware.screenExtended !== 'off') {
      vals['screen.isExtended'] = 'false (single)';
    }
    if (sp.hardware.orientation !== 'off') {
      vals['screen.orientation.type'] = 'landscape-primary';
    }
    if (sp.hardware.visualViewport !== 'off') {
      vals['visualViewport.scale'] = '1.0 (no zoom)';
    }
    if (sp.hardware.architecture !== 'off') {
      vals['Math.fround'] = 'x86_64';
    }
    if (sp.hardware.mediaDevices !== 'off') {
      vals['navigator.mediaDevices.enumerateDevices'] = sp.hardware.mediaDevices === 'block' ? 'empty' : 'spoofed';
    }
    if (sp.hardware.battery !== 'off') {
      vals['navigator.getBattery'] = sp.hardware.battery === 'block' ? 'blocked' : 'spoofed level';
    }
    if (sp.hardware.touch !== 'off') {
      vals['navigator.maxTouchPoints'] = sp.hardware.touch === 'block' ? '0' : 'spoofed';
    }
    if (sp.hardware.sensors !== 'off') {
      vals['DeviceMotionEvent'] = sp.hardware.sensors === 'block' ? 'blocked' : 'spoofed';
    }

    // Navigator extras
    if (sp.navigator.clipboard !== 'off') {
      vals['navigator.clipboard'] = sp.navigator.clipboard === 'block' ? 'blocked' : 'intercepted';
    }
    if (sp.navigator.vibration !== 'off') {
      vals['navigator.vibrate'] = 'spoofed';
    }
    if (sp.navigator.vendorFlavors !== 'off') {
      vals['window.vendorFlavors'] = 'globals hidden';
    }
    if (sp.navigator.fontPreferences !== 'off') {
      vals['getComputedStyle.fontPrefs'] = '16px standard';
    }
    if (sp.navigator.windowName !== 'off') {
      vals['window.name'] = 'cleared';
    }
    if (sp.navigator.tabHistory !== 'off') {
      vals['history.length'] = 'spoofed';
    }
    if (sp.navigator.mediaCapabilities !== 'off') {
      vals['navigator.mediaCapabilities.decodingInfo'] = 'standardized';
    }

    // Network
    if (sp.network.connection !== 'off') {
      vals['navigator.connection'] = 'spoofed profile';
    }
    if (sp.network.webrtc !== 'off') {
      vals['RTCPeerConnection'] = sp.network.webrtc === 'block' ? 'blocked' : 'public only';
    }
    if (sp.network.websocket !== 'off') {
      vals['WebSocket'] = sp.network.websocket === 'block' ? 'all blocked' : '3rd party blocked';
    }
    if (sp.network.geolocation !== 'off') {
      vals['navigator.geolocation.getCurrentPosition'] = sp.network.geolocation === 'block' ? 'blocked' : 'city-level';
    }

    // Timing
    if (sp.timing.performance !== 'off') {
      const precision = sp.timing.performance === 'block' ? 100 : prng.pick([1, 2, 5, 10]);
      vals['performance.now'] = `${precision}ms precision`;
    }
    if (sp.timing.memory !== 'off') {
      vals['performance.memory'] = 'randomized heap';
    }
    if (sp.timing.eventLoop !== 'off') {
      const jitter = sp.timing.eventLoop === 'block' ? 5 : 2;
      vals['setTimeout'] = `±${jitter}ms jitter`;
    }

    // Fonts
    if (sp.fonts.enumeration !== 'off') {
      vals['document.fonts.check'] = sp.fonts.enumeration === 'block' ? 'system-only' : 'filtered';
    }
    if (sp.fonts.cssDetection !== 'off') {
      vals['getComputedStyle(fontFamily)'] = 'standardized widths';
    }

    // Rendering
    if ((sp.rendering as any)?.mathml !== 'off') {
      vals['MathML.getBoundingClientRect'] = '±noise';
    }

    // CSS
    if (sp.css?.mediaQueries !== 'off') {
      vals['matchMedia'] = 'spoofed queries';
    }

    // Storage
    if (sp.storage?.estimate !== 'off') {
      vals['navigator.storage.estimate'] = 'randomized';
    }
    if (sp.storage?.indexedDB !== 'off') {
      vals['indexedDB.open'] = 'spoofed';
    }
    if (sp.storage?.webSQL !== 'off') {
      vals['openDatabase'] = 'blocked';
    }
    if (sp.storage?.privateModeProtection !== 'off') {
      vals['navigator.storage.persisted'] = 'randomized';
    }

    // Permissions
    if (sp.permissions?.query !== 'off') {
      vals['navigator.permissions.query'] = 'spoofed';
    }
    if (sp.permissions?.notification !== 'off') {
      vals['Notification.permission'] = 'default';
    }

    // Devices
    if (sp.devices?.gamepad !== 'off') {
      vals['navigator.getGamepads'] = sp.devices.gamepad === 'block' ? 'blocked' : 'empty array';
    }
    if (sp.devices?.midi !== 'off') {
      vals['navigator.requestMIDIAccess'] = sp.devices.midi === 'block' ? 'blocked' : 'empty';
    }
    if (sp.devices?.bluetooth !== 'off') {
      vals['navigator.bluetooth.requestDevice'] = sp.devices.bluetooth === 'block' ? 'blocked' : 'empty';
    }
    if (sp.devices?.usb !== 'off') {
      vals['navigator.usb.getDevices'] = sp.devices.usb === 'block' ? 'blocked' : 'empty';
    }
    if (sp.devices?.serial !== 'off') {
      vals['navigator.serial.getPorts'] = sp.devices.serial === 'block' ? 'blocked' : 'empty';
    }
    if (sp.devices?.hid !== 'off') {
      vals['navigator.hid.getDevices'] = sp.devices.hid === 'block' ? 'blocked' : 'empty';
    }

    // Other
    if (sp.math?.functions !== 'off') {
      vals['Math.cos'] = '±1e-12 noise';
    }
    if (sp.keyboard?.layout !== 'off') {
      vals['navigator.keyboard.getLayoutMap'] = 'spoofed';
    }
    if (sp.keyboard?.cadence !== 'off') {
      vals['KeyboardEvent.timing'] = '±15ms jitter';
    }
    if (sp.speech?.synthesis !== 'off') {
      vals['speechSynthesis.getVoices'] = sp.speech.synthesis === 'block' ? '0 voices' : '3-5 voices';
    }
    if (sp.features?.detection !== 'off') {
      vals['navigator.webdriver'] = 'false';
    }
    if (sp.crypto?.webCrypto !== 'off') {
      vals['crypto.getRandomValues'] = 'seeded PRNG';
    }
    if (sp.errors?.stackTrace !== 'off') {
      vals['Error.captureStackTrace'] = 'normalized';
    }
    if (sp.payment?.applePay !== 'off') {
      vals['ApplePaySession.canMakePayments'] = 'false';
    }
    if (sp.intl?.apis !== 'off') {
      vals['Intl.NumberFormat'] = 'spoofed locale';
    }

    // Workers
    if (sp.workers?.fingerprint !== 'off') {
      vals['Worker.constructor'] = 'preamble injected';
    }
    if (sp.workers?.serviceWorker !== 'off') {
      vals['ServiceWorker.register'] = sp.workers.serviceWorker === 'block' ? 'blocked' : 'rejected → SW fallback';
    }

    return vals;
  }

  /**
   * Rotate entropy for the current tab's container and set the cookie
   * immediately, so the inject script reads the new seed on reload.
   */
  private async handleRotateAndSetCookie(message: { tabId: number }): Promise<{ success: boolean }> {
    try {
      const tab = await browser.tabs.get(message.tabId);
      if (!tab.url || !tab.cookieStoreId) {
        console.error('[MessageHandler] ROTATE: no url or cookieStoreId', tab.url, tab.cookieStoreId);
        return { success: false };
      }

      const containerId = tab.cookieStoreId;
      await this.settingsStore.rotateEntropy(containerId);

      const entropy = this.settingsStore.getEntropy(containerId);
      if (!entropy?.seed) {
        console.error('[MessageHandler] ROTATE: no entropy after rotation');
        return { success: false };
      }

      const parsedUrl = new URL(tab.url);
      const domain = parsedUrl.hostname;
      const cookieUrl = `${parsedUrl.protocol}//${domain}`;
      const seedPrefix = entropy.seed.substring(0, 16);

      await browser.cookies.set({
        url: cookieUrl,
        name: '_csid',
        value: seedPrefix,
        path: '/',
        expirationDate: Math.floor(Date.now() / 1000) + 10,
        storeId: containerId,
      });

      console.log(`[MessageHandler] ROTATE: set _csid=${seedPrefix.substring(0, 6)}... for ${domain} in ${containerId}`);
      return { success: true };
    } catch (e) {
      console.error('[MessageHandler] ROTATE failed:', e);
      return { success: false };
    }
  }
}
