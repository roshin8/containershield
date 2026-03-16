/**
 * Shared constants for Chameleon Containers
 */

/**
 * Default cookie store ID for non-containerized tabs
 */
export const DEFAULT_COOKIE_STORE_ID = 'firefox-default';

/**
 * Private browsing cookie store ID
 */
export const PRIVATE_COOKIE_STORE_ID = 'firefox-private';

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  GLOBAL_SETTINGS: 'chameleon_global_settings',
  CONTAINER_SETTINGS: 'chameleon_container_settings',
  ENTROPY: 'chameleon_entropy',
  IP_DATABASE: 'chameleon_ip_database',
  VERSION: 'chameleon_version',
} as const;

/**
 * Extension version
 */
export const EXTENSION_VERSION = '0.1.0';

/**
 * Protection level names
 */
export const PROTECTION_LEVEL_NAMES = {
  0: 'Off',
  1: 'Minimal',
  2: 'Balanced',
  3: 'Strict',
} as const;

/**
 * Protection level descriptions
 */
export const PROTECTION_LEVEL_DESCRIPTIONS = {
  0: 'No protection - all APIs work normally',
  1: 'Header spoofing only - no JavaScript wrapping',
  2: 'Noise injection for fingerprinting APIs (recommended)',
  3: 'Block or fake all fingerprintable APIs',
} as const;

/**
 * Firefox container colors
 */
export const CONTAINER_COLORS = {
  blue: '#37adff',
  turquoise: '#00c79a',
  green: '#51cd00',
  yellow: '#ffcb00',
  orange: '#ff9f00',
  red: '#ff613d',
  pink: '#ff4bda',
  purple: '#af51f5',
} as const;

/**
 * Firefox container icons
 */
export const CONTAINER_ICONS = [
  'fingerprint',
  'briefcase',
  'dollar',
  'cart',
  'circle',
  'gift',
  'vacation',
  'food',
  'fruit',
  'pet',
  'tree',
  'chill',
  'fence',
] as const;

/**
 * Message passing timeout (ms)
 */
export const MESSAGE_TIMEOUT = 5000;

/**
 * Maximum URLs to store per IP in the IP database
 */
export const MAX_IP_URL_HISTORY = 10;

/**
 * Regex patterns for IP address detection
 */
export const IP_PATTERNS = {
  IPV4: /^(\d{1,3}\.){3}\d{1,3}$/,
  IPV6: /^(\[)?([0-9a-fA-F:]+)(\])?$/,
  LOCAL_IPV4: /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/,
  LOCALHOST: /^(127\.|::1|localhost)/i,
} as const;

/**
 * WebRTC IP handling policy values
 */
export const WEBRTC_POLICIES = {
  DEFAULT: 'default',
  PUBLIC_ONLY: 'default_public_interface_only',
  DISABLE: 'disable_non_proxied_udp',
} as const;
