/**
 * Background script entry point for Chameleon Containers
 *
 * This script runs persistently and handles:
 * - Container detection and settings management
 * - Header spoofing via webRequest
 * - IP isolation tracking
 * - Message routing between components
 */

import browser from 'webextension-polyfill';
import { ContainerManager } from './container-manager';
import { SettingsStore } from './settings-store';
import { HeaderSpoofer } from './header-spoofer';
import { IPIsolation } from './ip-isolation';
import { MessageHandler } from './message-handler';
import { initProfileManager } from './profile-manager';
import { EXTENSION_VERSION, STORAGE_KEYS } from '@/lib/constants';

// Global instances
let containerManager: ContainerManager;
let settingsStore: SettingsStore;
let headerSpoofer: HeaderSpoofer;
let ipIsolation: IPIsolation;
let messageHandler: MessageHandler;

/**
 * Initialize the extension
 */
async function init(): Promise<void> {
  console.log(`[Chameleon Containers] Initializing v${EXTENSION_VERSION}`);

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

    // Store version
    await browser.storage.local.set({
      [STORAGE_KEYS.VERSION]: EXTENSION_VERSION,
    });

    console.log('[Chameleon Containers] Initialization complete');
  } catch (error) {
    console.error('[Chameleon Containers] Initialization failed:', error);
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
