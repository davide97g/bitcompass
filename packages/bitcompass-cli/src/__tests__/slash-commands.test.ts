/**
 * Slash command file validation tests.
 *
 * Ensures the Claude Code command files exist, have correct structure,
 * and reference the expected MCP tools / CLI commands.
 */

import { describe, test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const COMMANDS_DIR = join(REPO_ROOT, '.claude', 'commands');

describe('slash commands', () => {
  const commandFiles = ['share.md', 'update-content.md', 'pull-content.md', 'sync-project.md'];

  for (const file of commandFiles) {
    test(`${file} exists`, () => {
      expect(existsSync(join(COMMANDS_DIR, file))).toBe(true);
    });
  }

  test('share.md references post-rules and search-rules', () => {
    const content = readFileSync(join(COMMANDS_DIR, 'share.md'), 'utf-8');
    expect(content).toContain('post-rules');
    expect(content).toContain('search-rules');
    expect(content).toContain('pull-rule');
    expect(content).toContain('duplicate');
  });

  test('update-content.md references update-rule and get-rule', () => {
    const content = readFileSync(join(COMMANDS_DIR, 'update-content.md'), 'utf-8');
    expect(content).toContain('update-rule');
    expect(content).toContain('get-rule');
    expect(content).toContain('search-rules');
    expect(content).toContain('pull-rule');
  });

  test('pull-content.md references pull-rule and search', () => {
    const content = readFileSync(join(COMMANDS_DIR, 'pull-content.md'), 'utf-8');
    expect(content).toContain('pull-rule');
    expect(content).toContain('search-rules');
    expect(content).toContain('search-solutions');
  });

  test('sync-project.md references bitcompass sync CLI', () => {
    const content = readFileSync(join(COMMANDS_DIR, 'sync-project.md'), 'utf-8');
    expect(content).toContain('bitcompass sync');
    expect(content).toContain('--check');
    expect(content).toContain('--all');
    expect(content).toContain('--prune');
  });
});
