<p align="center">
  <img src="public/icons/icon-128.svg" alt="Container Shield Logo" width="128" height="128">
</p>

<h1 align="center">Container Shield</h1>

<p align="center">
  <strong>Per-container fingerprint protection for Firefox</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#spoofed-apis">Spoofed APIs</a> •
  <a href="#development">Development</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/APIs%20Protected-50+-blue" alt="APIs Protected">
  <img src="https://img.shields.io/badge/Firefox-91+-orange" alt="Firefox 91+">
  <img src="https://img.shields.io/badge/License-GPL--3.0-green" alt="License">
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue" alt="TypeScript">
</p>

---

## What is Container Shield?

Container Shield is a Firefox extension that provides **per-container fingerprint protection** by combining features from [Chameleon](https://github.com/nickersoft/chameleon-ext) and [JShelter](https://jshelter.org/) with Firefox's Multi-Account Containers.

**The Problem:** Websites use browser fingerprinting to track you across the web, even without cookies. Your canvas rendering, WebGL parameters, audio processing, screen size, and 50+ other signals create a unique identifier.

**The Solution:** Container Shield gives each Firefox container a unique, cryptographically-isolated fingerprint. Your "Personal" container has one fingerprint, your "Work" container has another—and they cannot be linked together.

---

## Features

<details>
<summary><h3>🔐 Per-Container Isolation</h3></summary>

Each Firefox container gets its own cryptographic identity:

| Feature | Description |
|---------|-------------|
| **Unique Seeds** | Each container has a 256-bit cryptographic seed used to derive all spoofed values |
| **Deterministic Spoofing** | Same container + same domain = same fingerprint (no random flickering) |
| **Profile Uniqueness** | No two containers share the same fingerprint signature |
| **Cross-Container Unlinkability** | Fingerprints from different containers cannot be correlated |

**How seeds work:**
```
Container "Personal" → Seed: 0x8f3a2b... → Fingerprint A
Container "Work"     → Seed: 0x2c7b9e... → Fingerprint B
Container "Shopping" → Seed: 0x5d1f8c... → Fingerprint C
```

Each seed generates consistent but unique values for all 50+ spoofed APIs.

</details>

<details>
<summary><h3>🛡️ 50+ Fingerprinting APIs Protected</h3></summary>

Container Shield intercepts and spoofs over 50 browser APIs used for fingerprinting:

| Category | APIs | Entropy Level |
|----------|------|---------------|
| **Graphics** | Canvas, WebGL, WebGL2, WebGPU, SVG, DOMRect, TextMetrics, OffscreenCanvas | High |
| **Audio** | AudioContext, OfflineAudioContext, Audio Latency, Codec Detection | High |
| **Hardware** | Screen, Device Memory, CPU Cores, Battery, Sensors, Touch, Media Devices | High |
| **Navigator** | User-Agent, Platform, Languages, Plugins, Client Hints, Clipboard | High |
| **Timezone** | Intl.DateTimeFormat, Date.getTimezoneOffset | High |
| **Fonts** | Font Enumeration, CSS Font Detection | High |
| **Network** | WebRTC (IP Leak), NetworkInformation | Critical |
| **Timing** | performance.now() precision | Medium |
| **Storage** | StorageManager, IndexedDB, WebSQL | Medium |
| **Devices** | Gamepad, MIDI, Bluetooth, USB, Serial, HID | Medium |

[See full API list →](#spoofed-apis)

</details>

<details>
<summary><h3>📊 Real-Time Fingerprint Monitor</h3></summary>

Track exactly which fingerprinting techniques websites are using:

- **Live API Access Log** - See every fingerprinting attempt in real-time
- **Category Breakdown** - Understand which techniques are used most
- **Protection Status** - See if each access was blocked, spoofed, or allowed
- **Script Identification** - Identify which scripts are fingerprinting you
- **Recommendations** - Get suggestions for APIs you should protect

The monitor helps you:
1. Identify aggressive tracking sites
2. Fine-tune your protection settings
3. Understand modern fingerprinting techniques
4. Verify that protection is working

</details>

<details>
<summary><h3>⚙️ Protection Modes</h3></summary>

Three protection modes for each API:

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Off** | No protection, real values returned | Trusted sites, debugging |
| **Noise** | Adds deterministic noise to real values | Recommended for most sites |
| **Block** | Returns fake/empty values | Maximum privacy, may break sites |

**Noise mode** uses Brave-style "farbling":
- Canvas pixels get subtle color variations (±1-2 RGB values)
- WebGL parameters return plausible but different values
- Audio processing adds imperceptible noise
- All noise is deterministic—same seed = same noise

</details>

<details>
<summary><h3>🔄 Automatic Profile Rotation</h3></summary>

Automatically regenerate fingerprints on a schedule:

| Schedule | Description |
|----------|-------------|
| **Off** | Fingerprint never changes (maximum consistency) |
| **Session** | New fingerprint when browser restarts |
| **Hourly** | Rotate every hour |
| **Daily** | Rotate every 24 hours |
| **Weekly** | Rotate every 7 days |

You can also **manually rotate** any container's fingerprint instantly from the popup.

**Why rotate?**
- Prevents long-term tracking even if fingerprint is captured
- Fresh identity for new browsing sessions
- Useful for research or testing

</details>

<details>
<summary><h3>👤 Browser Profile Presets</h3></summary>

25+ realistic browser profiles to choose from:

**Desktop:**
- Chrome 121 on Windows 11
- Chrome 121 on macOS Sonoma
- Firefox 122 on Windows 11
- Firefox 122 on Ubuntu Linux
- Safari 17 on macOS Sonoma
- Edge 121 on Windows 11

**Mobile:**
- Chrome on Android 14 (Pixel 8)
- Safari on iOS 17 (iPhone 15)
- Samsung Internet on Galaxy S24

Each profile includes:
- Accurate User-Agent string
- Matching platform and vendor
- Realistic screen resolution
- Appropriate hardware specs (cores, RAM)
- Full Client Hints support

</details>

<details>
<summary><h3>🌐 Domain Exceptions</h3></summary>

Whitelist sites that break with fingerprint protection:

**Preset Categories:**
| Category | Examples | Why Whitelist |
|----------|----------|---------------|
| **Banking** | chase.com, bankofamerica.com | Fraud detection requires real fingerprint |
| **Streaming** | netflix.com, hulu.com | DRM may check hardware |
| **Gaming** | steampowered.com, epicgames.com | Anti-cheat systems |
| **Video Calls** | zoom.us, meet.google.com | WebRTC needed for calls |
| **Shopping** | amazon.com, ebay.com | Cart/checkout issues |

**Custom Rules:**
- Add any domain manually
- Wildcards supported (`*.example.com`)
- Per-container exceptions possible

</details>

<details>
<summary><h3>📈 Statistics Dashboard</h3></summary>

Monitor your protection effectiveness:

- **Total Accesses** - How many fingerprinting attempts detected
- **Blocked** - APIs that returned fake/empty values
- **Spoofed** - APIs that returned noised values
- **Protection Rate** - Percentage of attempts protected

**Views:**
1. **Overview** - Summary statistics and charts
2. **By Category** - Breakdown by fingerprinting technique
3. **By Domain** - Which sites fingerprint most aggressively

</details>

<details>
<summary><h3>🚨 IP Isolation Warnings</h3></summary>

Protects against IP-based cross-container correlation:

**The Problem:** If you access `192.168.1.100` from your "Personal" container, then access the same IP from your "Work" container, the server could correlate these visits.

**The Solution:** Container Shield tracks IP-to-container mappings and warns you:

```
⚠️ IP Address Conflict Detected

You're accessing 192.168.1.100 from Container: Work

This IP was previously accessed from:
Container: Personal (2 hours ago)

[Block] [Allow Once] [Open in Original Container]
```

Options:
- **Block** - Cancel navigation
- **Allow Once** - Proceed with warning logged
- **Open in Original** - Switch to the container that "owns" this IP

</details>

<details>
<summary><h3>💾 Settings Management</h3></summary>

Full control over your configuration:

| Feature | Description |
|---------|-------------|
| **Export** | Backup all settings to JSON file |
| **Import** | Restore settings from backup |
| **Reset** | Restore default settings |
| **Per-Container** | Different settings for each container |
| **Per-Signal** | Fine-tune individual APIs |

Settings are stored locally using `browser.storage.local`.

</details>

---

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/roshin8/containershield.git
cd containershield

# Install dependencies
npm install

# Build for production
npm run build
```

### Load in Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Navigate to the `dist/` folder
4. Select `manifest.json`

### Permanent Installation

For permanent installation, the extension needs to be signed by Mozilla or installed in Firefox Developer/Nightly with `xpinstall.signatures.required` set to `false`.

---

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER LEVEL                            │
├─────────────────────────────────────────────────────────────────┤
│  Background Script (Service Worker)                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ Container   │ │ Profile     │ │ Settings    │               │
│  │ Manager     │ │ Manager     │ │ Store       │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ Header      │ │ IP          │ │ Profile     │               │
│  │ Spoofer     │ │ Isolation   │ │ Rotation    │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│                         TAB LEVEL                               │
├─────────────────────────────────────────────────────────────────┤
│  Content Script ──inject──► Page Context (MAIN World)          │
│                              ┌─────────────────────────┐        │
│                              │ 50+ API Spoofers        │        │
│                              │ • Graphics (Canvas,WebGL)│        │
│                              │ • Audio (AudioContext)  │        │
│                              │ • Hardware (Screen,CPU) │        │
│                              │ • Navigator (UA,Langs)  │        │
│                              │ • Timezone (Intl,Date)  │        │
│                              │ • Network (WebRTC)      │        │
│                              │ • ... and more          │        │
│                              └─────────────────────────┘        │
├─────────────────────────────────────────────────────────────────┤
│                        POPUP UI (React)                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ Container   │ │ Protection  │ │ Statistics  │               │
│  │ Selector    │ │ Settings    │ │ Dashboard   │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### Fingerprint Generation Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Container Seed  │────►│  Domain + API    │────►│  Spoofed Value   │
│  (256-bit)       │     │  (deterministic) │     │  (consistent)    │
└──────────────────┘     └──────────────────┘     └──────────────────┘

Example:
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Seed: 0x8f3a...  │────►│ example.com +    │────►│ Canvas hash:     │
│ (Personal)       │     │ canvas.toDataURL │     │ 0x7d2f...        │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Collision Prevention

The Profile Manager ensures no two containers share the same fingerprint signature:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROFILE UNIQUENESS MATRIX                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Agents (25) × Screen Sizes (30) × CPU Cores (6)          │
│  × RAM Options (5) × Timezones (13) × Languages (14)           │
│                                                                 │
│  = ~8,190,000 unique combinations                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Container A: Chrome/Win/1920x1080/8cores/16GB/UTC-5/en-US     │
│  Container B: Firefox/Mac/2560x1440/4cores/8GB/UTC+1/de-DE     │
│  Container C: Safari/Mac/1440x900/8cores/8GB/UTC+0/en-GB       │
│                                                                 │
│  ✓ All combinations guaranteed unique                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### API Interception Method

Container Shield uses `world: "MAIN"` content script injection to wrap JavaScript APIs **before** page scripts run:

```javascript
// Original API
HTMLCanvasElement.prototype.toDataURL = function() { ... }

// Wrapped API (injected at document_start)
HTMLCanvasElement.prototype.toDataURL = function() {
  const original = originalToDataURL.call(this);
  return addNoise(original, containerSeed);
}
```

This approach:
- ✅ Runs before any page script
- ✅ Cannot be detected by page scripts
- ✅ Wraps native prototypes
- ✅ Maintains API compatibility

---

## Spoofed APIs

<details>
<summary><h3>🎨 Graphics (9 APIs)</h3></summary>

| API | Methods Spoofed | How It Works |
|-----|-----------------|--------------|
| **Canvas 2D** | `toDataURL()`, `toBlob()`, `getImageData()` | Adds ±1-2 noise to RGB pixel values using Brave-style farbling |
| **WebGL** | `getParameter()`, `getExtension()` | Spoofs `UNMASKED_VENDOR_WEBGL` and `UNMASKED_RENDERER_WEBGL` |
| **WebGL2** | Same as WebGL | Handles WebGL2-specific extensions |
| **WebGPU** | `requestAdapter()` | Spoofs adapter info and capabilities |
| **SVG** | SVG filter rendering | Modifies SVG filter output |
| **DOMRect** | `getBoundingClientRect()`, `getClientRects()` | Adds sub-pixel noise to dimensions |
| **TextMetrics** | `measureText()` | Varies width measurements slightly |
| **OffscreenCanvas** | `convertToBlob()` | Applies same noise as Canvas 2D |
| **WebGL Shaders** | Shader compilation | Normalizes shader precision |

**Canvas Noise Example:**
```
Original pixel:  RGB(128, 128, 128)
Spoofed pixel:   RGB(127, 129, 128)  ← Imperceptible but unique
```

</details>

<details>
<summary><h3>🔊 Audio (4 APIs)</h3></summary>

| API | Methods Spoofed | How It Works |
|-----|-----------------|--------------|
| **AudioContext** | `createOscillator()`, `createDynamicsCompressor()`, `createAnalyser()` | Adds noise to `getFloatFrequencyData()` output |
| **OfflineAudioContext** | `startRendering()`, `getChannelData()` | Modifies rendered audio buffer |
| **Audio Latency** | `baseLatency`, `outputLatency` | Returns consistent spoofed values |
| **Codec Detection** | `canPlayType()` | Varies codec support slightly |

**Audio Fingerprint:**
```
Original:  [-0.0234, 0.0456, -0.0123, ...]
Spoofed:   [-0.0235, 0.0455, -0.0124, ...]  ← Different but valid
```

</details>

<details>
<summary><h3>💻 Hardware (9 APIs)</h3></summary>

| API | Methods Spoofed | How It Works |
|-----|-----------------|--------------|
| **Screen** | `width`, `height`, `availWidth`, `availHeight`, `colorDepth`, `pixelDepth` | Returns profile-assigned values |
| **Screen Frame** | `screenX`, `screenY`, `outerWidth`, `outerHeight` | Consistent with screen dimensions |
| **Orientation** | `screen.orientation.type`, `angle` | Matches device profile |
| **Device Memory** | `navigator.deviceMemory` | 2, 4, 8, or 16 GB |
| **Hardware Concurrency** | `navigator.hardwareConcurrency` | 2, 4, 6, 8, 12, or 16 cores |
| **Battery** | `navigator.getBattery()` | Returns consistent level/charging state |
| **Media Devices** | `enumerateDevices()` | Limits and renames devices |
| **Touch** | `navigator.maxTouchPoints` | 0 for desktop, 5 for mobile |
| **Sensors** | Accelerometer, Gyroscope, etc. | Blocks or returns consistent values |

</details>

<details>
<summary><h3>🧭 Navigator (6 APIs)</h3></summary>

| API | Methods Spoofed | How It Works |
|-----|-----------------|--------------|
| **User-Agent** | `navigator.userAgent`, `appVersion`, `platform`, `vendor` | Full browser profile |
| **Languages** | `navigator.language`, `languages` | Array like `['en-US', 'en']` |
| **Plugins** | `navigator.plugins`, `mimeTypes` | Empty or minimal plugin list |
| **Client Hints** | `navigator.userAgentData.getHighEntropyValues()` | Full UA-CH support |
| **Clipboard** | `clipboard.read()`, `readText()` | Permission check spoofing |
| **Vibration** | `navigator.vibrate()` | Returns true without vibrating |

**Client Hints Example:**
```javascript
await navigator.userAgentData.getHighEntropyValues([
  'platform', 'platformVersion', 'architecture', 'model', 'uaFullVersion'
]);
// Returns consistent, profile-matched values
```

</details>

<details>
<summary><h3>🕐 Timezone (2 APIs)</h3></summary>

| API | Methods Spoofed | How It Works |
|-----|-----------------|--------------|
| **Intl** | `Intl.DateTimeFormat().resolvedOptions().timeZone` | Returns profile timezone |
| **Date** | `getTimezoneOffset()`, `toLocaleString()` | Offset matches Intl timezone |

**Supported Timezones:**
- America/New_York (UTC-5)
- America/Chicago (UTC-6)
- America/Denver (UTC-7)
- America/Los_Angeles (UTC-8)
- Europe/London (UTC+0)
- Europe/Paris (UTC+1)
- Europe/Berlin (UTC+1)
- Asia/Tokyo (UTC+9)
- And more...

</details>

<details>
<summary><h3>🔤 Fonts (2 APIs)</h3></summary>

| API | Methods Spoofed | How It Works |
|-----|-----------------|--------------|
| **Font Enumeration** | Canvas text measurement, `document.fonts` | Limits detected fonts |
| **CSS Font Detection** | Font-family availability | Blocks or limits probing |

**Common fingerprinting fonts:**
- Arial, Helvetica, Times New Roman (always available)
- Calibri, Cambria (Windows-specific)
- Helvetica Neue, San Francisco (macOS-specific)
- Ubuntu, DejaVu Sans (Linux-specific)

Container Shield ensures consistent font availability per profile.

</details>

<details>
<summary><h3>🌐 Network (2 APIs)</h3></summary>

| API | Methods Spoofed | How It Works |
|-----|-----------------|--------------|
| **WebRTC** | `RTCPeerConnection` ICE candidates | Blocks local IP leak or returns spoofed IPs |
| **Connection** | `navigator.connection` | Spoofs `effectiveType`, `downlink`, `rtt` |

**WebRTC Modes:**
- **Off** - Real IPs exposed (dangerous!)
- **Public Only** - Blocks local/private IPs, allows public
- **Block** - Disables WebRTC entirely

</details>

<details>
<summary><h3>⏱️ Timing & Other (10+ APIs)</h3></summary>

| Category | API | How It Works |
|----------|-----|--------------|
| **Timing** | `performance.now()` | Reduces precision to 100μs |
| **CSS** | `matchMedia()` | Spoofs prefers-color-scheme, reduced-motion |
| **Speech** | `speechSynthesis.getVoices()` | Returns consistent voice list |
| **Permissions** | `navigator.permissions.query()` | Consistent permission states |
| **Storage** | `navigator.storage.estimate()` | Spoofed quota/usage |
| **Math** | `Math.tan()`, `Math.sin()` | Handles edge case precision |
| **Keyboard** | `navigator.keyboard.getLayoutMap()` | Blocks or returns consistent layout |
| **Devices** | Gamepad, MIDI, Bluetooth, USB, Serial, HID | Returns empty device lists |
| **Rendering** | Emoji, MathML | Normalizes rendering differences |
| **Payment** | `ApplePaySession.canMakePayments()` | Consistent availability |

</details>

---

## Website Compatibility

<details>
<summary><h3>⚠️ What Can Break Websites</h3></summary>

Some spoofing techniques can cause websites to malfunction:

#### High Risk of Breaking

| Spoofed API | What Breaks | Examples |
|-------------|-------------|----------|
| **WebRTC (Block)** | Video/audio calls, P2P connections | Zoom, Google Meet, Discord, Teams |
| **Canvas (Block)** | CAPTCHAs, image editors, games | reCAPTCHA, hCaptcha, Photopea |
| **WebGL (Block)** | 3D graphics, maps, games | Google Maps 3D, Three.js sites |
| **MediaDevices (Block)** | Camera/microphone access | Video calls, QR scanners |
| **Clipboard (Block)** | Copy/paste functionality | "Copy to clipboard" buttons |

#### Medium Risk

| Spoofed API | What Breaks | Why |
|-------------|-------------|-----|
| **Screen dimensions** | Responsive layouts | Site may serve wrong layout for spoofed resolution |
| **User-Agent** | Feature detection | Site serves mobile version to desktop UA |
| **Timezone** | Scheduling, calendars | Appointments display wrong times |
| **Client Hints** | Modern sites | UA-CH dependent features fail |
| **Gamepad/MIDI** | Browser games, music apps | Controllers won't be detected |

#### Low Risk (Usually Safe)

| Spoofed API | Why It's Safe |
|-------------|---------------|
| **Canvas (Noise)** | Imperceptible ±1-2 RGB pixel changes |
| **Audio (Noise)** | Inaudible frequency variations |
| **Fonts** | Slightly different text measurements |
| **performance.now()** | Timing slightly less precise |
| **Math functions** | Only affects edge cases |

#### Common Breakage Scenarios

**Banking Sites:**
```
Symptom:  Account locked, extra verification, transactions blocked
Cause:    Fraud detection flags spoofed fingerprint as suspicious
Solution: Add bank domains to exceptions
```

**Streaming (Netflix, Hulu, Disney+):**
```
Symptom:  "Can't play this title", lower quality, errors
Cause:    DRM (Widevine) checks hardware consistency
Solution: Whitelist streaming domains
```

**E-commerce Checkout:**
```
Symptom:  Payment fails, infinite loading, "try again"
Cause:    Bot detection (Stripe, PayPal) flags inconsistencies
Solution: Add checkout domains to exceptions
```

**Video Conferencing:**
```
Symptom:  "Can't access camera", "Connection failed"
Cause:    WebRTC blocked = no audio/video possible
Solution: Set WebRTC to "Public Only" or whitelist
```

**Google Services:**
```
Symptom:  Endless CAPTCHA loops, "verify you're human"
Cause:    reCAPTCHA scores spoofed browsers as bot-like
Solution: Whitelist google.com, gstatic.com
```

</details>

<details>
<summary><h3>🔍 How Websites Detect Spoofing</h3></summary>

Sophisticated fingerprinting scripts don't just collect data—they also detect if values are being spoofed. Here's how they do it and how Container Shield defends against it:

#### 1. Consistency Checks

Websites cross-reference multiple APIs to find contradictions:

```javascript
// Detection: User-Agent says iPhone but screen is 1920x1080?
if (navigator.userAgent.includes('iPhone') && screen.width > 500) {
  console.log('Spoofing detected: Screen too large for iPhone');
}

// Detection: 16 CPU cores but only 2GB RAM?
if (navigator.hardwareConcurrency > 8 && navigator.deviceMemory < 4) {
  console.log('Spoofing detected: Impossible hardware combination');
}
```

**Container Shield defense:** Profile Manager assigns realistic, internally-consistent profiles. iPhone UA gets iPhone screen size, RAM, and CPU cores.

#### 2. Impossible Values

Some values only exist in specific combinations:

```javascript
// deviceMemory only returns: 0.25, 0.5, 1, 2, 4, 8
// Returning 3 or 6 = obvious spoofing
if (![0.25, 0.5, 1, 2, 4, 8].includes(navigator.deviceMemory)) {
  console.log('Spoofing detected: Invalid deviceMemory');
}
```

**Container Shield defense:** Only returns values that real browsers return.

#### 3. Canvas Consistency

If canvas noise is random, multiple reads will differ:

```javascript
// Read canvas hash twice
const hash1 = canvas.toDataURL();
const hash2 = canvas.toDataURL();

if (hash1 !== hash2) {
  console.log('Spoofing detected: Canvas values inconsistent');
}
```

**Container Shield defense:** Noise is deterministic. Same seed + same domain = same noise. Multiple reads return identical results.

#### 4. Prototype & Function Inspection

Scripts check if native functions were modified:

```javascript
// Check if toDataURL was wrapped
const fn = HTMLCanvasElement.prototype.toDataURL;
if (fn.toString().includes('[native code]') === false) {
  console.log('Spoofing detected: toDataURL was modified');
}

// Check prototype chain
if (canvas.toDataURL !== HTMLCanvasElement.prototype.toDataURL) {
  console.log('Spoofing detected: Prototype mismatch');
}
```

**Container Shield defense:** Wrapped functions preserve `toString()` output and prototype chain integrity.

#### 5. Timing Analysis

Spoofed APIs may be slower than native ones:

```javascript
// Native canvas should be fast
const start = performance.now();
for (let i = 0; i < 100; i++) {
  canvas.toDataURL();
}
const elapsed = performance.now() - start;

if (elapsed > 500) {  // Too slow?
  console.log('Spoofing detected: Canvas operations unusually slow');
}
```

**Container Shield defense:** Minimal overhead in hot paths. Noise is computed efficiently.

#### 6. Error Fingerprinting

Stack traces can reveal extension presence:

```javascript
try {
  throw new Error();
} catch (e) {
  if (e.stack.includes('extension://') || e.stack.includes('moz-extension://')) {
    console.log('Spoofing detected: Extension found in stack trace');
  }
}
```

**Container Shield defense:** Stack trace spoofer normalizes filenames and line numbers.

#### 7. Feature Detection Contradictions

Blocking an API vs spoofing it has different signatures:

```javascript
// If WebGL is blocked, getContext returns null
const gl = canvas.getContext('webgl');
if (gl === null && navigator.userAgent.includes('Chrome')) {
  console.log('Spoofing detected: Chrome should support WebGL');
}

// If we spoof WebGL vendor but getContext fails:
if (gl === null && somewhereWeReturnedAVendorString) {
  console.log('Spoofing detected: Contradictory WebGL state');
}
```

**Container Shield defense:** "Noise" mode modifies values but keeps APIs functional. "Block" mode is consistent (returns null/undefined everywhere).

#### 8. Lie Detection (CreepJS technique)

Advanced scripts detect "lies" - values that are technically valid but statistically unlikely:

```javascript
// Real browsers have consistent renderer/vendor pairs
const validPairs = [
  ['Google Inc.', 'ANGLE (Intel'],
  ['Google Inc.', 'ANGLE (NVIDIA'],
  ['Apple Inc.', 'Apple GPU'],
  // ...
];

const vendor = gl.getParameter(gl.VENDOR);
const renderer = gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL);

if (!validPairs.some(([v, r]) => vendor.includes(v) && renderer.includes(r))) {
  console.log('Spoofing detected: Invalid vendor/renderer pair');
}
```

**Container Shield defense:** GPU combinations are taken from real browser data.

#### Detection Summary

| Detection Method | How Sites Use It | Container Shield Defense |
|------------------|------------------|--------------------------|
| Consistency checks | Cross-reference UA, screen, hardware | Realistic profile bundles |
| Impossible values | Check for invalid enum values | Only valid values used |
| Canvas consistency | Multiple reads should match | Deterministic noise |
| Prototype inspection | Check native function signatures | Preserve `toString()` |
| Timing analysis | Spoofed APIs may be slower | Efficient implementation |
| Stack traces | Look for extension paths | Stack normalization |
| Feature detection | Blocked vs spoofed signatures | Consistent API states |
| Lie detection | Statistical analysis of values | Real-world value sets |

</details>

<details>
<summary><h3>🛠️ Troubleshooting Broken Sites</h3></summary>

When a website breaks, follow these steps:

#### Step 1: Confirm It's the Extension

1. Open the site in a **new container with protection disabled**
2. If it works → Container Shield is the cause
3. If still broken → Different issue

#### Step 2: Check the Fingerprint Monitor

1. Click the Container Shield icon
2. Go to **Monitor** tab
3. See which APIs the site accessed
4. Look for **blocked** (red) entries

#### Step 3: Try Less Aggressive Settings

```
Current Setting    →    Try Instead
─────────────────────────────────────
Block              →    Noise
Noise              →    Off (for that API)
WebRTC: Block      →    WebRTC: Public Only
```

#### Step 4: Add Domain Exception

1. Click Container Shield icon
2. Go to **Exceptions** tab
3. Add the domain (e.g., `example.com`)
4. Reload the page

#### Step 5: Use Preset Categories

For common site types, enable preset exceptions:

| If broken site is... | Enable preset... |
|---------------------|------------------|
| Bank, financial | Banking |
| Netflix, Hulu, etc. | Streaming |
| Zoom, Meet, Teams | Video Conferencing |
| Amazon, eBay, etc. | Shopping |
| Steam, Epic Games | Gaming |

#### Safe Default Settings

These settings rarely break sites:

```
✅ Recommended (rarely breaks):
   Graphics:     Noise
   Audio:        Noise
   Hardware:     Noise
   Navigator:    Noise
   Timezone:     Noise
   Fonts:        Noise
   Network:      WebRTC: Public Only, Connection: Noise
   Timing:       Noise

⚠️ Use with caution (may break):
   WebRTC:       Block
   Canvas:       Block
   WebGL:        Block
   MediaDevices: Block
   Clipboard:    Block
```

</details>

---

## Project Structure

<details>
<summary>Click to expand full project structure</summary>

```
containershield/
├── src/
│   ├── background/                    # Background service worker
│   │   ├── index.ts                   # Entry point, event listeners
│   │   ├── container-manager.ts       # Container detection & lifecycle
│   │   ├── profile-manager.ts         # Ensures unique profiles per container
│   │   ├── profile-rotation.ts        # Automatic fingerprint rotation
│   │   ├── settings-store.ts          # Per-container settings CRUD
│   │   ├── message-handler.ts         # Extension message routing
│   │   ├── header-spoofer.ts          # HTTP header modification (User-Agent, etc.)
│   │   └── ip-isolation.ts            # Cross-container IP warnings
│   │
│   ├── content/                       # Content script (ISOLATED world)
│   │   └── index.ts                   # Injects page script with config
│   │
│   ├── inject/                        # Page context (MAIN world)
│   │   ├── index.ts                   # Spoofer initialization
│   │   ├── monitor/
│   │   │   └── fingerprint-monitor.ts # Tracks API access attempts
│   │   └── spoofers/                  # 50+ fingerprint spoofers
│   │       ├── graphics/
│   │       │   ├── canvas.ts          # Canvas 2D spoofing
│   │       │   ├── webgl.ts           # WebGL vendor/renderer
│   │       │   ├── webgl2.ts          # WebGL2 extensions
│   │       │   ├── webgpu.ts          # WebGPU adapter info
│   │       │   ├── svg.ts             # SVG filter fingerprint
│   │       │   ├── domrect.ts         # Element dimensions
│   │       │   ├── text-metrics.ts    # Text measurement
│   │       │   ├── webgl-shaders.ts   # Shader compilation
│   │       │   └── offscreen.ts       # OffscreenCanvas
│   │       ├── audio/
│   │       │   ├── audio-context.ts   # AudioContext fingerprint
│   │       │   ├── offline-audio.ts   # OfflineAudioContext
│   │       │   └── audio-latency.ts   # Latency properties
│   │       ├── hardware/
│   │       │   ├── screen.ts          # Screen dimensions
│   │       │   ├── screen-frame.ts    # Window frame
│   │       │   ├── screen-orientation.ts
│   │       │   ├── device.ts          # CPU/RAM
│   │       │   ├── battery.ts         # Battery API
│   │       │   ├── media-devices.ts   # Camera/mic enumeration
│   │       │   ├── touch.ts           # Touch support
│   │       │   └── sensors.ts         # Motion sensors
│   │       ├── navigator/
│   │       │   ├── user-agent.ts      # UA, platform, vendor
│   │       │   ├── clipboard.ts       # Clipboard API
│   │       │   └── vibration.ts       # Vibration API
│   │       ├── timezone/
│   │       │   └── intl.ts            # Intl + Date timezone
│   │       ├── fonts/
│   │       │   ├── font-enum.ts       # Font enumeration
│   │       │   └── css-fonts.ts       # CSS font detection
│   │       ├── network/
│   │       │   ├── webrtc.ts          # WebRTC IP leak
│   │       │   └── connection.ts      # NetworkInformation
│   │       ├── timing/
│   │       │   └── performance.ts     # performance.now()
│   │       ├── storage/
│   │       │   ├── storage-estimate.ts
│   │       │   ├── indexeddb.ts
│   │       │   └── websql.ts
│   │       ├── devices/
│   │       │   ├── gamepad.ts
│   │       │   ├── midi.ts
│   │       │   ├── bluetooth.ts
│   │       │   └── usb-serial.ts      # USB, Serial, HID
│   │       └── [12 more categories...]
│   │
│   ├── popup/                         # React popup UI
│   │   ├── index.html
│   │   ├── main.tsx                   # React entry point
│   │   ├── App.tsx                    # Main component
│   │   ├── components/
│   │   │   ├── ContainerSelector.tsx  # Container dropdown
│   │   │   ├── ProtectionLevel.tsx    # Off/Minimal/Balanced/Strict
│   │   │   ├── CategoryToggle.tsx     # Category on/off switches
│   │   │   ├── SignalList.tsx         # Individual API toggles
│   │   │   ├── ProfilePresets.tsx     # Browser profile selection
│   │   │   ├── ProfileRotation.tsx    # Rotation schedule
│   │   │   ├── DomainExceptions.tsx   # Site whitelist
│   │   │   ├── StatisticsDashboard.tsx
│   │   │   ├── SettingsManager.tsx    # Export/import/reset
│   │   │   ├── FingerprintMonitor.tsx # Live API access log
│   │   │   └── ErrorBoundary.tsx
│   │   └── hooks/
│   │       ├── useContainers.ts       # Container management hook
│   │       └── useSettings.ts         # Settings management hook
│   │
│   ├── lib/
│   │   ├── crypto.ts                  # PRNG (xorshift128+), SHA-256
│   │   ├── farbling.ts                # Brave-style noise generation
│   │   ├── logger.ts                  # Configurable logging
│   │   ├── validation.ts              # Input validation
│   │   ├── constants.ts               # Shared constants
│   │   └── profiles/
│   │       ├── index.ts               # Profile manager
│   │       ├── user-agents.ts         # 25+ browser UA strings
│   │       └── screen-sizes.ts        # 30+ screen resolutions
│   │
│   ├── constants/
│   │   ├── messages.ts                # Message type constants
│   │   └── config.ts                  # Default configuration
│   │
│   └── types/
│       ├── index.ts                   # Shared types
│       ├── settings.ts                # Settings interfaces
│       └── firefox.d.ts               # Firefox WebExtension types
│
├── tests/
│   ├── unit/                          # Vitest unit tests
│   │   ├── crypto.test.ts
│   │   ├── farbling.test.ts
│   │   ├── validation.test.ts
│   │   └── logger.test.ts
│   └── e2e/                           # Playwright E2E tests
│       └── fingerprint-sites.test.ts
│
├── public/
│   └── icons/
│       ├── icon.svg                   # Main icon
│       ├── icon-48.svg
│       ├── icon-96.svg
│       └── icon-128.svg
│
├── manifest.json                      # Firefox WebExtension manifest v2
├── vite.config.ts                     # Vite build configuration
├── tsconfig.json                      # TypeScript configuration
├── tailwind.config.js                 # Tailwind CSS configuration
├── playwright.config.ts               # Playwright test configuration
└── package.json
```

</details>

---

## Development

### Prerequisites

- Node.js 18+
- npm 9+
- Firefox 91+

### Commands

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build

# Type checking
npm run typecheck

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint
```

### Testing Your Protection

Test the extension against real fingerprinting sites:

| Site | What It Tests |
|------|---------------|
| [CreepJS](https://abrahamjuliot.github.io/creepjs/) | Comprehensive fingerprint analysis |
| [BrowserLeaks](https://browserleaks.com/) | Individual API tests |
| [AmIUnique](https://amiunique.org/) | Browser uniqueness score |
| [FingerprintJS](https://fingerprintjs.github.io/fingerprintjs/) | Commercial fingerprinting |
| [Cover Your Tracks](https://coveryourtracks.eff.org/) | EFF's tracking test |

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **TypeScript 5** | Type-safe development |
| **React 18** | Popup UI components |
| **Vite 5** | Fast builds and HMR |
| **Tailwind CSS** | Utility-first styling |
| **webextension-polyfill** | Cross-browser compatibility |
| **Vitest** | Unit testing |
| **Playwright** | E2E testing |

---

## Contributing

Contributions are welcome! Please see our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Areas for Contribution

- [ ] Additional browser profiles
- [ ] More spoofing APIs
- [ ] Firefox Add-ons signing
- [ ] Chrome/Edge port (Manifest V3)
- [ ] Documentation improvements
- [ ] Bug fixes and testing

---

## License

This project is licensed under the **GPL-3.0 License** - see the [LICENSE](LICENSE) file for details.

This is the same license used by:
- [Chameleon](https://github.com/nickersoft/chameleon-ext)
- [JShelter](https://jshelter.org/)

---

## Acknowledgments

| Project | Contribution |
|---------|--------------|
| [Chameleon](https://github.com/nickersoft/chameleon-ext) | Header spoofing techniques |
| [JShelter](https://jshelter.org/) | JavaScript API wrapping patterns |
| [Brave Browser](https://brave.com/) | Farbling algorithms |
| [FingerprintJS](https://fingerprint.com/) | Fingerprinting research |
| [Mozilla](https://mozilla.org/) | Multi-Account Containers |

---

## Disclaimer

This extension is intended for:
- **Privacy protection** - Preventing unwanted tracking
- **Security testing** - Authorized penetration testing
- **Research** - Understanding fingerprinting techniques
- **Education** - Learning about browser privacy

Use responsibly and in accordance with applicable laws. The developers are not responsible for misuse.

---

<p align="center">
  Made with ❤️ for privacy
</p>
