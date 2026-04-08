<p align="center">
  <img src="public/icons/icon-128.svg" alt="Container Shield" width="100" height="100">
</p>

<h1 align="center">Container Shield</h1>

<p align="center">
  <strong>Per-container fingerprint protection for Firefox Multi-Account Containers</strong><br>
  <sub>Every container gets a unique browser identity. Sites can't link you across containers.</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Signals_Protected-70+-7c5cfc?style=for-the-badge" alt="Signals Protected">
  <img src="https://img.shields.io/badge/Firefox-128+-FF7139?style=for-the-badge&logo=firefox-browser&logoColor=white" alt="Firefox 128+">
  <img src="https://img.shields.io/badge/Manifest-V3-10b981?style=for-the-badge" alt="Manifest V3">
  <img src="https://img.shields.io/badge/License-GPL--3.0-blue?style=for-the-badge" alt="License">
</p>

<p align="center">
  <a href="#how-it-works">How It Works</a> &nbsp;&middot;&nbsp;
  <a href="#screenshots">Screenshots</a> &nbsp;&middot;&nbsp;
  <a href="#signals-protected">Signals</a> &nbsp;&middot;&nbsp;
  <a href="#installation">Install</a> &nbsp;&middot;&nbsp;
  <a href="#limitations">Limitations</a>
</p>

---

<br>

## Screenshots

<table>
<tr>
<td align="center" width="33%">
<img src="docs/screenshots/dashboard.png" alt="Dashboard" width="300"><br>
<sub><b>Dashboard</b> &mdash; Protection status, spoofed profile, fingerprint monitor</sub>
</td>
<td align="center" width="33%">
<img src="docs/screenshots/signals.png" alt="Signals" width="300"><br>
<sub><b>Signals</b> &mdash; Per-signal Off/Spoof/Block with live values</sub>
</td>
<td align="center" width="33%">
<img src="docs/screenshots/onboarding.png" alt="Onboarding" width="300"><br>
<sub><b>Onboarding</b> &mdash; Before/after fingerprint comparison</sub>
</td>
</tr>
</table>

<br>

---

<br>

## How It Works

### The Problem

Websites combine **70+ browser signals** into a unique fingerprint that tracks you &mdash; even without cookies. Firefox containers isolate cookies, but your fingerprint is the same everywhere because it comes from real hardware.

### The Solution

Container Shield intercepts fingerprinting APIs and returns **spoofed values unique to each container**.

<table>
<tr>
<th></th>
<th>Without Container Shield</th>
<th>With Container Shield</th>
</tr>
<tr>
<td><b>Canvas</b></td>
<td><code>Your real hash</code></td>
<td><code>#a7f3b2c1</code> <img src="https://img.shields.io/badge/-spoofed-10b981" alt="spoofed"></td>
</tr>
<tr>
<td><b>WebGL GPU</b></td>
<td><code>Your real GPU</code></td>
<td><code>RTX 3060</code> <img src="https://img.shields.io/badge/-spoofed-10b981" alt="spoofed"></td>
</tr>
<tr>
<td><b>Screen</b></td>
<td><code>Your real resolution</code></td>
<td><code>1920x1080</code> <img src="https://img.shields.io/badge/-spoofed-10b981" alt="spoofed"></td>
</tr>
<tr>
<td><b>Timezone</b></td>
<td><code>Your real timezone</code></td>
<td><code>America/New_York</code> <img src="https://img.shields.io/badge/-spoofed-10b981" alt="spoofed"></td>
</tr>
<tr>
<td><b>User Agent</b></td>
<td><code>Firefox (real)</code></td>
<td><code>Chrome 125 Win10</code> <img src="https://img.shields.io/badge/-spoofed-10b981" alt="spoofed"></td>
</tr>
<tr>
<td><b>Audio</b></td>
<td><code>Your real hash</code></td>
<td><code>#e8c2d91f</code> <img src="https://img.shields.io/badge/-spoofed-10b981" alt="spoofed"></td>
</tr>
</table>

Each fingerprint is **deterministic** (same container + domain = same values), **consistent** (all signals match the assigned profile), and **unique** (no two containers share identity).

<br>

### Per-Container Identity

Every Firefox container gets its own fingerprint. Add as many as you need.

