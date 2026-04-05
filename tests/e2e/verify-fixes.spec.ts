/**
 * Build Verification Tests
 *
 * Verify the built extension output is correct and complete.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', '..', 'dist');

test.describe('Build Output', () => {
  test('dist folder contains all required files', () => {
    const requiredFiles = [
      'manifest.json',
      'background/index.js',
      'content/index.js',
      'inject/index.js',
      'popup/index.html',
      'popup/index.js',
    ];

    for (const file of requiredFiles) {
      expect(fs.existsSync(path.join(distPath, file)), `Missing: ${file}`).toBe(true);
    }
  });

  test('inject script contains all mark functions', () => {
    const content = fs.readFileSync(path.join(distPath, 'inject', 'index.js'), 'utf-8');
    const expected = ['markCanvasSpoofed', 'markWebGLSpoofed', 'markNavigatorSpoofed', 'markScreenSpoofed', 'markHardwareSpoofed'];
    for (const fn of expected) {
      expect(content, `Missing: ${fn}`).toContain(fn);
    }
  });

  test('content script uses GET_SPOOF_CONFIG directly', () => {
    const content = fs.readFileSync(path.join(distPath, 'content', 'index.js'), 'utf-8');
    expect(content).toContain('GET_SPOOF_CONFIG');
    expect(content).not.toContain('requestConfig');
  });

  test('no debug server references in built output', () => {
    const files = ['background/index.js', 'content/index.js', 'inject/index.js'];
    for (const file of files) {
      const content = fs.readFileSync(path.join(distPath, file), 'utf-8');
      expect(content, `${file} references debug server`).not.toContain('localhost:9999');
      expect(content, `${file} references debug storage`).not.toContain('debug_logs');
    }
  });

  test('background script has all spoofer categories in mergeSettings', () => {
    const content = fs.readFileSync(path.join(distPath, 'background', 'index.js'), 'utf-8');
    const categories = [
      'graphics', 'audio', 'hardware', 'navigator', 'timezone', 'fonts',
      'network', 'timing', 'css', 'speech', 'permissions', 'storage',
      'math', 'keyboard', 'workers', 'errors', 'rendering', 'intl',
      'crypto', 'devices', 'features', 'payment',
    ];
    for (const cat of categories) {
      expect(content, `Missing category: ${cat}`).toContain(cat);
    }
  });
});

test.describe('Manifest', () => {
  test('manifest is valid with correct version', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(distPath, 'manifest.json'), 'utf-8'));
    expect(manifest.version).toBe('0.3.0');
    expect(manifest.manifest_version).toBe(2);
  });

  test('manifest has required permissions', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(distPath, 'manifest.json'), 'utf-8'));
    const required = ['contextualIdentities', 'cookies', 'tabs', 'storage', 'webRequest', 'webRequestBlocking'];
    for (const perm of required) {
      expect(manifest.permissions, `Missing: ${perm}`).toContain(perm);
    }
  });

  test('manifest does not expose debug resources', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(distPath, 'manifest.json'), 'utf-8'));
    const resources = manifest.web_accessible_resources || [];
    expect(resources).not.toContain('debug.html');
    expect(resources).not.toContain('debug-test.html');
  });
});

test.describe('Source Types', () => {
  test('ProfileConfig includes hardware override fields', () => {
    const content = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'types', 'settings.ts'), 'utf-8');
    expect(content).toContain('hardwareConcurrency');
    expect(content).toContain('deviceMemory');
  });

  test('MessageType includes GET_SPOOF_CONFIG', () => {
    const content = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'types', 'index.ts'), 'utf-8');
    expect(content).toContain("'GET_SPOOF_CONFIG'");
    expect(content).not.toContain("'INJECT_CONFIG'");
  });
});
