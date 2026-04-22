/**
 * Error Stack Trace Spoofer
 *
 * Error stack traces can reveal browser version, OS, and
 * extension information through their format.
 */

import type { ProtectionMode } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { logAccess } from '../../monitor/fingerprint-monitor';

/**
 * Initialize Error stack trace spoofing
 */
export function initErrorSpoofer(mode: ProtectionMode, prng: PRNG): void {
  if (mode === 'off') return;

  const OriginalError = window.Error;

  // Instead of replacing window.Error (which breaks sites that check
  // error constructor identity or inspect stacks), intercept the stack
  // property via Error.prototype. This normalizes stacks without
  // changing how errors are constructed.
  const originalStackDesc = Object.getOwnPropertyDescriptor(OriginalError.prototype, 'stack');
  if (originalStackDesc) {
    Object.defineProperty(OriginalError.prototype, 'stack', {
      get() {
        const raw = originalStackDesc.get ? originalStackDesc.get.call(this) : undefined;
        if (!raw || typeof raw !== 'string') return raw;
        if (mode === 'block') return `Error: ${this.message || ''}`;
        return normalizeStackTrace(raw);
      },
      set(val) {
        // Allow sites to set stack (some frameworks do this)
        Object.defineProperty(this, 'stack', {
          value: val, writable: true, configurable: true,
        });
      },
      configurable: true,
    });
  }

  // Spoof stackTraceLimit if it exists (V8-specific)
  if ('stackTraceLimit' in OriginalError) {
    Object.defineProperty(OriginalError, 'stackTraceLimit', {
      value: 10,
      writable: true,
      configurable: true,
    });
  }

}

/**
 * Normalize a stack trace to remove identifying information
 */
function normalizeStackTrace(stack: string): string {
  const lines = stack.split('\n');

  return lines
    .map((line, index) => {
      if (index === 0) return line; // Keep error message

      // Remove file paths that might reveal extensions or system info
      // Normalize to generic format: "    at functionName (script.js:line:col)"
      const match = line.match(/^\s*at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)$/);

      if (match) {
        const [, funcName, , lineNum, colNum] = match;
        return `    at ${funcName} (script.js:${lineNum}:${colNum})`;
      }

      // Handle anonymous functions
      const anonMatch = line.match(/^\s*at\s+(.+?):(\d+):(\d+)$/);
      if (anonMatch) {
        const [, , lineNum, colNum] = anonMatch;
        return `    at script.js:${lineNum}:${colNum}`;
      }

      return line;
    })
    .join('\n');
}
