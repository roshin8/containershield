/**
 * User Agent Profile Database
 *
 * Comprehensive collection of realistic browser profiles for spoofing.
 * Each profile includes all related navigator properties for consistency.
 */

export interface UserAgentProfile {
  id: string;
  name: string;
  userAgent: string;
  platform: string;
  vendor: string;
  vendorSub: string;
  appVersion: string;
  appName: string;
  appCodeName: string;
  product: string;
  productSub: string;
  oscpu?: string;
  buildID?: string;

  // Client hints data
  brands?: { brand: string; version: string }[];
  mobile: boolean;
  platformName: string;
  platformVersion: string;
  architecture: string;
  bitness: string;
  model: string;
  fullVersionList?: { brand: string; version: string }[];
}

// Windows 10/11 Chrome profiles
const WINDOWS_CHROME_PROFILES: UserAgentProfile[] = [
  {
    id: 'win-chrome-120',
    name: 'Chrome 120 (Windows 10)',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    platform: 'Win32',
    vendor: 'Google Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: false,
    platformName: 'Windows',
    platformVersion: '10.0.0',
    architecture: 'x86',
    bitness: '64',
    model: '',
    brands: [
      { brand: 'Not_A Brand', version: '8' },
      { brand: 'Chromium', version: '120' },
      { brand: 'Google Chrome', version: '120' },
    ],
    fullVersionList: [
      { brand: 'Not_A Brand', version: '8.0.0.0' },
      { brand: 'Chromium', version: '120.0.6099.130' },
      { brand: 'Google Chrome', version: '120.0.6099.130' },
    ],
  },
  {
    id: 'win-chrome-121',
    name: 'Chrome 121 (Windows 10)',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    platform: 'Win32',
    vendor: 'Google Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: false,
    platformName: 'Windows',
    platformVersion: '10.0.0',
    architecture: 'x86',
    bitness: '64',
    model: '',
    brands: [
      { brand: 'Not A(Brand', version: '99' },
      { brand: 'Google Chrome', version: '121' },
      { brand: 'Chromium', version: '121' },
    ],
    fullVersionList: [
      { brand: 'Not A(Brand', version: '99.0.0.0' },
      { brand: 'Google Chrome', version: '121.0.6167.85' },
      { brand: 'Chromium', version: '121.0.6167.85' },
    ],
  },
  {
    id: 'win11-chrome-122',
    name: 'Chrome 122 (Windows 11)',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    platform: 'Win32',
    vendor: 'Google Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: false,
    platformName: 'Windows',
    platformVersion: '15.0.0',
    architecture: 'x86',
    bitness: '64',
    model: '',
    brands: [
      { brand: 'Chromium', version: '122' },
      { brand: 'Not(A:Brand', version: '24' },
      { brand: 'Google Chrome', version: '122' },
    ],
    fullVersionList: [
      { brand: 'Chromium', version: '122.0.6261.112' },
      { brand: 'Not(A:Brand', version: '24.0.0.0' },
      { brand: 'Google Chrome', version: '122.0.6261.112' },
    ],
  },
];

// Windows Firefox profiles
const WINDOWS_FIREFOX_PROFILES: UserAgentProfile[] = [
  {
    id: 'win-firefox-121',
    name: 'Firefox 121 (Windows 10)',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    platform: 'Win32',
    vendor: '',
    vendorSub: '',
    appVersion: '5.0 (Windows)',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20100101',
    oscpu: 'Windows NT 10.0; Win64; x64',
    buildID: '20231219112346',
    mobile: false,
    platformName: 'Windows',
    platformVersion: '10.0',
    architecture: 'x86_64',
    bitness: '64',
    model: '',
  },
  {
    id: 'win-firefox-122',
    name: 'Firefox 122 (Windows 10)',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    platform: 'Win32',
    vendor: '',
    vendorSub: '',
    appVersion: '5.0 (Windows)',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20100101',
    oscpu: 'Windows NT 10.0; Win64; x64',
    buildID: '20240116161852',
    mobile: false,
    platformName: 'Windows',
    platformVersion: '10.0',
    architecture: 'x86_64',
    bitness: '64',
    model: '',
  },
  {
    id: 'win-firefox-123',
    name: 'Firefox 123 (Windows 11)',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    platform: 'Win32',
    vendor: '',
    vendorSub: '',
    appVersion: '5.0 (Windows)',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20100101',
    oscpu: 'Windows NT 10.0; Win64; x64',
    buildID: '20240213104200',
    mobile: false,
    platformName: 'Windows',
    platformVersion: '15.0',
    architecture: 'x86_64',
    bitness: '64',
    model: '',
  },
];

