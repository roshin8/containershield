# Container Shield

Firefox browser extension (Manifest v2) for per-container fingerprint spoofing using Multi-Account Containers.

## Build & Test

```bash
npm run build          # Production build
npm run dev            # Dev build
npm run test           # Unit tests (vitest)
npm run test:e2e       # E2E tests (playwright)
npm run type-check     # TypeScript check
npm run run:extension  # Run in Firefox with web-ext
npm run package        # Build + zip for AMO
```

## Architecture

- `src/background/` - Persistent background script: container management, settings, header spoofing (webRequest API), message routing
- `src/content/` - Content script: runs at document_start, injects spoofer synchronously before page scripts
- `src/inject/spoofers/` - API wrappers: 50+ browser APIs (canvas, WebGL, audio, navigator, screen, fonts, etc.)
- `src/popup/` - React + Tailwind popup UI
- `src/lib/crypto.ts` - PRNG and seed derivation (deterministic per container + domain)

## Critical Constraints

- Inject script MUST run before any page script (document_start + synchronous injection)
- Spoofed values MUST be deterministic: same seed + domain = same fingerprint every time
- Container seeds MUST NOT leak to page context
- Headers (User-Agent, Accept-Language) MUST match JavaScript-level spoofing
- No eval, no innerHTML with untrusted data, no remote code execution (AMO policy)

## Mistakes to Avoid

- Don't add try/catch around internal crypto/PRNG functions (they use typed arrays, can't fail)
- Don't use Math.random() for anything security-related, use the PRNG in crypto.ts
- Don't modify Function.prototype or Object.prototype globally, only patch specific API targets
- Don't add console.log in inject scripts (detectable by fingerprinting sites)
- Don't create separate utility files for one-off helpers
