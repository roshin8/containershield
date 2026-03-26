# Privacy Policy for Container Shield

**Last updated:** March 2024

## Overview

Container Shield is a privacy-focused Firefox extension that protects your browser fingerprint. This privacy policy explains what data the extension accesses and how it's handled.

## Data Collection

**Container Shield does NOT collect, transmit, or store any personal data on external servers.**

All data remains entirely local on your device.

## Data Accessed Locally

The extension accesses the following data, which never leaves your browser:

### 1. Firefox Container Information
- Container names and IDs (from Firefox Multi-Account Containers)
- Used to apply per-container fingerprint settings

### 2. Website URLs
- Domain names of websites you visit
- Used to apply domain-specific protection rules
- Never transmitted externally

### 3. Browser Fingerprint Data
- Canvas, WebGL, Audio, and other fingerprinting APIs
- Intercepted and modified locally to protect your privacy
- Original data is never stored or transmitted

### 4. Extension Settings
- Your protection preferences and configuration
- Stored in Firefox's local extension storage (`browser.storage.local`)
- Can be exported/imported manually by you

### 5. IP Addresses (Optional Feature)
- Local/private IP addresses accessed in browser
- Tracked locally to warn about cross-container IP correlation
- Never transmitted externally

## Data Storage

All data is stored locally using:
- `browser.storage.local` - Firefox's built-in extension storage
- Data persists until you uninstall the extension or clear it manually

## Data Sharing

**We do not share any data with third parties.** The extension:
- Makes no network requests to external servers
- Has no analytics or telemetry
- Has no advertising
- Does not sell or share any information

## Permissions Explained

The extension requests these permissions:

| Permission | Purpose |
|------------|---------|
| `contextualIdentities` | Access Firefox containers |
| `cookies` | Read container cookie store IDs |
| `tabs` | Detect active tab and container |
| `storage` | Save your settings locally |
| `webRequest` | Modify HTTP headers for privacy |
| `webRequestBlocking` | Block/modify requests before they're sent |
| `webNavigation` | Detect navigation for IP isolation |
| `privacy` | Access privacy-related browser settings |
| `<all_urls>` | Apply protection to all websites |

## Open Source

Container Shield is open source software licensed under GPL-3.0. You can review the complete source code at:
https://github.com/roshin8/containershield

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last updated" date above.

## Contact

For privacy concerns or questions, please open an issue on our GitHub repository.
