/**
 * Content Script - Runs in content script context
 *
 * This script:
 * - Requests container settings from background
 * - Injects the spoofer code into the page context (MAIN world)
 * - Bridges communication between page context and background
 *
 * NOTE: This file must NOT use ES module imports because Firefox MV2
 * content scripts cannot use modules. We use the native browser API.
 */

// Message type constants (inlined to avoid imports)
const MSG_INJECT_CONFIG = 'GET_INJECT_CONFIG';
const MSG_FINGERPRINT_REPORT = 'FINGERPRINT_REPORT';
const MSG_GET_FINGERPRINT_REPORT = 'GET_FINGERPRINT_REPORT';
const MSG_GET_RECOMMENDATIONS = 'GET_RECOMMENDATIONS';
const PAGE_MSG_FINGERPRINT_REPORT = 'CONTAINER_SHIELD_FINGERPRINT_REPORT';
const PAGE_MSG_GET_REPORT = 'CONTAINER_SHIELD_GET_REPORT';
const PAGE_MSG_GET_RECOMMENDATIONS = 'CONTAINER_SHIELD_GET_RECOMMENDATIONS';

// Use the native browser API (Firefox has it built-in)
declare const browser: typeof chrome;

interface InjectConfig {
  containerId: string;
  domain: string;
  seed: string;
  settings: unknown;
  profile: unknown;
  assignedProfile: unknown;
}

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
    console.log('[ContainerShield Content] No config available, skipping injection');
    return;
  }

  // Create a script element to inject into the page
  const script = document.createElement('script');
  script.src = browser.runtime.getURL('inject/index.js');

  // Pass configuration via a meta tag
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

  console.log('[ContainerShield Content] Spoofers injected for container:', config.containerId);
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
    } catch {
      // Extension context may be invalidated
    }
  }
});

/**
 * Listen for messages from the popup requesting fingerprint data
 */
browser.runtime.onMessage.addListener((message: { type: string; settings?: unknown }) => {
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

  return false;
});
