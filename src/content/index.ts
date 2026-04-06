/**
 * Content Script - Runs in content script context at document_start
 *
 * Two-phase approach:
 * Phase 1: Inject spoofer script SYNCHRONOUSLY with no config.
 *          The inject script uses a deterministic fallback profile
 *          generated from the domain name.
 * Phase 2: (Not implemented - fallback is the only profile)
 *
 * The fallback profile IS the profile. It's deterministic per domain
 * so values are consistent across page loads. The background's assigned
 * profile is used by the popup for display purposes only.
 */

const MSG_FINGERPRINT_REPORT = 'FINGERPRINT_REPORT';
const MSG_GET_FINGERPRINT_REPORT = 'GET_FINGERPRINT_REPORT';
const MSG_GET_RECOMMENDATIONS = 'GET_RECOMMENDATIONS';
const PAGE_MSG_FINGERPRINT_REPORT = 'CONTAINER_SHIELD_FINGERPRINT_REPORT';
const PAGE_MSG_GET_REPORT = 'CONTAINER_SHIELD_GET_REPORT';
const PAGE_MSG_GET_RECOMMENDATIONS = 'CONTAINER_SHIELD_GET_RECOMMENDATIONS';

declare const browser: typeof chrome;

// Inject spoofer script SYNCHRONOUSLY at document_start
// No async operations - this MUST run before any page scripts
//
// Strategy: Try multiple injection methods for maximum reliability.
// 1. wrappedJSObject.eval (Firefox-specific, runs in page context directly)
// 2. Inline <script> tag via sync XHR
// 3. <script src> fallback (async, less reliable)
(function injectImmediately() {
  const scriptUrl = browser.runtime.getURL('inject/index.js');
  let scriptContent: string | null = null;

  // Fetch the script content synchronously
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', scriptUrl, false);
    xhr.send();
    if (xhr.status === 200) {
      scriptContent = xhr.responseText;
    }
  } catch {}

  if (!scriptContent) return;

  // Method 1: wrappedJSObject.eval — most reliable for Firefox
  // This runs code directly in the page's JS context, bypassing all CSP restrictions
  // and ensuring it executes BEFORE any page scripts.
  try {
    const pageWindow = (window as any).wrappedJSObject;
    if (pageWindow) {
      pageWindow.eval(scriptContent);
      return;
    }
  } catch {}

  // Method 2: Inline <script> tag
  try {
    const script = document.createElement('script');
    script.textContent = scriptContent;
    (document.documentElement || document.head).insertBefore(
      script, (document.documentElement || document.head).firstChild
    );
    script.remove();
  } catch {
    // Method 3: <script src> fallback (async)
    const script = document.createElement('script');
    script.src = scriptUrl;
    (document.documentElement || document.head).insertBefore(
      script, (document.documentElement || document.head).firstChild
    );
    script.onload = () => script.remove();
  }
})();

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
