/**
 * Protection mode for each fingerprinting signal
 */
export type ProtectionMode = 'off' | 'noise' | 'block';

/**
 * WebRTC protection modes
 */
export type WebRTCMode = 'off' | 'public_only' | 'block';

/**
 * Protection level presets
 * 0 = Off - No protection
 * 1 = Minimal - Headers only, no JS wrapping
 * 2 = Balanced - Noise injection (recommended)
 * 3 = Strict - Block/fake all fingerprintable APIs
 */
export type ProtectionLevel = 0 | 1 | 2 | 3;

/**
 * Profile mode for browser identity
 */
export type ProfileMode = 'real' | 'preset' | 'random' | 'custom';

/**
 * Referer policy options
 */
export type RefererPolicy = 'off' | 'origin' | 'same-origin';

/**
 * Browser profile configuration
 */
export interface ProfileConfig {
  mode: ProfileMode;
  userAgent?: string;
  platform?: string;
  language?: string;
  timezone?: string | 'real' | 'ip';
  screen?: { width: number; height: number };
}

/**
 * Header spoofing configuration
 */
export interface HeaderConfig {
  spoofUserAgent: boolean;
  spoofAcceptLanguage: boolean;
  refererPolicy: RefererPolicy;
  disableEtag: boolean;
  sendDNT: boolean;
}

/**
 * Graphics spoofer settings
 */
export interface GraphicsSpoofers {
  canvas: ProtectionMode;
  offscreenCanvas: ProtectionMode;
  webgl: ProtectionMode;
  webgl2: ProtectionMode;
  webglShaders: ProtectionMode;
  webgpu: ProtectionMode;
  svg: ProtectionMode;
  domRect: ProtectionMode;
  textMetrics: ProtectionMode;
}

/**
 * Audio spoofer settings
 */
export interface AudioSpoofers {
  audioContext: ProtectionMode;
  offlineAudio: ProtectionMode;
  latency: ProtectionMode;
  codecs: ProtectionMode;
}

/**
 * Hardware spoofer settings
 */
export interface HardwareSpoofers {
  screen: ProtectionMode;
  screenFrame: ProtectionMode;
  orientation: ProtectionMode;
  deviceMemory: ProtectionMode;
  hardwareConcurrency: ProtectionMode;
  mediaDevices: ProtectionMode;
  battery: ProtectionMode;
  gpu: ProtectionMode;
  touch: ProtectionMode;
  sensors: ProtectionMode;
}

/**
 * Navigator spoofer settings
 */
export interface NavigatorSpoofers {
  userAgent: ProtectionMode;
  languages: ProtectionMode;
  plugins: ProtectionMode;
  clientHints: ProtectionMode;
  clipboard: ProtectionMode;
  vibration: ProtectionMode;
}

/**
 * Timezone spoofer settings
 */
export interface TimezoneSpoofers {
  intl: ProtectionMode;
  date: ProtectionMode;
}

/**
 * Font spoofer settings
 */
export interface FontSpoofers {
  enumeration: ProtectionMode;
  cssDetection: ProtectionMode;
}

/**
 * Network spoofer settings
 */
export interface NetworkSpoofers {
  webrtc: WebRTCMode;
  connection: ProtectionMode;
}

/**
 * Timing spoofer settings
 */
export interface TimingSpoofers {
  performance: ProtectionMode;
}

/**
 * CSS spoofer settings
 */
export interface CssSpoofers {
  mediaQueries: ProtectionMode;
}

/**
 * Speech spoofer settings
 */
export interface SpeechSpoofers {
  synthesis: ProtectionMode;
}

/**
 * Permissions spoofer settings
 */
export interface PermissionsSpoofers {
  query: ProtectionMode;
  notification: ProtectionMode;
}

/**
 * Storage spoofer settings
 */
export interface StorageSpoofers {
  estimate: ProtectionMode;
  indexedDB: ProtectionMode;
  webSQL: ProtectionMode;
}

/**
 * Math spoofer settings
 */
export interface MathSpoofers {
  functions: ProtectionMode;
}

/**
 * Keyboard spoofer settings
 */
export interface KeyboardSpoofers {
  layout: ProtectionMode;
}

/**
 * Workers spoofer settings
 */
export interface WorkersSpoofers {
  fingerprint: ProtectionMode;
}

/**
 * Errors spoofer settings
 */
export interface ErrorsSpoofers {
  stackTrace: ProtectionMode;
}

/**
 * Rendering spoofer settings
 */
export interface RenderingSpoofers {
  emoji: ProtectionMode;
  mathml: ProtectionMode;
}

/**
 * Intl spoofer settings
 */
export interface IntlSpoofers {
  apis: ProtectionMode;
}

/**
 * Crypto spoofer settings
 */
export interface CryptoSpoofers {
  webCrypto: ProtectionMode;
}

/**
 * Devices spoofer settings
 */
export interface DevicesSpoofers {
  gamepad: ProtectionMode;
  midi: ProtectionMode;
  bluetooth: ProtectionMode;
  usb: ProtectionMode;
  serial: ProtectionMode;
  hid: ProtectionMode;
}

/**
 * Features spoofer settings
 */
export interface FeaturesSpoofers {
  detection: ProtectionMode;
}

/**
 * Payment spoofer settings
 */
export interface PaymentSpoofers {
  applePay: ProtectionMode;
}

