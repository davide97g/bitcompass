/**
 * CLI command registration tests.
 *
 * Verifies all expected commands and subcommands are registered with the
 * correct names and options by parsing `bitcompass --help` output.
 * This catches regressions where a command import breaks or a new command
 * isn't wired up.
 */

import { describe, test, expect } from 'bun:test';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_ENTRY = join(__dirname, '..', 'index.ts');

function runCli(args: string): string {
  try {
    return execSync(`bun ${CLI_ENTRY} ${args}`, {
      encoding: 'utf-8',
      timeout: 15_000,
      env: {
        ...process.env,
        BITCOMPASS_CONFIG_DIR: join(__dirname, '__test_config_cli__'),
        NO_COLOR: '1',
      },
    });
  } catch (e) {
    // Commander exits with code 0 for --help but execSync may still throw
    const err = e as { stdout?: string; stderr?: string };
    return (err.stdout ?? '') + (err.stderr ?? '');
  }
}

describe('CLI command registration', () => {
  test('main help lists all top-level commands', () => {
    const output = runCli('--help');

    const expectedCommands = [
      'login',
      'logout',
      'whoami',
      'glossary',
      'share',
      'setup',
      'init',
      'update',
      'sync',
      'config',
      'project',
      'group',
      'rules',
      'docs',
      'skills',
      'commands',
      'mcp',
      'migrate',
      'self-update',
    ];

    for (const cmd of expectedCommands) {
      expect(output).toContain(cmd);
    }
  });

  test('setup command is registered', () => {
    const output = runCli('setup --help');
    expect(output).toContain('Quick onboarding');
    expect(output).toContain('login');
    expect(output).toContain('init');
    expect(output).toContain('sync');
  });

  test('rules subcommands are listed', () => {
    const output = runCli('rules --help');
    expect(output).toContain('search');
    expect(output).toContain('list');
    expect(output).toContain('pull');
    expect(output).toContain('push');
  });

  test('skills subcommands are listed', () => {
    const output = runCli('skills --help');
    expect(output).toContain('search');
    expect(output).toContain('list');
    expect(output).toContain('pull');
    expect(output).toContain('push');
  });

  test('commands subcommands are listed', () => {
    const output = runCli('commands --help');
    expect(output).toContain('search');
    expect(output).toContain('list');
    expect(output).toContain('pull');
    expect(output).toContain('push');
  });

  test('docs subcommands are listed', () => {
    const output = runCli('docs --help');
    expect(output).toContain('search');
    expect(output).toContain('list');
    expect(output).toContain('pull');
    expect(output).toContain('push');
  });

  test('config subcommands are listed', () => {
    const output = runCli('config --help');
    expect(output).toContain('list');
    expect(output).toContain('set');
    expect(output).toContain('get');
    expect(output).toContain('push');
    expect(output).toContain('pull');
  });

  test('mcp subcommands are listed', () => {
    const output = runCli('mcp --help');
    expect(output).toContain('start');
    expect(output).toContain('status');
  });

  test('sync command has expected options', () => {
    const output = runCli('sync --help');
    expect(output).toContain('--check');
    expect(output).toContain('--all');
    expect(output).toContain('--yes');
    expect(output).toContain('--prune');
    expect(output).toContain('--global');
  });

  test('update command has expected options', () => {
    const output = runCli('update --help');
    expect(output).toContain('--check');
    expect(output).toContain('--all');
    expect(output).toContain('--yes');
    expect(output).toContain('--global');
    expect(output).toContain('--kind');
  });

  test('share command has expected options', () => {
    const output = runCli('share --help');
    expect(output).toContain('--kind');
    expect(output).toContain('--project-id');
    expect(output).toContain('--special-file');
  });

  test('version flag works', () => {
    const output = runCli('-v');
    // Should contain a semver-like version number
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });
});
