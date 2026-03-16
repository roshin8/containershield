/**
 * Message type constants for extension communication
 *
 * All message types used between background, content, popup, and injected scripts
 * should be defined here to avoid typos and enable type safety.
 */

// Background script message types
export const MSG_GET_SETTINGS = 'GET_SETTINGS' as const;
export const MSG_SET_SETTINGS = 'SET_SETTINGS' as const;
export const MSG_GET_ENTROPY = 'GET_ENTROPY' as const;
export const MSG_GET_CONTAINER_INFO = 'GET_CONTAINER_INFO' as const;
export const MSG_GET_ALL_CONTAINERS = 'GET_ALL_CONTAINERS' as const;
export const MSG_IP_CONFLICT_CHECK = 'IP_CONFLICT_CHECK' as const;
export const MSG_INJECT_CONFIG = 'INJECT_CONFIG' as const;

// Fingerprint monitoring message types
export const MSG_FINGERPRINT_REPORT = 'FINGERPRINT_REPORT' as const;
export const MSG_GET_FINGERPRINT_DATA = 'GET_FINGERPRINT_DATA' as const;
export const MSG_GET_RECOMMENDATIONS = 'GET_RECOMMENDATIONS' as const;
export const MSG_GET_FINGERPRINT_REPORT = 'GET_FINGERPRINT_REPORT' as const;

// Page script to content script message types (via window.postMessage)
export const PAGE_MSG_FINGERPRINT_REPORT = 'CONTAINER_SHIELD_FINGERPRINT_REPORT' as const;
export const PAGE_MSG_GET_REPORT = 'CONTAINER_SHIELD_GET_REPORT' as const;
export const PAGE_MSG_GET_RECOMMENDATIONS = 'CONTAINER_SHIELD_GET_RECOMMENDATIONS' as const;
export const PAGE_MSG_RECOMMENDATIONS = 'CONTAINER_SHIELD_RECOMMENDATIONS' as const;

// All message types as a union type for type checking
export type BackgroundMessageType =
  | typeof MSG_GET_SETTINGS
  | typeof MSG_SET_SETTINGS
  | typeof MSG_GET_ENTROPY
  | typeof MSG_GET_CONTAINER_INFO
  | typeof MSG_GET_ALL_CONTAINERS
  | typeof MSG_IP_CONFLICT_CHECK
  | typeof MSG_INJECT_CONFIG
  | typeof MSG_FINGERPRINT_REPORT
  | typeof MSG_GET_FINGERPRINT_DATA
  | typeof MSG_GET_RECOMMENDATIONS
  | typeof MSG_GET_FINGERPRINT_REPORT;

export type PageMessageType =
  | typeof PAGE_MSG_FINGERPRINT_REPORT
  | typeof PAGE_MSG_GET_REPORT
  | typeof PAGE_MSG_GET_RECOMMENDATIONS
  | typeof PAGE_MSG_RECOMMENDATIONS;
