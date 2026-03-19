/**
 * Unit tests for project-config module.
 *
 * Tests the pure logic parts: constants, path resolution, kind subfolders.
 */

import { describe, test, expect } from 'bun:test';
import {
  EDITOR_BASE_PATHS,
  KIND_SUBFOLDERS,
  SPECIAL_FILE_TARGETS,
} from '../auth/project-config.js';

describe('project-config constants', () => {
  test('EDITOR_BASE_PATHS covers all editors', () => {
    expect(EDITOR_BASE_PATHS.cursor).toBe('.cursor/');
    expect(EDITOR_BASE_PATHS.claudecode).toBe('.claude/');
    expect(EDITOR_BASE_PATHS.vscode).toBe('.vscode/');
    expect(EDITOR_BASE_PATHS.antigrativity).toBe('.antigrativity/');
  });

  test('KIND_SUBFOLDERS covers all 4 kinds', () => {
    expect(KIND_SUBFOLDERS.rule).toBe('rules');
    expect(KIND_SUBFOLDERS.skill).toBe('skills');
    expect(KIND_SUBFOLDERS.command).toBe('commands');
    expect(KIND_SUBFOLDERS.documentation).toBe('docs');
  });

  test('SPECIAL_FILE_TARGETS has expected entries', () => {
    expect(SPECIAL_FILE_TARGETS['claude.md'].path).toBe('CLAUDE.md');
    expect(SPECIAL_FILE_TARGETS['agents.md'].path).toBe('AGENTS.md');
    expect(SPECIAL_FILE_TARGETS['cursorrules'].path).toBe('.cursorrules');
    expect(SPECIAL_FILE_TARGETS['copilot-instructions'].path).toBe('.github/copilot-instructions.md');
    expect(SPECIAL_FILE_TARGETS['windsurfrules'].path).toBe('.windsurfrules');
  });

  test('no duplicate paths in SPECIAL_FILE_TARGETS', () => {
    const paths = Object.values(SPECIAL_FILE_TARGETS).map((t) => t.path);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });
});