// Windows Edge profiles
const WINDOWS_EDGE_PROFILES: UserAgentProfile[] = [
  {
    id: 'win-edge-120',
    name: 'Edge 120 (Windows 10)',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91',
    platform: 'Win32',
    vendor: 'Google Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: false,
    platformName: 'Windows',
    platformVersion: '10.0.0',
    architecture: 'x86',
    bitness: '64',
    model: '',
    brands: [
      { brand: 'Not_A Brand', version: '8' },
      { brand: 'Chromium', version: '120' },
      { brand: 'Microsoft Edge', version: '120' },
    ],
    fullVersionList: [
      { brand: 'Not_A Brand', version: '8.0.0.0' },
      { brand: 'Chromium', version: '120.0.6099.130' },
      { brand: 'Microsoft Edge', version: '120.0.2210.91' },
    ],
  },
  {
    id: 'win-edge-121',
    name: 'Edge 121 (Windows 11)',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.2277.83',
    platform: 'Win32',
    vendor: 'Google Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.2277.83',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: false,
    platformName: 'Windows',
    platformVersion: '15.0.0',
    architecture: 'x86',
    bitness: '64',
    model: '',
    brands: [
      { brand: 'Not A(Brand', version: '99' },
      { brand: 'Microsoft Edge', version: '121' },
      { brand: 'Chromium', version: '121' },
    ],
    fullVersionList: [
      { brand: 'Not A(Brand', version: '99.0.0.0' },
      { brand: 'Microsoft Edge', version: '121.0.2277.83' },
      { brand: 'Chromium', version: '121.0.6167.85' },
    ],
  },
];

// macOS Chrome profiles
const MACOS_CHROME_PROFILES: UserAgentProfile[] = [
  {
    id: 'mac-chrome-120',
    name: 'Chrome 120 (macOS Sonoma)',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    platform: 'MacIntel',
    vendor: 'Google Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: false,
    platformName: 'macOS',
    platformVersion: '14.2.1',
    architecture: 'x86',
    bitness: '64',
    model: '',
    brands: [
      { brand: 'Not_A Brand', version: '8' },
      { brand: 'Chromium', version: '120' },
      { brand: 'Google Chrome', version: '120' },
    ],
    fullVersionList: [
      { brand: 'Not_A Brand', version: '8.0.0.0' },
      { brand: 'Chromium', version: '120.0.6099.130' },
      { brand: 'Google Chrome', version: '120.0.6099.130' },
    ],
  },
  {
    id: 'mac-chrome-121',
    name: 'Chrome 121 (macOS Sonoma)',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    platform: 'MacIntel',
    vendor: 'Google Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: false,
    platformName: 'macOS',
    platformVersion: '14.3.0',
    architecture: 'x86',
    bitness: '64',
    model: '',
    brands: [
      { brand: 'Not A(Brand', version: '99' },
      { brand: 'Google Chrome', version: '121' },
      { brand: 'Chromium', version: '121' },
    ],
    fullVersionList: [
      { brand: 'Not A(Brand', version: '99.0.0.0' },
      { brand: 'Google Chrome', version: '121.0.6167.85' },
      { brand: 'Chromium', version: '121.0.6167.85' },
    ],
  },
];

// macOS Safari profiles
const MACOS_SAFARI_PROFILES: UserAgentProfile[] = [
  {
    id: 'mac-safari-17',
    name: 'Safari 17 (macOS Sonoma)',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    platform: 'MacIntel',
    vendor: 'Apple Computer, Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: false,
    platformName: 'macOS',
    platformVersion: '14.2',
    architecture: '',
    bitness: '',
    model: '',
  },
  {
    id: 'mac-safari-17.3',
    name: 'Safari 17.3 (macOS Sonoma)',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    platform: 'MacIntel',
    vendor: 'Apple Computer, Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: false,
    platformName: 'macOS',
    platformVersion: '14.3',
    architecture: '',
    bitness: '',
    model: '',
  },
];

// macOS Firefox profiles
const MACOS_FIREFOX_PROFILES: UserAgentProfile[] = [
  {
    id: 'mac-firefox-121',
    name: 'Firefox 121 (macOS)',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    platform: 'MacIntel',
    vendor: '',
    vendorSub: '',
    appVersion: '5.0 (Macintosh)',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20100101',
    oscpu: 'Intel Mac OS X 10.15',
    buildID: '20231219112346',
    mobile: false,
    platformName: 'macOS',
    platformVersion: '10.15',
    architecture: 'x86_64',
    bitness: '64',
    model: '',
  },
  {
    id: 'mac-firefox-122',
    name: 'Firefox 122 (macOS)',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
    platform: 'MacIntel',
    vendor: '',
    vendorSub: '',
    appVersion: '5.0 (Macintosh)',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20100101',
    oscpu: 'Intel Mac OS X 10.15',
    buildID: '20240116161852',
    mobile: false,
    platformName: 'macOS',
    platformVersion: '10.15',
    architecture: 'x86_64',
    bitness: '64',
    model: '',
  },
];

