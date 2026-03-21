/**
 * Tests for the update notification box and version check logic.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_ENTRY = join(__dirname, '..', 'index.ts');

/**
 * Run the CLI with a custom config dir and capture both stdout and stderr.
 * Uses spawnSync to reliably capture stderr (where the update box is written).
 */
function runCliWithConfig(args: string, configDir: string): { stdout: string; stderr: string } {
  const result = spawnSync('bun', [CLI_ENTRY, ...args.split(' ')], {
    encoding: 'utf-8',
    timeout: 15_000,
    env: {
      ...process.env,
      BITCOMPASS_CONFIG_DIR: configDir,
      NO_COLOR: '1',
    },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

describe('update notification box', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `bitcompass-update-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('shows update box when cached version is newer', () => {
    // Write a cache with a very high version and far-future timestamp
    writeFileSync(
      join(tempDir, 'update-check.json'),
      JSON.stringify({ lastCheck: Date.now() + 3600000, latestVersion: '99.0.0' }),
      { mode: 0o600 }
    );

    const { stdout, stderr } = runCliWithConfig('--help', tempDir);
    const combined = stdout + stderr;

    expect(combined).toContain('Update available');
    expect(combined).toContain('99.0.0');
    expect(combined).toContain('bitcompass self-update');
  });

  test('does not show update box when cached version equals current', () => {
    // Read current version from package.json
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };

    writeFileSync(
      join(tempDir, 'update-check.json'),
      JSON.stringify({ lastCheck: Date.now() + 3600000, latestVersion: pkg.version }),
      { mode: 0o600 }
    );

    const { stdout, stderr } = runCliWithConfig('--help', tempDir);
    const combined = stdout + stderr;

    expect(combined).not.toContain('Update available');
  });

  test('does not show update box when cached version is older', () => {
    writeFileSync(
      join(tempDir, 'update-check.json'),
      JSON.stringify({ lastCheck: Date.now() + 3600000, latestVersion: '0.0.1' }),
      { mode: 0o600 }
    );

    const { stdout, stderr } = runCliWithConfig('--help', tempDir);
    const combined = stdout + stderr;

    expect(combined).not.toContain('Update available');
  });

  test('does not crash when cache file is corrupted', () => {
    writeFileSync(join(tempDir, 'update-check.json'), 'NOT JSON', { mode: 0o600 });

    // Should not throw — fail silently
    const { stdout, stderr } = runCliWithConfig('--help', tempDir);
    const combined = stdout + stderr;

    // Should still show help output
    expect(combined).toContain('bitcompass');
    expect(combined).not.toContain('Update available');
  });

  test('does not crash when cache file is missing', () => {
    // No cache file at all
    const { stdout, stderr } = runCliWithConfig('--help', tempDir);
    const combined = stdout + stderr;

    expect(combined).toContain('bitcompass');
    expect(combined).not.toContain('Update available');
  });

  test('update box contains box-drawing characters', () => {
    writeFileSync(
      join(tempDir, 'update-check.json'),
      JSON.stringify({ lastCheck: Date.now() + 3600000, latestVersion: '99.0.0' }),
      { mode: 0o600 }
    );

    const { stdout, stderr } = runCliWithConfig('--help', tempDir);
    const combined = stdout + stderr;

    // Should have the bordered box structure (NO_COLOR strips ANSI but keeps Unicode)
    expect(combined).toContain('╭');
    expect(combined).toContain('╰');
    expect(combined).toContain('│');
  });

  test('does not show update box for mcp command', () => {
    writeFileSync(
      join(tempDir, 'update-check.json'),
      JSON.stringify({ lastCheck: Date.now() + 3600000, latestVersion: '99.0.0' }),
      { mode: 0o600 }
    );

    const { stdout, stderr } = runCliWithConfig('mcp status', tempDir);
    const combined = stdout + stderr;

    expect(combined).not.toContain('Update available');
  });

  test('does not show update box for self-update command', () => {
    writeFileSync(
      join(tempDir, 'update-check.json'),
      JSON.stringify({ lastCheck: Date.now() + 3600000, latestVersion: '99.0.0' }),
      { mode: 0o600 }
    );

    // self-update would try to actually update, so we just check --help
    const { stdout, stderr } = runCliWithConfig('self-update --help', tempDir);
    const combined = stdout + stderr;

    // --help triggers the version flag check path, which skips update notification
    expect(combined).not.toContain('Update available');
  });
});
