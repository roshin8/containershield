# Container Shield

A Firefox extension that provides per-container fingerprint protection by combining features from [Chameleon](https://github.com/nickersoft/chameleon-ext) and [JShelter](https://jshelter.org/) with Firefox's Multi-Account Containers.

Each Firefox container gets a unique, cryptographically-isolated fingerprint that cannot be linked across containers.

## Features

### Per-Container Isolation
- **Unique fingerprints**: Each container has its own cryptographic seed
- **Profile uniqueness**: No two containers share the same fingerprint signature
- **IP isolation**: Warns when accessing the same IP from different containers

### Fingerprint Spoofing (25+ APIs)

| Category | Spoofed APIs |
|----------|-------------|
| **Graphics** | Canvas 2D, WebGL, WebGL2, SVG, DOMRect, TextMetrics |
| **Audio** | AudioContext, AnalyserNode, Codec detection |
| **Hardware** | Screen dimensions, deviceMemory, hardwareConcurrency, Battery, MediaDevices |
| **Navigator** | User-Agent, Platform, Languages, Plugins, Client Hints |
| **Timezone** | Date.getTimezoneOffset, Intl.DateTimeFormat |
| **Fonts** | Font enumeration detection |
| **Network** | WebRTC IP leak, NetworkInformation API |
| **Timing** | performance.now() precision reduction |
| **CSS** | Media queries (prefers-color-scheme, etc.) |
| **Speech** | SpeechSynthesis voices |
| **Permissions** | Permissions API queries |
| **Storage** | StorageManager.estimate() |
| **Math** | Math function precision |
| **Keyboard** | Keyboard layout detection |

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
│   ├── background/          # Background service worker
│   │   ├── container-manager.ts
│   │   ├── profile-manager.ts   # Ensures unique profiles
│   │   ├── settings-store.ts
│   │   ├── header-spoofer.ts
│   │   └── ip-isolation.ts
│   │
│   ├── inject/              # Page context injection
│   │   └── spoofers/        # Fingerprint spoofers
│   │       ├── graphics/    # Canvas, WebGL, SVG, etc.
│   │       ├── audio/       # AudioContext
│   │       ├── hardware/    # Screen, device, battery
│   │       ├── navigator/   # User-Agent, plugins
│   │       ├── timezone/    # Intl, Date
│   │       ├── fonts/       # Font enumeration
│   │       ├── network/     # WebRTC
│   │       └── timing/      # performance.now()
│   │
│   ├── popup/               # React UI
│   │
│   └── lib/
│       ├── crypto.ts        # PRNG, hashing
│       ├── farbling.ts      # Noise injection
│       └── profiles/        # UA & screen databases
│
├── manifest.json            # Firefox extension manifest
└── dist/                    # Built extension
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