<table>
<tr>
<td align="center"><img src="https://img.shields.io/badge/-Personal-3b82f6?style=for-the-badge" alt="Personal"><br><sub>Chrome/Win<br>RTX 3060<br>1920x1080<br><code>#a7f3...</code></sub></td>
<td align="center"><img src="https://img.shields.io/badge/-Work-10b981?style=for-the-badge" alt="Work"><br><sub>Safari/Mac<br>Apple M2<br>2560x1440<br><code>#e2d1...</code></sub></td>
<td align="center"><img src="https://img.shields.io/badge/-Shopping-f59e0b?style=for-the-badge" alt="Shopping"><br><sub>Firefox/Linux<br>RX 6700 XT<br>1440x900<br><code>#91b4...</code></sub></td>
<td align="center"><img src="https://img.shields.io/badge/-Banking-ef4444?style=for-the-badge" alt="Banking"><br><sub>Edge/Win<br>RTX 4060<br>1920x1200<br><code>#c8f7...</code></sub></td>
</tr>
</table>

<br>

---

<br>

## Signals Protected

Container Shield spoofs **70+ fingerprinting signals** across 15 categories.

<table>
<tr><th>Category</th><th>Signals</th><th>What Sites See</th></tr>
<tr><td><b>Graphics</b></td><td>Canvas, WebGL, WebGL2, WebGPU, SVG, DOMRect, TextMetrics, OffscreenCanvas, Shaders</td><td>Unique canvas hash, spoofed GPU, noised geometry</td></tr>
<tr><td><b>Audio</b></td><td>AudioContext, OfflineAudio, Latency, Codecs</td><td>Unique audio hash, standardized codec responses</td></tr>
<tr><td><b>Hardware</b></td><td>Screen, Orientation, Memory, CPU, Battery, Touch, Sensors, Viewport, Architecture</td><td>Profile-matched resolution, core count, memory</td></tr>
<tr><td><b>Navigator</b></td><td>User-Agent, Languages, Plugins, Client Hints, Clipboard, Vibration, Vendor Flavors</td><td>Complete browser identity (e.g. "Chrome 125 on Windows 11")</td></tr>
<tr><td><b>Timezone</b></td><td>Intl.DateTimeFormat, Date.getTimezoneOffset</td><td>Spoofed timezone (e.g. America/New_York)</td></tr>
<tr><td><b>Fonts</b></td><td>Font Enumeration, CSS Font Detection, Font Preferences</td><td>Platform-appropriate font list</td></tr>
<tr><td><b>Network</b></td><td>WebRTC, Connection, Geolocation, WebSocket</td><td>Public IP only, spoofed connection profile</td></tr>
<tr><td><b>Timing</b></td><td>performance.now(), Memory, Event Loop</td><td>Reduced precision, randomized heap, jitter</td></tr>
<tr><td><b>Workers</b></td><td>Dedicated, Shared, Service, AudioWorklet</td><td>Preamble injection matches main thread</td></tr>
<tr><td><b>Storage</b></td><td>StorageEstimate, IndexedDB, WebSQL, Private Mode</td><td>Randomized quotas</td></tr>
<tr><td><b>Devices</b></td><td>Gamepad, MIDI, Bluetooth, USB, Serial, HID</td><td>Empty/blocked device lists</td></tr>
<tr><td><b>Other</b></td><td>Math, Keyboard, Speech, Crypto, Errors, Apple Pay, CSS, Permissions, Intl</td><td>Normalized precision, spoofed voices, jitter</td></tr>
<tr><td><b>Headers</b></td><td>User-Agent, Accept-Language, header order</td><td>HTTP headers match JS-level spoofing</td></tr>
</table>

### Protection Modes

Each signal supports three modes:

<table>
<tr>
<td align="center"><img src="https://img.shields.io/badge/Off-64748b?style=for-the-badge" alt="Off"><br><sub>Real values returned</sub></td>
<td align="center"><img src="https://img.shields.io/badge/Spoof-7c5cfc?style=for-the-badge" alt="Spoof"><br><sub>Deterministic noise (default)</sub></td>
<td align="center"><img src="https://img.shields.io/badge/Block-ef4444?style=for-the-badge" alt="Block"><br><sub>Fake/empty values returned</sub></td>
</tr>
</table>

### Protection Levels

<table>
<tr>
<td align="center"><img src="https://img.shields.io/badge/Off-64748b?style=flat-square" alt="Off"><br><sub>No spoofing</sub></td>
<td align="center"><img src="https://img.shields.io/badge/Low-22c55e?style=flat-square" alt="Low"><br><sub>Light noise<br>Minimal breakage</sub></td>
<td align="center"><img src="https://img.shields.io/badge/Balanced-7c5cfc?style=flat-square" alt="Balanced"><br><sub><b>Recommended</b><br>Strong + compatible</sub></td>
<td align="center"><img src="https://img.shields.io/badge/Strict-ef4444?style=flat-square" alt="Strict"><br><sub>Maximum privacy<br>May break sites</sub></td>
</tr>
</table>

