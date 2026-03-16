/**
 * Content Script - Runs in content script context
 *
 * This script:
 * - Requests container settings from background
 * - Injects the spoofer code into the page context (MAIN world)
 * - Bridges communication between page context and background
 */

import browser from 'webextension-polyfill';
import type { InjectConfig } from '@/types';
import {
  MSG_INJECT_CONFIG,
  MSG_FINGERPRINT_REPORT,
  MSG_GET_FINGERPRINT_REPORT,
  MSG_GET_RECOMMENDATIONS,
  PAGE_MSG_FINGERPRINT_REPORT,
  PAGE_MSG_GET_REPORT,
  PAGE_MSG_GET_RECOMMENDATIONS,
} from '@/constants';

/**
 * Get inject configuration from background script
 */
async function getInjectConfig(): Promise<InjectConfig | null> {
  try {
    const config = await browser.runtime.sendMessage({
      type: MSG_INJECT_CONFIG,
    });
    return config as InjectConfig | null;
  } catch (error) {
    console.error('[ContainerShield Content] Failed to get inject config:', error);
    return null;
  }
}

/**
 * Inject the spoofer script into the page context
 */
async function injectSpoofers(): Promise<void> {
  // Get configuration
  const config = await getInjectConfig();

  if (!config) {
    console.log('[ChameleonContainers Content] No config available, skipping injection');
    return;
  }

  // Skip if protection is disabled (check via spoofers being mostly 'off')
  // The actual check is done in the injected script

  // Create a script element to inject into the page
  const script = document.createElement('script');
  script.src = browser.runtime.getURL('inject/index.js');

  // Pass configuration via a data attribute on the document element
  // This is read by the injected script before any page scripts run
  const configElement = document.createElement('meta');
  configElement.name = 'chameleon-containers-config';
  configElement.content = btoa(JSON.stringify(config));

  // Inject config first, then script
  (document.head || document.documentElement).prepend(configElement);
  (document.head || document.documentElement).prepend(script);

  // Clean up the config element after the script has loaded
  script.onload = () => {
    configElement.remove();
    script.remove();
  };

  console.log('[ChameleonContainers Content] Spoofers injected for container:', config.containerId);
}

// Run injection as early as possible
injectSpoofers();

/**
 * Listen for messages from the injected page script
 * This bridges communication between page context and background
 */
window.addEventListener('message', async (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  const { type, ...data } = event.data || {};

  // Forward fingerprint reports to background
  if (type === PAGE_MSG_FINGERPRINT_REPORT) {
    try {
      await browser.runtime.sendMessage({
        type: MSG_FINGERPRINT_REPORT,
        summary: data.summary,
        detail: data.detail,
        url: data.url,
      });
    } catch (error) {
      // Extension context may be invalidated
    }
  }

  // Handle request for recommendations
  if (type === PAGE_MSG_GET_RECOMMENDATIONS) {
    // The page script will handle this internally
  }
});

/**
 * Listen for messages from the popup requesting fingerprint data
 */
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === MSG_GET_FINGERPRINT_REPORT) {
    // Request report from page script
    window.postMessage({ type: PAGE_MSG_GET_REPORT }, '*');
    return true;
  }

  if (message.type === MSG_GET_RECOMMENDATIONS) {
    // Request recommendations from page script with current settings
    window.postMessage({
      type: PAGE_MSG_GET_RECOMMENDATIONS,
      settings: message.settings,
    }, '*');
    return true;
  }
});
