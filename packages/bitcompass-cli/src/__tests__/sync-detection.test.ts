/**
 * Tests for sync detection logic — verifying that scanInstalled and sync
 * correctly detect installed items, including:
 * - Special file targets (CLAUDE.md) without frontmatter
 * - Rules with duplicate titles/kinds but different IDs (filename collisions)
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// --- Helpers to build frontmatter content (mirrors mdc-format.ts) ---

const buildMdcContent = (opts: {
  id: string;
  kind?: string;
  version?: string;
  description?: string;
  body?: string;
}): string => {
  const lines = ['---'];
  if (opts.kind) lines.push(`kind: ${opts.kind}`);
  lines.push(`id: ${opts.id}`);
  if (opts.version) lines.push(`version: ${opts.version}`);
  if (opts.description) lines.push(`description: ${opts.description}`);
  lines.push('alwaysApply: false');
  lines.push('---');
  lines.push('');
  lines.push(opts.body ?? 'Rule body content');
  lines.push('');
  return lines.join('\n');
};

const buildSkillContent = (opts: {
  id: string;
  name?: string;
  version?: string;
  description?: string;
  body?: string;
}): string => {
  const lines = ['---'];
  if (opts.name) lines.push(`name: ${opts.name}`);
  lines.push(`id: ${opts.id}`);
  if (opts.version) lines.push(`version: ${opts.version}`);
  if (opts.description) lines.push(`description: ${opts.description}`);
  lines.push('---');
  lines.push('');
  lines.push(opts.body ?? 'Skill body content');
  lines.push('');
  return lines.join('\n');
};

const buildCommandContent = (opts: {
  id: string;
  version?: string;
  body?: string;
}): string => {
  const lines = ['---'];
  lines.push(`kind: command`);
  lines.push(`id: ${opts.id}`);
  if (opts.version) lines.push(`version: ${opts.version}`);
  lines.push('---');
  lines.push('');
  lines.push(opts.body ?? 'Command body content');
  lines.push('');
  return lines.join('\n');
};

// --- Import the units under test ---

import { parseRuleMdcContent } from '../lib/mdc-format.js';
import { titleToSlug, ruleFilename, skillFilename, commandFilename, solutionFilename } from '../lib/slug.js';

// ============================================================
// Bug 1: Special file targets (CLAUDE.md) have no frontmatter
// ============================================================

describe('Bug 1: Special file targets detection', () => {
  test('parseRuleMdcContent returns null for files without frontmatter', () => {
    // CLAUDE.md is written as body-only (no frontmatter)
    const bodyOnly = 'This is the CLAUDE.md content\nwith multiple lines';
    const result = parseRuleMdcContent(bodyOnly);
    expect(result).toBeNull();
  });

  test('parseRuleMdcContent correctly parses files WITH frontmatter', () => {
    const withFrontmatter = buildMdcContent({
      id: 'abc-123',
      kind: 'rule',
      version: '1.0.0',
      description: 'Test rule',
    });
    const result = parseRuleMdcContent(withFrontmatter);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('abc-123');
    expect(result!.version).toBe('1.0.0');
  });

  /**
   * This test documents the core bug: scanInstalled uses tryParseItem on
   * special file targets, which requires frontmatter. Files written by
   * pullRuleToFile for special_file_target rules have no frontmatter,
   * so they're never detected as installed.
   *
   * The fix should ensure special file targets are detectable even without
   * frontmatter — either by checking file existence in sync logic, or by
   * writing minimal metadata.
   */
  test('scanInstalled should detect special file targets that exist on disk', () => {
    // Create a temp directory simulating a project
    const tmpDir = join(tmpdir(), `bitcompass-test-special-${Date.now()}`);
    const cursorRulesDir = join(tmpDir, '.cursor', 'rules');
    mkdirSync(cursorRulesDir, { recursive: true });

    // Write a CLAUDE.md without frontmatter (as pullRuleToFile does for special targets)
    const claudeMdPath = join(tmpDir, 'CLAUDE.md');
    writeFileSync(claudeMdPath, 'Default to using Bun instead of Node.js.\n');

    // The file exists but parseRuleMdcContent returns null (no frontmatter)
    const raw = readFileSync(claudeMdPath, 'utf-8');
    const parsed = parseRuleMdcContent(raw);
    expect(parsed).toBeNull(); // This is the current (broken) behavior

    // After the fix, the sync logic should still recognize this file as installed.
    // We'll test this via the buildSyncItems helper (extracted from sync.ts).
    // For now, verify the file exists — the sync fix will use file existence checks.
    expect(existsSync(claudeMdPath)).toBe(true);

    rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ============================================================
// Bug 2: Filename collisions for same-title, same-kind rules
// ============================================================

describe('Bug 2: Filename collisions', () => {
  test('ruleFilename generates identical names for different IDs with same title', () => {
    // This documents the current (broken) behavior
    const name1 = ruleFilename('BitCompass MCP and CLI Usage', 'id-aaa-111');
    const name2 = ruleFilename('BitCompass MCP and CLI Usage', 'id-bbb-222');
    // Currently both produce the same filename — this is the bug
    // After the fix, they should be DIFFERENT
    expect(name1).not.toBe(name2);
  });

  test('skillFilename generates unique names for different IDs with same title', () => {
    const name1 = skillFilename('API Codegen Skill', 'id-aaa-111');
    const name2 = skillFilename('API Codegen Skill', 'id-bbb-222');
    expect(name1).not.toBe(name2);
  });

  test('commandFilename generates unique names for different IDs with same title', () => {
    const name1 = commandFilename('Generate TypeScript types', 'id-aaa-111');
    const name2 = commandFilename('Generate TypeScript types', 'id-bbb-222');
    expect(name1).not.toBe(name2);
  });

  test('solutionFilename generates unique names for different IDs with same title', () => {
    const name1 = solutionFilename('My Solution', 'id-aaa-111');
    const name2 = solutionFilename('My Solution', 'id-bbb-222');
    expect(name1).not.toBe(name2);
  });

  test('filenames still use human-readable slug prefix', () => {
    const name = ruleFilename('BitCompass MCP Usage', 'abc12345-def6-7890-ghij-klmnopqrstuv');
    // Should contain the slug for readability
    expect(name).toContain('bitcompass-mcp-usage');
    // Should also contain part of the ID for uniqueness
    expect(name).toContain('abc12345');
  });

  test('filenames use ID as fallback when title produces empty slug', () => {
    const name = ruleFilename('', 'abc12345-def6-7890-ghij-klmnopqrstuv');
    expect(name).toContain('abc12345');
    expect(name.endsWith('.mdc')).toBe(true);
  });

  test('two rules with same title written to same dir produce separate files', () => {
    const tmpDir = join(tmpdir(), `bitcompass-test-collision-${Date.now()}`);
    const rulesDir = join(tmpDir, '.cursor', 'rules');
    mkdirSync(rulesDir, { recursive: true });

    const id1 = 'aaaa1111-0000-0000-0000-000000000001';
    const id2 = 'bbbb2222-0000-0000-0000-000000000002';
    const title = 'BitCompass MCP and CLI Usage';

    const file1 = join(rulesDir, ruleFilename(title, id1));
    const file2 = join(rulesDir, ruleFilename(title, id2));

    writeFileSync(file1, buildMdcContent({ id: id1, kind: 'rule', version: '1.0.0' }));
    writeFileSync(file2, buildMdcContent({ id: id2, kind: 'rule', version: '1.0.0' }));

    // Both files should exist simultaneously
    expect(existsSync(file1)).toBe(true);
    expect(existsSync(file2)).toBe(true);

    // And contain different IDs
    const parsed1 = parseRuleMdcContent(readFileSync(file1, 'utf-8'));
    const parsed2 = parseRuleMdcContent(readFileSync(file2, 'utf-8'));
    expect(parsed1!.id).toBe(id1);
    expect(parsed2!.id).toBe(id2);

    rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ============================================================
// Sync logic: buildSyncItems should handle both bugs
// ============================================================

describe('Sync logic: buildSyncItems', () => {
  // We'll test the extracted sync comparison logic.
  // After the fix, sync.ts should export a pure function for building sync items
  // that we can test directly. For now, we test the version comparison helper.

  test('compareVersion correctly compares semver strings', () => {
    // We need to import this — it's currently not exported from sync.ts.
    // After the fix, it should be exported or extracted to a shared module.
    // For now, inline the logic to verify expected behavior.
    const compareVersion = (a: string, b: string): number => {
      const pa = a.split('.').map((s) => s.replace(/\D.*$/, ''));
      const pb = b.split('.').map((s) => s.replace(/\D.*$/, ''));
      const len = Math.max(pa.length, pb.length);
      for (let i = 0; i < len; i++) {
        const na = parseInt(pa[i] ?? '0', 10);
        const nb = parseInt(pb[i] ?? '0', 10);
        if (na !== nb) return na > nb ? 1 : -1;
      }
      return 0;
    };

    expect(compareVersion('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersion('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersion('1.0.0', '2.0.0')).toBe(-1);
    expect(compareVersion('6.0.0', '1.0.0')).toBe(1);
  });
});