<br>

---

<br>

## Features

| Feature | Description |
|---------|-------------|
| **Per-Container Isolation** | Each container gets a 256-bit seed. All values derived deterministically. |
| **Real Browser Profiles** | 35+ profiles: Chrome, Firefox, Safari, Edge on Win/Mac/Linux/Android/iOS. |
| **Fingerprint Monitor** | Real-time dashboard showing which APIs the page accessed and their status. |
| **Auto-Rotation** | Rotate fingerprints on a schedule (session, hourly, daily, weekly). |
| **IP Conflict Detection** | Warns when two containers access the same IP address. |
| **Worker & iFrame Spoofing** | Injects preamble into Workers, patches iFrame contentWindow. |
| **Header Spoofing** | HTTP headers (UA, Accept-Language, order) match JS-level profile. |
| **DNS Leak Prevention** | Enables DoH, blocks DNS leak test domains. |
| **Tracking Blocker** | Blocks known tracking pixels and tracker domains. |
| **Keyboard Shortcuts** | Toggle protection, rotate fingerprint, add exception. |
| **Dark Mode** | Follows system preference or manual toggle. |
| **Export/Import** | Backup and restore all settings. |

<br>

---

<br>

## Tested Against

| Site | Result |
|------|--------|
| [CreepJS](https://abrahamjuliot.github.io/creepjs/) | Unique fingerprint per container, worker/iframe values match |
| [fingerprint.com](https://fingerprint.com/demo/) | Different visitor ID per container |
| [BrowserLeaks](https://browserleaks.com/) | Canvas, WebGL, fonts, screen all spoofed |
| [AmIUnique](https://amiunique.org/) | Distinct fingerprint per container |

<br>

---

<br>

## Installation

### From Source

```bash
git clone https://github.com/roshin8/containershield.git
cd containershield
npm install
npm run build
```

### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `dist/manifest.json`

### Development

```bash
npm run dev             # Dev build (watch mode)
npm run run:extension   # Launch Firefox with extension
npm run test            # Unit tests (vitest, 215 tests)
npm run test:real       # Real extension E2E on fingerprinting sites
npm run type-check      # TypeScript check
npm run package         # Build + zip for AMO
```

### Project Structure

```
src/
├── background/         # Container management, settings, headers, IP isolation
├── content/            # Message bridge (page <-> background)
├── inject/spoofers/    # 70+ API wrappers (world: "MAIN", runs before page scripts)
├── popup/              # React UI (Dashboard, Signals, Profile, Headers, Rules, Settings)
├── pages/              # Onboarding, options, test runner
└── lib/                # Crypto, PRNG, profiles, GPU lists, constants
```

<br>

---

<br>

## Limitations

| Limitation | Why | Mitigation |
|-----------|-----|------------|
| **TLS/JA3 fingerprinting** | TLS handshake is browser-level | Use Camoufox for TLS protection |
| **HTTP/2 SETTINGS** | Browser-level, not interceptable | None at extension level |
| **TCP/IP stack** | OS-level TCP signatures | VPN or Tor |
| **IP correlation** | Same IP across containers links them | VPN per container |
| **Login-based tracking** | Same account = trivially linked | Different accounts per container |
| **System fonts (CSS)** | Some CSS font probing bypasses JS | Partially mitigated |
| **ServiceWorker** | Firefox blocks injection into SW scripts | Block SW, fall back to spoofed SharedWorker |
| **Extension detection** | Sophisticated trackers may detect spoofing | Stealth techniques minimize this |

<br>

---

<br>

## Privacy

Container Shield is **100% local**. No data collected, no telemetry, no external servers. All fingerprint generation happens in your browser. Open source and auditable.

<br>

## Keyboard Shortcuts

| Mac | Windows/Linux | Action |
|-----|---------------|--------|
| `Ctrl+Shift+P` | `Alt+Shift+P` | Toggle protection |
| `Ctrl+Shift+R` | `Alt+Shift+R` | Rotate fingerprint |
| `Ctrl+Shift+E` | `Alt+Shift+E` | Toggle site exception |
| `Ctrl+Shift+C` | `Alt+Shift+C` | Open popup |

<br>

## License

[GPL-3.0](LICENSE)

<br>

---

<p align="center">
  <sub>Built with TypeScript, React, and the Firefox WebExtensions API</sub><br>
  <sub>Regenerate screenshots: <code>npx tsx scripts/take-screenshots.ts</code></sub>
</p>
