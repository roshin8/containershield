/**
 * Real Extension Full E2E Test
 *
 * Launches the REAL extension via web-ext on system Firefox.
 * The extension's built-in test runner opens real fingerprinting sites,
 * reads spoofed values, captures screenshots, and posts results here.
 *
 * NO engine injection. NO localhost fingerprinting. REAL extension on REAL sites.
 */
import { test, expect } from '@playwright/test';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../dist');

interface TestResult {
  scenario: string;
  passed: boolean;
  values: Record<string, any>;
  checks: Array<{ signal: string; expected: string; actual: string; pass: boolean }>;
  screenshot?: string;
  error?: string;
  duration: number;
}

test('full real extension E2E on fingerprinting sites', async () => {
  // Start result server
  let receivedResults: { results: TestResult[]; summary: { passed: number; total: number } } | null = null;

  const gotResults = new Promise<typeof receivedResults>((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

      if (req.method === 'POST' && req.url === '/results') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
          res.writeHead(200); res.end('ok');
          receivedResults = JSON.parse(body);
          resolve(receivedResults);
          server.close();
        });
      } else {
        res.writeHead(404); res.end();
      }
    });
    server.listen(19999);
  });

  // Read gecko ID from manifest
  const manifest = JSON.parse(fs.readFileSync(path.join(distPath, 'manifest.json'), 'utf-8'));
  const geckoId = manifest.browser_specific_settings?.gecko?.id || '';

  // Create temp profile
  const profileDir = fs.mkdtempSync('/tmp/cs-full-e2e-');

  // Launch web-ext with the test runner page as start URL
  const webExt = spawn('npx', [
    'web-ext', 'run',
    '--source-dir', distPath,
    '--firefox', '/Applications/Firefox.app/Contents/MacOS/firefox',
    '--firefox-profile', profileDir,
    '--keep-profile-changes',
    '--start-url', `moz-extension://${geckoId}/pages/test-runner.html`,
    '--no-reload',
  ], {
    env: { ...process.env, MOZ_HEADLESS: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Wait for results (3 minutes max — tests open multiple sites)
  const timeout = new Promise<null>(r => setTimeout(() => r(null), 180000));
  const results = await Promise.race([gotResults, timeout]);

  // Cleanup
  webExt.kill('SIGTERM');
  await new Promise(r => setTimeout(r, 2000));
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}

  if (!results) {
    console.log('TIMEOUT — test runner did not post results within 3 minutes');
    expect(results).not.toBeNull();
    return;
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('CONTAINER SHIELD — REAL EXTENSION E2E RESULTS');
  console.log('='.repeat(60));

  for (const r of results.results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`\n${icon} ${r.scenario} (${r.duration}ms)`);
    for (const c of r.checks) {
      console.log(`   ${c.pass ? '✓' : '✗'} ${c.signal}: ${c.actual}`);
    }
    if (r.error) console.log(`   ERROR: ${r.error}`);

    // Save screenshots
    if (r.screenshot) {
      const screenshotDir = path.resolve(__dirname, '../../test-results/screenshots');
      fs.mkdirSync(screenshotDir, { recursive: true });
      const filename = r.scenario.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const data = r.screenshot.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(path.join(screenshotDir, `${filename}.png`), data, 'base64');
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`SUMMARY: ${results.summary.passed}/${results.summary.total} passed`);
  console.log('='.repeat(60) + '\n');

  // Assert all passed
  expect(results.summary.passed).toBe(results.summary.total);
});
