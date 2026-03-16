/**
 * Inject Script - Runs in page context (MAIN world)
 *
 * This script wraps JavaScript APIs to add noise/block fingerprinting.
 * It runs before any page scripts, so all API access goes through our wrappers.
 */

import type { InjectConfig, SpooferSettings } from '@/types';
import { initializeSpoofers } from './spoofers';

/**
 * Read configuration from meta tag
 */
function readConfig(): InjectConfig | null {
  const configElement = document.querySelector('meta[name="chameleon-containers-config"]');

  if (!configElement) {
    return null;
  }

  try {
    const content = configElement.getAttribute('content');
    if (!content) return null;

    return JSON.parse(atob(content)) as InjectConfig;
  } catch (error) {
    console.error('[ChameleonContainers] Failed to parse config:', error);
    return null;
  }
}

/**
 * Check if all spoofers are disabled
 */
function allSpoofersDisabled(settings: SpooferSettings): boolean {
  const categories = Object.values(settings);

  for (const category of categories) {
    const values = Object.values(category);
    for (const value of values) {
      if (value !== 'off') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Main initialization
 */
function init(): void {
  const config = readConfig();

  if (!config) {
    console.log('[ChameleonContainers] No config found, protection disabled');
    return;
  }

  // Skip if all spoofers are disabled
  if (allSpoofersDisabled(config.settings)) {
    console.log('[ChameleonContainers] All spoofers disabled, skipping');
    return;
  }

  console.log('[ChameleonContainers] Initializing spoofers for:', config.domain);

  // Initialize all spoofers with the configuration
  initializeSpoofers(config);
}

// Run immediately
init();
