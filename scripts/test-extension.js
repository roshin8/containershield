#!/usr/bin/env node
/**
 * Test Extension Script
 *
 * Runs the extension with web-ext and opens a test page.
 * The user can manually verify functionality.
 *
 * Usage: node scripts/test-extension.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');

console.log('Starting Container Shield extension test...');
console.log('Extension path:', distPath);
console.log('');
console.log('This will open Firefox with the extension loaded.');
console.log('Test pages to visit:');
console.log('  - https://abrahamjuliot.github.io/creepjs/');
console.log('  - https://browserleaks.com/canvas');
console.log('  - https://amiunique.org/fingerprint');
console.log('');
console.log('Check:');
console.log('  1. Open the extension popup (click the icon)');
console.log('  2. Try selecting User Agent, Language, Screen, etc.');
console.log('  3. Check the Fingerprint Monitor for "Spoofed" vs "Exposed"');
console.log('  4. Visit test sites and verify values are different');
console.log('');

// Start web-ext
const webext = spawn('npx', [
  'web-ext',
  'run',
  '--source-dir', distPath,
  '--start-url', 'https://abrahamjuliot.github.io/creepjs/',
  '--browser-console',
  '--no-reload',
], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});

webext.on('error', (err) => {
  console.error('Failed to start web-ext:', err);
  process.exit(1);
});

webext.on('close', (code) => {
  console.log('web-ext exited with code', code);
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  webext.kill('SIGINT');
});