// Linux Chrome profiles
const LINUX_CHROME_PROFILES: UserAgentProfile[] = [
  {
    id: 'linux-chrome-120',
    name: 'Chrome 120 (Linux)',
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    platform: 'Linux x86_64',
    vendor: 'Google Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: false,
    platformName: 'Linux',
    platformVersion: '',
    architecture: 'x86',
    bitness: '64',
    model: '',
    brands: [
      { brand: 'Not_A Brand', version: '8' },
      { brand: 'Chromium', version: '120' },
      { brand: 'Google Chrome', version: '120' },
    ],
    fullVersionList: [
      { brand: 'Not_A Brand', version: '8.0.0.0' },
      { brand: 'Chromium', version: '120.0.6099.130' },
      { brand: 'Google Chrome', version: '120.0.6099.130' },
    ],
  },
  {
    id: 'linux-chrome-121',
    name: 'Chrome 121 (Linux)',
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    platform: 'Linux x86_64',
    vendor: 'Google Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: false,
    platformName: 'Linux',
    platformVersion: '',
    architecture: 'x86',
    bitness: '64',
    model: '',
    brands: [
      { brand: 'Not A(Brand', version: '99' },
      { brand: 'Google Chrome', version: '121' },
      { brand: 'Chromium', version: '121' },
    ],
    fullVersionList: [
      { brand: 'Not A(Brand', version: '99.0.0.0' },
      { brand: 'Google Chrome', version: '121.0.6167.85' },
      { brand: 'Chromium', version: '121.0.6167.85' },
    ],
  },
];

// Linux Firefox profiles
const LINUX_FIREFOX_PROFILES: UserAgentProfile[] = [
  {
    id: 'linux-firefox-121',
    name: 'Firefox 121 (Linux)',
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    platform: 'Linux x86_64',
    vendor: '',
    vendorSub: '',
    appVersion: '5.0 (X11)',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20100101',
    oscpu: 'Linux x86_64',
    buildID: '20231219112346',
    mobile: false,
    platformName: 'Linux',
    platformVersion: '',
    architecture: 'x86_64',
    bitness: '64',
    model: '',
  },
  {
    id: 'linux-firefox-122',
    name: 'Firefox 122 (Linux)',
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
    platform: 'Linux x86_64',
    vendor: '',
    vendorSub: '',
    appVersion: '5.0 (X11)',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20100101',
    oscpu: 'Linux x86_64',
    buildID: '20240116161852',
    mobile: false,
    platformName: 'Linux',
    platformVersion: '',
    architecture: 'x86_64',
    bitness: '64',
    model: '',
  },
];

// Android Chrome profiles
const ANDROID_CHROME_PROFILES: UserAgentProfile[] = [
  {
    id: 'android-chrome-120',
    name: 'Chrome 120 (Android 14)',
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
    platform: 'Linux armv81',
    vendor: 'Google Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: true,
    platformName: 'Android',
    platformVersion: '14.0.0',
    architecture: '',
    bitness: '',
    model: 'Pixel 8',
    brands: [
      { brand: 'Not_A Brand', version: '8' },
      { brand: 'Chromium', version: '120' },
      { brand: 'Google Chrome', version: '120' },
    ],
    fullVersionList: [
      { brand: 'Not_A Brand', version: '8.0.0.0' },
      { brand: 'Chromium', version: '120.0.6099.144' },
      { brand: 'Google Chrome', version: '120.0.6099.144' },
    ],
  },
  {
    id: 'android-chrome-121',
    name: 'Chrome 121 (Android 14)',
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36',
    platform: 'Linux armv81',
    vendor: 'Google Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: true,
    platformName: 'Android',
    platformVersion: '14.0.0',
    architecture: '',
    bitness: '',
    model: 'SM-S918B',
    brands: [
      { brand: 'Not A(Brand', version: '99' },
      { brand: 'Google Chrome', version: '121' },
      { brand: 'Chromium', version: '121' },
    ],
    fullVersionList: [
      { brand: 'Not A(Brand', version: '99.0.0.0' },
      { brand: 'Google Chrome', version: '121.0.6167.101' },
      { brand: 'Chromium', version: '121.0.6167.101' },
    ],
  },
];

