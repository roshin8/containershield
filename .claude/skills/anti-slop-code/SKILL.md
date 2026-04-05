---
name: anti-slop-code
description: Prevent AI code slop - unnecessary abstractions, over-engineering, speculative error handling, and bloated patterns. Use when writing or reviewing code.
---

# Anti-Slop Code

Write code the way a senior engineer writes code. No bloat. No speculation.

## Rules

1. **No premature abstractions.** Three similar lines are better than a helper used once. Extract only when the third use appears.

2. **No speculative error handling.** Don't catch errors that can't happen. Don't validate inputs from internal functions. Only validate at system boundaries (user input, external APIs, network).

3. **No unnecessary wrappers.** Don't wrap a function just to rename it. Don't create a utility file for one function. Don't add a layer of indirection "for flexibility."

4. **No defensive coding against yourself.** Trust your own types. If TypeScript says it's a string, don't check if it's a string.

5. **No cargo-cult patterns.** Don't add patterns just because they're "best practice." Every pattern must solve a problem that exists in this codebase right now.

6. **No comment noise.** Don't add JSDoc to obvious functions. Don't add `// increment counter` above `counter++`. Comments explain why, never what.

7. **No feature flags for things that aren't features.** Don't make things configurable unless someone asked for configuration.

8. **No backwards-compat shims.** Don't rename unused variables with `_` prefix. Don't re-export removed types. Don't add `// removed` comments. Delete dead code completely.

9. **Match existing style.** Read surrounding code before writing. Match naming, spacing, patterns. Don't "improve" adjacent code unless asked.

10. **Smallest possible diff.** Do what was asked. Don't refactor nearby code. Don't add types to unchanged functions. Don't reorganize imports you didn't touch.

## Code Smell Checks

Before delivering code:

- Any function used only once? Inline it unless it improves readability.
- Any try/catch around code that can't throw? Remove it.
- Any `if (x !== null && x !== undefined)` when the type doesn't include null? Remove it.
- Any new file with fewer than 20 lines? Merge it into an existing file.
- Any parameter with a default that's never overridden? Remove the parameter.
- Any abstraction layer that just passes through? Remove it.
- Changed lines outside the task scope? Revert them.
