/**
 * Content Script - Runs in content script context
 *
 * Injects the spoofer code into the page context SYNCHRONOUSLY,
 * requests config from background, and bridges communication.
 *
 * CRITICAL: The inject script must run BEFORE any page scripts.
 * We use XMLHttpRequest (sync) to fetch and inline the script,
 * rather than <script src="..."> which loads asynchronously.
 */

const MSG_INJECT_CONFIG = 'GET_SPOOF_CONFIG';
const MSG_FINGERPRINT_REPORT = 'FINGERPRINT_REPORT';
const MSG_GET_FINGERPRINT_REPORT = 'GET_FINGERPRINT_REPORT';
const MSG_GET_RECOMMENDATIONS = 'GET_RECOMMENDATIONS';
const PAGE_MSG_FINGERPRINT_REPORT = 'CONTAINER_SHIELD_FINGERPRINT_REPORT';
const PAGE_MSG_GET_REPORT = 'CONTAINER_SHIELD_GET_REPORT';
const PAGE_MSG_GET_RECOMMENDATIONS = 'CONTAINER_SHIELD_GET_RECOMMENDATIONS';
const PAGE_MSG_CONFIG_READY = 'CONTAINER_SHIELD_CONFIG_READY';

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
 * Inject the spoofer script SYNCHRONOUSLY into the page context.
 * Uses sync XHR to fetch the script content and inline it,
 * ensuring it runs before any page scripts.
 */
function injectScript(): void {
  const scriptUrl = browser.runtime.getURL('inject/index.js');

  try {
    // Synchronous XHR to get script content - blocks until loaded
    const xhr = new XMLHttpRequest();
    xhr.open('GET', scriptUrl, false); // false = synchronous
    xhr.send();

    if (xhr.status === 200) {
      const script = document.createElement('script');
      script.textContent = xhr.responseText;
      // Insert at very start of document - runs immediately and synchronously
      (document.documentElement || document.head).insertBefore(
        script, (document.documentElement || document.head).firstChild
      );
      script.remove();
    }
  } catch {
    // Fallback to async <script src> if sync XHR fails
    const script = document.createElement('script');
    script.src = scriptUrl;
    (document.documentElement || document.head).insertBefore(
      script, (document.documentElement || document.head).firstChild
    );
    script.onload = () => script.remove();
  }
}

async function fetchAndSendConfig(): Promise<void> {
  try {
    const config = await browser.runtime.sendMessage({
      type: MSG_INJECT_CONFIG,
    }) as InjectConfig | null;

    window.postMessage({
      type: PAGE_MSG_CONFIG_READY,
      config: config && config.seed && config.settings ? config : null,
    }, '*');
  } catch (error) {
    console.error('[ContainerShield] Failed to get config:', error);
    window.postMessage({ type: PAGE_MSG_CONFIG_READY, config: null }, '*');
  }
}

// CRITICAL: Inject SYNCHRONOUSLY at document_start
injectScript();

// Fetch config from background and send to injected script
setTimeout(fetchAndSendConfig, 50);

// Bridge page -> background messages
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  const { type, ...data } = event.data || {};

  if (type === PAGE_MSG_FINGERPRINT_REPORT) {
    try {
      await browser.runtime.sendMessage({
        type: MSG_FINGERPRINT_REPORT,
        summary: data.summary,
        detail: data.detail,
        url: data.url,
      });
    } catch {}
  }
});

// Listen for popup/background requests
browser.runtime.onMessage.addListener((message: { type: string; settings?: unknown }) => {
  if (message.type === MSG_GET_FINGERPRINT_REPORT) {
    window.postMessage({ type: PAGE_MSG_GET_REPORT }, '*');
    return true;
  }
  if (message.type === MSG_GET_RECOMMENDATIONS) {
    window.postMessage({ type: PAGE_MSG_GET_RECOMMENDATIONS, settings: message.settings }, '*');
    return true;
  }
  return false;
});