// iOS Safari profiles
const IOS_SAFARI_PROFILES: UserAgentProfile[] = [
  {
    id: 'ios-safari-17',
    name: 'Safari 17 (iOS 17)',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
    vendor: 'Apple Computer, Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: true,
    platformName: 'iOS',
    platformVersion: '17.2.1',
    architecture: '',
    bitness: '',
    model: 'iPhone',
  },
  {
    id: 'ios-safari-17.3',
    name: 'Safari 17.3 (iOS 17)',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
    vendor: 'Apple Computer, Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: true,
    platformName: 'iOS',
    platformVersion: '17.3',
    architecture: '',
    bitness: '',
    model: 'iPhone',
  },
  {
    id: 'ipad-safari-17',
    name: 'Safari 17 (iPadOS 17)',
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    platform: 'iPad',
    vendor: 'Apple Computer, Inc.',
    vendorSub: '',
    appVersion:
      '5.0 (iPad; CPU OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    mobile: true,
    platformName: 'iOS',
    platformVersion: '17.2.1',
    architecture: '',
    bitness: '',
    model: 'iPad',
  },
];

// All profiles combined
export const ALL_PROFILES: UserAgentProfile[] = [
  ...WINDOWS_CHROME_PROFILES,
  ...WINDOWS_FIREFOX_PROFILES,
  ...WINDOWS_EDGE_PROFILES,
  ...MACOS_CHROME_PROFILES,
  ...MACOS_SAFARI_PROFILES,
  ...MACOS_FIREFOX_PROFILES,
  ...LINUX_CHROME_PROFILES,
  ...LINUX_FIREFOX_PROFILES,
  ...ANDROID_CHROME_PROFILES,
  ...IOS_SAFARI_PROFILES,
];

// Profiles by category for UI selection
export const PROFILES_BY_OS = {
  windows: [...WINDOWS_CHROME_PROFILES, ...WINDOWS_FIREFOX_PROFILES, ...WINDOWS_EDGE_PROFILES],
  macos: [...MACOS_CHROME_PROFILES, ...MACOS_SAFARI_PROFILES, ...MACOS_FIREFOX_PROFILES],
  linux: [...LINUX_CHROME_PROFILES, ...LINUX_FIREFOX_PROFILES],
  android: [...ANDROID_CHROME_PROFILES],
  ios: [...IOS_SAFARI_PROFILES],
};

export const PROFILES_BY_BROWSER = {
  chrome: [
    ...WINDOWS_CHROME_PROFILES,
    ...MACOS_CHROME_PROFILES,
    ...LINUX_CHROME_PROFILES,
    ...ANDROID_CHROME_PROFILES,
  ],
  firefox: [
    ...WINDOWS_FIREFOX_PROFILES,
    ...MACOS_FIREFOX_PROFILES,
    ...LINUX_FIREFOX_PROFILES,
  ],
  safari: [...MACOS_SAFARI_PROFILES, ...IOS_SAFARI_PROFILES],
  edge: [...WINDOWS_EDGE_PROFILES],
};

// Desktop-only profiles (for when mobile doesn't make sense)
export const DESKTOP_PROFILES: UserAgentProfile[] = ALL_PROFILES.filter((p) => !p.mobile);

// Mobile-only profiles
export const MOBILE_PROFILES: UserAgentProfile[] = ALL_PROFILES.filter((p) => p.mobile);

/**
 * Get a profile by ID
 */
export function getProfileById(id: string): UserAgentProfile | undefined {
  return ALL_PROFILES.find((p) => p.id === id);
}

/**
 * Get a random profile using PRNG
 */
export function getRandomProfile(
  prng: { nextInt: (min: number, max: number) => number },
  filter?: { mobileOnly?: boolean; desktopOnly?: boolean; os?: string; browser?: string }
): UserAgentProfile {
  let profiles = ALL_PROFILES;

  if (filter?.mobileOnly) {
    profiles = MOBILE_PROFILES;
  } else if (filter?.desktopOnly) {
    profiles = DESKTOP_PROFILES;
  }

  if (filter?.os && filter.os in PROFILES_BY_OS) {
    profiles = profiles.filter((p) =>
      PROFILES_BY_OS[filter.os as keyof typeof PROFILES_BY_OS].includes(p)
    );
  }

  if (filter?.browser && filter.browser in PROFILES_BY_BROWSER) {
    profiles = profiles.filter((p) =>
      PROFILES_BY_BROWSER[filter.browser as keyof typeof PROFILES_BY_BROWSER].includes(p)
    );
  }

  // Fallback to all profiles if filter results in empty
  if (profiles.length === 0) {
    profiles = ALL_PROFILES;
  }

  const index = prng.nextInt(0, profiles.length - 1);
  return profiles[index];
}