/**
 * All spoofer settings organized by category
 */
export interface SpooferSettings {
  graphics: GraphicsSpoofers;
  audio: AudioSpoofers;
  hardware: HardwareSpoofers;
  navigator: NavigatorSpoofers;
  timezone: TimezoneSpoofers;
  fonts: FontSpoofers;
  network: NetworkSpoofers;
  timing: TimingSpoofers;
  css: CssSpoofers;
  speech: SpeechSpoofers;
  permissions: PermissionsSpoofers;
  storage: StorageSpoofers;
  math: MathSpoofers;
  keyboard: KeyboardSpoofers;
  workers: WorkersSpoofers;
  errors: ErrorsSpoofers;
  rendering: RenderingSpoofers;
  intl: IntlSpoofers;
  crypto: CryptoSpoofers;
  devices: DevicesSpoofers;
  features: FeaturesSpoofers;
  payment: PaymentSpoofers;
}

/**
 * Settings for a single container
 */
export interface ContainerSettings {
  enabled: boolean;
  protectionLevel: ProtectionLevel;
  profile: ProfileConfig;
  headers: HeaderConfig;
  spoofers: SpooferSettings;
  domainRules: Record<string, Partial<ContainerSettings>>;
}

/**
 * Per-container entropy (cryptographic seed for fingerprint generation)
 */
export interface ContainerEntropy {
  cookieStoreId: string;
  seed: string; // Base64-encoded 32-byte seed
  createdAt: number;
  rotatedAt?: number;
}

/**
 * IP address record for IP isolation feature
 */
export interface IPRecord {
  ip: string;
  containerId: string;
  containerName: string;
  firstAccessed: number;
  lastAccessed: number;
  accessCount: number;
  urls: string[];
}

/**
 * IP isolation settings
 */
export interface IPIsolationSettings {
  enabled: boolean;
  warnOnly: boolean;
  trackLocalIPs: boolean;
  trackLocalhostIPs: boolean;
  maxUrlHistory: number;
}

/**
 * IP database stored in browser.storage.local
 */
export interface IPDatabase {
  ipRecords: Record<string, IPRecord>;
  settings: IPIsolationSettings;
  exceptions: string[];
}

/**
 * Global extension storage
 */
export interface GlobalStorage {
  containers: Record<string, ContainerSettings>;
  entropy: Record<string, ContainerEntropy>;
  defaults: ContainerSettings;
  ipDatabase: IPDatabase;
  version: string;
}

/**
 * Default settings factory
 */
export function createDefaultSettings(): ContainerSettings {
  return {
    enabled: true,
    protectionLevel: 2, // Balanced
    profile: {
      mode: 'random',
    },
    headers: {
      spoofUserAgent: true,
      spoofAcceptLanguage: true,
      refererPolicy: 'same-origin',
      disableEtag: true,
      sendDNT: false,
    },
    spoofers: {
      graphics: {
        canvas: 'noise',
        offscreenCanvas: 'noise',
        webgl: 'noise',
        webgl2: 'noise',
        webglShaders: 'noise',
        webgpu: 'noise',
        svg: 'noise',
        domRect: 'noise',
        textMetrics: 'noise',
      },
      audio: {
        audioContext: 'noise',
        offlineAudio: 'noise',
        latency: 'noise',
        codecs: 'off',
      },
      hardware: {
        screen: 'noise',
        screenFrame: 'noise',
        orientation: 'noise',
        deviceMemory: 'noise',
        hardwareConcurrency: 'noise',
        mediaDevices: 'noise',
        battery: 'block',
        gpu: 'noise',
        touch: 'noise',
        sensors: 'block',
      },
      navigator: {
        userAgent: 'noise',
        languages: 'noise',
        plugins: 'noise',
        clientHints: 'noise',
        clipboard: 'block',
        vibration: 'noise',
      },
      timezone: {
        intl: 'noise',
        date: 'noise',
      },
      fonts: {
        enumeration: 'noise',
        cssDetection: 'noise',
      },
      network: {
        webrtc: 'public_only',
        connection: 'off',
      },
      timing: {
        performance: 'noise',
      },
      css: {
        mediaQueries: 'noise',
      },
      speech: {
        synthesis: 'noise',
      },
      permissions: {
        query: 'noise',
        notification: 'noise',
      },
      storage: {
        estimate: 'noise',
        indexedDB: 'noise',
        webSQL: 'block',
      },
      math: {
        functions: 'noise',
      },
      keyboard: {
        layout: 'noise',
      },
      workers: {
        fingerprint: 'noise',
      },
      errors: {
        stackTrace: 'noise',
      },
      rendering: {
        emoji: 'noise',
        mathml: 'noise',
      },
      intl: {
        apis: 'noise',
      },
      crypto: {
        webCrypto: 'noise',
      },
      devices: {
        gamepad: 'block',
        midi: 'block',
        bluetooth: 'block',
        usb: 'block',
        serial: 'block',
        hid: 'block',
      },
      features: {
        detection: 'noise',
      },
      payment: {
        applePay: 'block',
      },
    },
    domainRules: {},
  };
}

/**
 * Create default IP isolation settings
 */
export function createDefaultIPSettings(): IPIsolationSettings {
  return {
    enabled: true,
    warnOnly: false,
    trackLocalIPs: true,
    trackLocalhostIPs: false,
    maxUrlHistory: 10,
  };
}
