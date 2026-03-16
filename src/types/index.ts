// Re-export all types
export * from './settings';

/**
 * Message types for communication between extension components
 */
export type MessageType =
  | 'GET_SETTINGS'
  | 'SET_SETTINGS'
  | 'GET_ENTROPY'
  | 'GET_CONTAINER_INFO'
  | 'GET_ALL_CONTAINERS'
  | 'IP_CONFLICT_CHECK'
  | 'IP_CONFLICT_RESOLVED'
  | 'INJECT_CONFIG';

/**
 * Base message structure
 */
export interface BaseMessage {
  type: MessageType;
}

/**
 * Get settings request
 */
export interface GetSettingsMessage extends BaseMessage {
  type: 'GET_SETTINGS';
  containerId: string;
  domain?: string;
}

/**
 * Set settings request
 */
export interface SetSettingsMessage extends BaseMessage {
  type: 'SET_SETTINGS';
  containerId: string;
  settings: Partial<import('./settings').ContainerSettings>;
}

/**
 * Get entropy request
 */
export interface GetEntropyMessage extends BaseMessage {
  type: 'GET_ENTROPY';
  containerId: string;
}

/**
 * Get container info request
 */
export interface GetContainerInfoMessage extends BaseMessage {
  type: 'GET_CONTAINER_INFO';
  tabId?: number;
}

/**
 * Get all containers request
 */
export interface GetAllContainersMessage extends BaseMessage {
  type: 'GET_ALL_CONTAINERS';
}

/**
 * IP conflict check request
 */
export interface IPConflictCheckMessage extends BaseMessage {
  type: 'IP_CONFLICT_CHECK';
  ip: string;
  containerId: string;
}

/**
 * Assigned profile for a container (unique across all containers)
 */
export interface AssignedProfileData {
  userAgent: {
    id: string;
    name: string;
    userAgent: string;
    platform: string;
    vendor: string;
    appVersion: string;
    oscpu?: string;
    mobile: boolean;
    platformName: string;
    platformVersion: string;
    brands?: { brand: string; version: string }[];
  };
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
    devicePixelRatio: number;
  };
  hardwareConcurrency: number;
  deviceMemory: number;
  timezoneOffset: number;
  languages: string[];
}

/**
 * Config to inject into page context
 */
export interface InjectConfig {
  containerId: string;
  domain: string;
  seed: string;
  settings: import('./settings').SpooferSettings;
  profile: import('./settings').ProfileConfig;
  assignedProfile?: AssignedProfileData;
}

/**
 * Inject config message
 */
export interface InjectConfigMessage extends BaseMessage {
  type: 'INJECT_CONFIG';
  config: InjectConfig;
}

/**
 * Union of all message types
 */
export type ExtensionMessage =
  | GetSettingsMessage
  | SetSettingsMessage
  | GetEntropyMessage
  | GetContainerInfoMessage
  | GetAllContainersMessage
  | IPConflictCheckMessage
  | InjectConfigMessage;

/**
 * Firefox container identity
 */
export interface ContainerIdentity {
  cookieStoreId: string;
  name: string;
  color: string;
  colorCode: string;
  icon: string;
}
