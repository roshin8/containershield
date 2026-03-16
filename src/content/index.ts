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

/**
 * Get inject configuration from background script
 */
async function getInjectConfig(): Promise<InjectConfig | null> {
  try {
    const config = await browser.runtime.sendMessage({
      type: 'INJECT_CONFIG',
    });
    return config as InjectConfig | null;
  } catch (error) {
    console.error('[ChameleonContainers Content] Failed to get inject config:', error);
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
