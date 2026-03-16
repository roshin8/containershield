# Container Shield

A Firefox extension that provides per-container fingerprint protection by combining features from [Chameleon](https://github.com/nickersoft/chameleon-ext) and [JShelter](https://jshelter.org/) with Firefox's Multi-Account Containers.

Each Firefox container gets a unique, cryptographically-isolated fingerprint that cannot be linked across containers.

## Features

### Per-Container Isolation
- **Unique fingerprints**: Each container has its own cryptographic seed
- **Profile uniqueness**: No two containers share the same fingerprint signature
- **IP isolation**: Warns when accessing the same IP from different containers

### Fingerprint Spoofing (50+ APIs)

| Category | Spoofed APIs |
|----------|-------------|
| **Graphics** | Canvas 2D, WebGL, WebGL2, WebGPU, SVG, DOMRect, TextMetrics, OffscreenCanvas |
| **Audio** | AudioContext, OfflineAudioContext, AnalyserNode, Audio Latency, Codec detection |
| **Hardware** | Screen dimensions, Screen Frame, Orientation, deviceMemory, hardwareConcurrency, Battery, MediaDevices, Sensors |
| **Navigator** | User-Agent, Platform, Languages, Plugins, Client Hints, Clipboard, Vibration |
| **Timezone** | Date.getTimezoneOffset, Intl.DateTimeFormat |
| **Fonts** | Font enumeration, CSS font detection |
| **Network** | WebRTC IP leak, NetworkInformation API |
| **Timing** | performance.now() precision reduction |
| **CSS** | Media queries (prefers-color-scheme, etc.) |
| **Speech** | SpeechSynthesis voices |
| **Permissions** | Permissions API, Notification.permission |
| **Storage** | StorageManager.estimate(), IndexedDB, WebSQL |
| **Math** | Math function precision |
| **Keyboard** | Keyboard layout detection |
| **Devices** | Gamepad, MIDI, Bluetooth, USB, Serial, HID |
| **Rendering** | Emoji, MathML |
| **Payment** | Apple Pay detection |

### Fingerprint Access Monitor
Container Shield tracks which fingerprinting APIs websites try to access:
- Real-time logging of API access attempts
- Categorized by fingerprinting technique
- Shows whether each access was blocked or spoofed
- Helps identify tracking scripts

### Protection Modes
- **Off**: No protection
- **Noise**: Adds deterministic noise (recommended)
- **Block**: Returns fake/empty values

### Profile Rotation
- **Auto-rotate**: Automatically regenerate fingerprint seeds on schedule
- **Schedules**: Hourly, Daily, Weekly, or on browser restart
- **Manual rotation**: Rotate any container's fingerprint instantly

### Statistics Dashboard
- **Real-time tracking**: Monitor blocked and spoofed API accesses
- **Category breakdown**: See which fingerprinting techniques are used most
- **Domain tracking**: Identify which sites fingerprint most aggressively
- **Protection rate**: View your overall protection percentage

### Settings Management
- **Export/Import**: Backup and restore all settings
- **Domain exceptions**: Preset categories for banking, streaming, gaming, etc.
- **Per-signal control**: Fine-tune each individual API's protection

### Browser Profiles
- 25+ realistic browser profiles (Chrome, Firefox, Safari, Edge)
- Windows, macOS, Linux, Android, iOS
- Full Client Hints (User-Agent Client Hints API) support

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/roshin8/containershield.git
cd containershield

# Install dependencies
npm install

# Build
npm run build
```

### Load in Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Navigate to the `dist/` folder
4. Select `manifest.json`

## Usage

1. Click the extension icon in the toolbar
2. Select a container from the dropdown
3. Adjust protection level:
   - **Off**: No protection
   - **Minimal**: Headers only
   - **Balanced**: Noise injection (recommended)
   - **Strict**: Block all fingerprinting APIs
4. Fine-tune individual categories as needed

## How It Works

### Fingerprint Uniqueness

```
Container A (Personal)          Container B (Work)
       │                              │
       ▼                              ▼
┌─────────────────┐          ┌─────────────────┐
│ Seed: 0x8f3a... │          │ Seed: 0x2c7b... │
└────────┬────────┘          └────────┬────────┘
         │                            │
         ▼                            ▼
┌─────────────────┐          ┌─────────────────┐
│ Chrome 121      │          │ Firefox 122     │
│ 1920x1080       │          │ 2560x1440       │
│ 8 cores, 16GB   │          │ 4 cores, 8GB    │
│ UTC-5 (Eastern) │          │ UTC+1 (Paris)   │
└─────────────────┘          └─────────────────┘
         │                            │
         ▼                            ▼
   Unique fingerprint A        Unique fingerprint B
   (unlinkable to B)           (unlinkable to A)
```

### Collision Prevention

The Profile Manager ensures no two containers share the same combination of:
- User Agent
- Screen resolution
- Device pixel ratio
- Hardware concurrency
- Device memory
- Timezone offset
- Languages

With 25 UAs × 30 screens × 6 cores × 5 RAM × 13 timezones × 14 languages = **~8 million unique combinations**.

## Project Structure

```
containershield/
├── src/
│   ├── background/              # Background service worker
│   │   ├── index.ts             # Entry point
│   │   ├── container-manager.ts # Container detection & lifecycle
│   │   ├── profile-manager.ts   # Ensures unique profiles per container
│   │   ├── profile-rotation.ts  # Automatic fingerprint rotation
│   │   ├── settings-store.ts    # Per-container settings storage
│   │   ├── message-handler.ts   # Extension message routing
│   │   ├── header-spoofer.ts    # HTTP header modification
│   │   └── ip-isolation.ts      # Cross-container IP warnings
│   │
│   ├── content/                 # Content script
│   │   └── index.ts             # Injects spoofers into pages
│   │
│   ├── inject/                  # Page context (MAIN world)
│   │   ├── index.ts             # Spoofer initialization
│   │   ├── monitor/             # Fingerprint access monitoring
│   │   └── spoofers/            # 50+ fingerprint spoofers
│   │       ├── graphics/        # Canvas, WebGL, WebGPU, SVG, etc.
│   │       ├── audio/           # AudioContext, codecs
│   │       ├── hardware/        # Screen, sensors, battery
│   │       ├── navigator/       # User-Agent, plugins, clipboard
│   │       ├── timezone/        # Intl, Date
│   │       ├── fonts/           # Font enumeration
│   │       ├── network/         # WebRTC, connection
│   │       ├── timing/          # performance.now()
│   │       ├── storage/         # IndexedDB, WebSQL
│   │       ├── devices/         # Gamepad, MIDI, Bluetooth, USB
│   │       └── ...              # And more
│   │
│   ├── popup/                   # React UI
│   │   ├── App.tsx              # Main popup component
│   │   ├── components/
│   │   │   ├── ContainerSelector.tsx
│   │   │   ├── ProtectionLevel.tsx
│   │   │   ├── CategoryToggle.tsx
│   │   │   ├── SignalList.tsx        # Individual signal controls
│   │   │   ├── ProfilePresets.tsx    # Browser profile selection
│   │   │   ├── ProfileRotation.tsx   # Rotation settings
│   │   │   ├── DomainExceptions.tsx  # Site whitelisting
│   │   │   ├── StatisticsDashboard.tsx
│   │   │   ├── SettingsManager.tsx   # Export/import
│   │   │   ├── FingerprintMonitor.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   └── hooks/
│   │       ├── useContainers.ts
│   │       └── useSettings.ts
│   │
│   ├── lib/
│   │   ├── crypto.ts            # PRNG (xorshift128+), SHA-256
│   │   ├── farbling.ts          # Brave-style noise injection
│   │   ├── logger.ts            # Configurable logging
│   │   ├── validation.ts        # Input validation utilities
│   │   ├── constants.ts         # Shared constants
│   │   └── profiles/            # Browser profile databases
│   │
│   ├── constants/               # Message types, config values
│   └── types/                   # TypeScript type definitions
│
├── tests/
│   ├── unit/                    # Vitest unit tests
│   └── e2e/                     # Playwright E2E tests
│
├── public/icons/                # Extension icons (SVG)
├── manifest.json                # Firefox extension manifest v2
└── dist/                        # Built extension
```

## Development

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build

# Type checking
npm run typecheck
```

## Testing

Test your fingerprint protection at:
- [CreepJS](https://abrahamjuliot.github.io/creepjs/)
- [BrowserLeaks](https://browserleaks.com/)
- [AmIUnique](https://amiunique.org/)
- [FingerprintJS](https://fingerprintjs.github.io/fingerprintjs/)

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **React 18** - Popup UI
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **webextension-polyfill** - Cross-browser compatibility

## Requirements

- Firefox 91+ (for Multi-Account Containers support)
- Multi-Account Containers extension (optional, for container management)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Chameleon](https://github.com/nickersoft/chameleon-ext) - Header spoofing inspiration
- [JShelter](https://jshelter.org/) - JavaScript API wrapping techniques
- [Brave Browser](https://brave.com/) - Farbling algorithms
- [FingerprintJS](https://fingerprint.com/) - Fingerprinting signal research

## Disclaimer

This extension is intended for privacy protection and authorized security testing. Use responsibly and in accordance with applicable laws.
