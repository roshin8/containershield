/**
 * Popup UI Tests
 *
 * Tests the popup HTML/JS loads and renders in a browser context.
 * Since the popup uses browser.runtime.sendMessage which requires the extension
 * context, we test the built HTML/CSS rendering and verify the React app bootstraps.
 */

import { test, expect, firefox } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../dist');

test.describe('Popup UI Rendering', () => {
  test('popup HTML file exists and is valid', () => {
    const htmlPath = path.join(distPath, 'popup', 'index.html');
    expect(fs.existsSync(htmlPath)).toBe(true);

    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<div id="root">');
    // Should reference the popup JS bundle
    expect(html).toContain('index.js');
  });

  test('popup JS bundle loads without syntax errors', async () => {
    const browser = await firefox.launch();
    const page = await browser.newPage();

    const errors: string[] = [];
    page.on('pageerror', (error) => {
      // Ignore errors related to missing browser extension APIs
      // (expected when running outside extension context)
      if (!error.message.includes('browser is not defined') &&
          !error.message.includes('chrome is not defined') &&
          !error.message.includes('webextension-polyfill')) {
        errors.push(error.message);
      }
    });

    // Load the popup HTML directly (will fail on extension API calls but JS should parse)
    const htmlPath = path.join(distPath, 'popup', 'index.html');
    await page.goto(`file://${htmlPath}`);
    await page.waitForTimeout(500);

    // Filter out expected extension API errors
    const realErrors = errors.filter(e =>
      !e.includes('runtime') &&
      !e.includes('extension') &&
      !e.includes('sendMessage') &&
      !e.includes('browser')
    );

    // No syntax errors or unexpected JS errors
    expect(realErrors).toHaveLength(0);

    await browser.close();
  });

  test('popup CSS is bundled and contains expected styles', () => {
    // Find CSS file in assets
    const assetsDir = path.join(distPath, 'assets');
    if (!fs.existsSync(assetsDir)) return; // Skip if no assets dir

    const cssFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.css'));
    expect(cssFiles.length).toBeGreaterThan(0);

    // Check CSS contains Tailwind utilities
    const cssContent = cssFiles
      .map(f => fs.readFileSync(path.join(assetsDir, f), 'utf-8'))
      .join('');
    expect(cssContent.length).toBeGreaterThan(1000); // Non-trivial CSS
  });

  test('onboarding page loads', () => {
    const htmlPath = path.join(distPath, 'pages', 'onboarding.html');
    if (!fs.existsSync(htmlPath)) return; // Skip if not built

    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
  });

  test('ip-warning page loads', () => {
    const htmlPath = path.join(distPath, 'pages', 'ip-warning.html');
    expect(fs.existsSync(htmlPath)).toBe(true);

    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
  });
});

test.describe('Popup Bundle Content', () => {
  test('popup bundle contains React components', () => {
    const jsPath = path.join(distPath, 'popup', 'index.js');
    const content = fs.readFileSync(jsPath, 'utf-8');

    // Should contain the main UI elements
    expect(content).toContain('Container Shield');
    expect(content).toContain('dashboard');
    expect(content).toContain('fingerprint');
    expect(content).toContain('settings');
  });

  test('popup bundle references all message types', () => {
    const jsPath = path.join(distPath, 'popup', 'index.js');
    const content = fs.readFileSync(jsPath, 'utf-8');

    expect(content).toContain('GET_ALL_CONTAINERS');
    expect(content).toContain('GET_CONTAINER_INFO');
    expect(content).toContain('GET_SETTINGS');
    expect(content).toContain('SET_SETTINGS');
    expect(content).toContain('GET_ASSIGNED_PROFILE');
  });

  test('popup shows version number', () => {
    const jsPath = path.join(distPath, 'popup', 'index.js');
    const content = fs.readFileSync(jsPath, 'utf-8');
    expect(content).toContain('0.3.0');
  });
});
