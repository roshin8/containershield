/**
 * ServiceWorker Script Injector
 *
 * Uses webRequest.filterResponseData to inject spoofer preamble into
 * ServiceWorker script HTTP responses. This is the only reliable way
 * to spoof values inside ServiceWorkers since:
 * - blob: URL registration fails in Firefox for SWs
 * - Content scripts can't access SW context
 * - world:MAIN doesn't run in SW scope
 *
 * The preamble overrides navigator, Date, Intl, OffscreenCanvas etc.
 * inside the Worker scope before the site's SW code runs.
 */

import browser from 'webextension-polyfill';

let swPreamble = '';

/**
 * Set the preamble code that gets injected into ServiceWorker scripts.
 * Called from message handler when the inject script sends its profile.
 */
export function setSWPreamble(preamble: string): void {
  swPreamble = preamble;
}

export function getSWPreamble(): string {
  return swPreamble;
}

/**
 * Initialize SW script interception via filterResponseData.
 * Intercepts requests of type 'service_worker' and prepends our preamble.
 */
export function initSWInjector(): void {
  // Firefox MV3 supports filterResponseData for modifying response bodies
  if (!(browser.webRequest as any).filterResponseData) {
    return;
  }

  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      // Only intercept service_worker type requests
      if (details.type !== 'service_worker' || !swPreamble) {
        return {};
      }

      try {
        const filter = (browser.webRequest as any).filterResponseData(details.requestId);
        const decoder = new TextDecoder('utf-8');
        const encoder = new TextEncoder();
        let data = '';

        filter.ondata = (event: any) => {
          data += decoder.decode(event.data, { stream: true });
        };

        filter.onstop = () => {
          // Prepend our preamble to the SW script
          const modified = swPreamble + '\n' + data;
          filter.write(encoder.encode(modified));
          filter.close();
        };

        filter.onerror = () => {
          // On error, pass through original data
          try { filter.close(); } catch {}
        };
      } catch {
        return {};
      }

      return {};
    },
    { urls: ['<all_urls>'] },
    ['blocking']
  );
}
