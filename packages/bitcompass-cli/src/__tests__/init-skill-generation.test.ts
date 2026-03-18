/**
 * Tests that init.ts generates a usage skill (not a rule).
 *
 * We can't run the full interactive init, but we can verify the skill template
 * content by importing it from the source and checking the inline string,
 * or by reading the generated file from the SKILL.md already in the repo.
 */

import { describe, test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

describe('init skill generation', () => {
  test('skill file exists in .claude/skills/bitcompass-usage/', () => {
    const skillPath = join(REPO_ROOT, '.claude', 'skills', 'bitcompass-usage', 'SKILL.md');
    expect(existsSync(skillPath)).toBe(true);
  });

  test('skill file has correct frontmatter', () => {
    const skillPath = join(REPO_ROOT, '.claude', 'skills', 'bitcompass-usage', 'SKILL.md');
    const content = readFileSync(skillPath, 'utf-8');

    expect(content).toContain('---');
    expect(content).toContain('name: bitcompass-usage');
    expect(content).toContain('description:');
  });

  test('skill file documents all MCP tools', () => {
    const skillPath = join(REPO_ROOT, '.claude', 'skills', 'bitcompass-usage', 'SKILL.md');
    const content = readFileSync(skillPath, 'utf-8');

    const expectedTools = [
      'search-rules',
      'search-solutions',
      'post-rules',
      'get-rule',
      'list-rules',
      'update-rule',
      'delete-rule',
      'pull-rule',
      'pull-group',
    ];

    for (const tool of expectedTools) {
      expect(content).toContain(tool);
    }
  });

  test('skill file documents slash commands', () => {
    const skillPath = join(REPO_ROOT, '.claude', 'skills', 'bitcompass-usage', 'SKILL.md');
    const content = readFileSync(skillPath, 'utf-8');

    expect(content).toContain('/share');
    expect(content).toContain('/update-content');
    expect(content).toContain('/pull-content');
    expect(content).toContain('/sync-project');
  });

  test('skill file documents setup command', () => {
    const skillPath = join(REPO_ROOT, '.claude', 'skills', 'bitcompass-usage', 'SKILL.md');
    const content = readFileSync(skillPath, 'utf-8');

    expect(content).toContain('bitcompass setup');
  });

  test('skill file documents multi-editor support', () => {
    const skillPath = join(REPO_ROOT, '.claude', 'skills', 'bitcompass-usage', 'SKILL.md');
    const content = readFileSync(skillPath, 'utf-8');

    expect(content).toContain('.cursor/');
    expect(content).toContain('.claude/');
    expect(content).toContain('.vscode/');
  });

  test('skill file documents special files', () => {
    const skillPath = join(REPO_ROOT, '.claude', 'skills', 'bitcompass-usage', 'SKILL.md');
    const content = readFileSync(skillPath, 'utf-8');

    expect(content).toContain('claude.md');
    expect(content).toContain('CLAUDE.md');
    expect(content).toContain('cursorrules');
    expect(content).toContain('copilot-instructions');
  });

  test('init.ts no longer generates old rule file path', () => {
    // The init command should generate a skill, not a rule.
    // We verify this via source code inspection (the old rule file may be
    // manually re-added by other tools, so we check the source instead).
    const initPath = join(__dirname, '..', 'commands', 'init.ts');
    const content = readFileSync(initPath, 'utf-8');
    expect(content).not.toContain("rule-bitcompass-mcp-and-cli-usage");
  });

  test('init.ts source references skill path, not rule path', () => {
    const initPath = join(__dirname, '..', 'commands', 'init.ts');
    const content = readFileSync(initPath, 'utf-8');

    // Should contain skill generation
    expect(content).toContain('bitcompass-usage');
    expect(content).toContain('SKILL.md');
    expect(content).toContain('Usage skill');

    // Should NOT contain old rule generation
    expect(content).not.toContain("'Usage rule:'");
    expect(content).not.toContain('rule-bitcompass-mcp-and-cli-usage');
  });
});
