---
name: security-audit
description: Security audit for Firefox browser extensions. Use when reviewing code that handles fingerprinting, content scripts, API interception, or AMO submission.
---

# Browser Extension Security Audit

Security review focused on Firefox WebExtension APIs and fingerprint spoofing.

## Critical Checks

### Content Script Security
- No `innerHTML` or `outerHTML` with untrusted data (CSP violation risk)
- No `eval()`, `new Function()`, or `setTimeout(string)` anywhere
- No dynamic script loading from external URLs
- Content scripts must not leak extension internals to page context
- `postMessage` listeners must validate `event.origin` and `event.source`

### API Interception (Inject Scripts)
- `Object.defineProperty` calls must use `configurable: false` where appropriate
- Wrapped APIs must pass `Function.prototype.toString` checks (return native code string)
- Property descriptors must match original API signatures exactly
- Proxy/wrapper detection: ensure `Object.getOwnPropertyDescriptor` returns expected values
- No prototype pollution: don't modify shared prototypes beyond specific API targets

### Cryptographic Safety
- PRNG seeds must derive from cryptographic source (not Math.random)
- Seeds must be domain-isolated (no cross-domain correlation)
- Container seeds must not be extractable from page context
- Spoofed values must be deterministic per seed (no random jitter per call)

### Data Flow
- No sensitive data (seeds, container IDs, settings) exposed to page context
- Message passing between background/content/inject must validate message shape
- Storage keys must not collide across containers
- No logging of seeds or fingerprint values in production builds

### AMO Compliance
- No remote code execution (no fetching and executing external scripts)
- No obfuscated or minified source that AMO reviewers can't read
- All permissions in manifest.json must be justified and minimal
- No hidden functionality or undocumented network requests
- Web-accessible resources must be limited to what's needed

### Header Spoofing
- `User-Agent` header must match navigator.userAgent spoofing exactly
- `Accept-Language` must match `navigator.language` / `navigator.languages`
- No header values that create impossible browser/OS combinations
- WebRequest listeners must not leak to other extensions

## Review Process

1. Check each content script and inject script against the rules above
2. Trace data flow: background -> content -> inject -> page
3. Verify no information leaks in reverse: page -> inject -> content -> background
4. Test with browser devtools: can a page script detect the extension?
5. Validate manifest permissions are minimal
