/**
 * Background script entry point for Container Shield
 *
 * This script runs persistently and handles:
 * - Container detection and settings management
 * - Header spoofing via webRequest
 * - IP isolation tracking
 * - Message routing between components
 * - Toolbar badge updates
 * - Context menu integration
 * - Keyboard shortcuts
 */

import browser from 'webextension-polyfill';
import { ContainerManager } from './container-manager';
import { SettingsStore } from './settings-store';
import { HeaderSpoofer } from './header-spoofer';
import { IPIsolation } from './ip-isolation';
import { MessageHandler } from './message-handler';
import { initProfileManager } from './profile-manager';
import { getBadgeManager } from './badge-manager';
import { ContextMenuManager } from './context-menu';
import { KeyboardShortcuts } from './keyboard-shortcuts';
import { EXTENSION_VERSION, STORAGE_KEYS } from '@/lib/constants';

// Global instances
let containerManager: ContainerManager;
let settingsStore: SettingsStore;
let headerSpoofer: HeaderSpoofer;
let ipIsolation: IPIsolation;
let messageHandler: MessageHandler;
let contextMenuManager: ContextMenuManager;
let keyboardShortcuts: KeyboardShortcuts;

/**
 * Initialize the extension
 */
async function init(): Promise<void> {
  console.log(`[Container Shield] Initializing v${EXTENSION_VERSION}`);

  try {
    // Initialize settings store first
    settingsStore = new SettingsStore();
    await settingsStore.init();

    // Initialize container manager
    containerManager = new ContainerManager(settingsStore);
    await containerManager.init();

    // Initialize profile manager (ensures unique profiles across containers)
    await initProfileManager();

    // Initialize header spoofer
    headerSpoofer = new HeaderSpoofer(settingsStore, containerManager);
    await headerSpoofer.init();

    // Initialize IP isolation
    ipIsolation = new IPIsolation(settingsStore, containerManager);
    await ipIsolation.init();

    // Initialize message handler
    messageHandler = new MessageHandler(
      settingsStore,
      containerManager,
      ipIsolation
    );
    messageHandler.init();

    // Initialize badge manager
    const badgeManager = getBadgeManager();
    await badgeManager.init();

    // Initialize context menu
    contextMenuManager = new ContextMenuManager(settingsStore, containerManager);
    await contextMenuManager.init();

    // Initialize keyboard shortcuts
    keyboardShortcuts = new KeyboardShortcuts(settingsStore);
    keyboardShortcuts.init();

    // Check for first run and show onboarding
    await checkFirstRun();

    // Store version
    await browser.storage.local.set({
      [STORAGE_KEYS.VERSION]: EXTENSION_VERSION,
    });

    console.log('[Container Shield] Initialization complete');
  } catch (error) {
    console.error('[Container Shield] Initialization failed:', error);
  }
}

/**
 * Check if this is the first run and show onboarding
 */
async function checkFirstRun(): Promise<void> {
  const { onboardingComplete } = await browser.storage.local.get('onboardingComplete');

  if (!onboardingComplete) {
    // Open onboarding page
    await browser.tabs.create({
      url: browser.runtime.getURL('pages/onboarding.html'),
    });
  }
}

// Start initialization
init();

// Export for debugging
(globalThis as any).__chameleonContainers = {
  getContainerManager: () => containerManager,
  getSettingsStore: () => settingsStore,
  getHeaderSpoofer: () => headerSpoofer,
  getIPIsolation: () => ipIsolation,
};
