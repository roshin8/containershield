/**
 * Content Script - Message bridge between page context and background.
 *
 * In MV3, inject/index.js runs directly in the page context via world:"MAIN".
 * This content script only bridges messages since the page context
 * cannot access extension APIs.
 */

const MSG_FINGERPRINT_REPORT = 'FINGERPRINT_REPORT';
const MSG_GET_FINGERPRINT_REPORT = 'GET_FINGERPRINT_REPORT';
const MSG_GET_RECOMMENDATIONS = 'GET_RECOMMENDATIONS';
const PAGE_MSG_FINGERPRINT_REPORT = 'CONTAINER_SHIELD_FINGERPRINT_REPORT';
const PAGE_MSG_GET_REPORT = 'CONTAINER_SHIELD_GET_REPORT';
const PAGE_MSG_GET_RECOMMENDATIONS = 'CONTAINER_SHIELD_GET_RECOMMENDATIONS';

declare const browser: typeof chrome;

// Page → Background: forward fingerprint reports
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
    } catch {
      // Extension context invalidated (e.g., extension updated)
    }
  }
});

// Background → Page: forward report/recommendation requests
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
