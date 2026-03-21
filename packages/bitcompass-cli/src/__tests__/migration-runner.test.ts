import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Migration } from '../migrations/types.js';

describe('migration-runner', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `bitcompass-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('fresh install writes current version and runs no migrations', async () => {
    const { runMigrations } = await import('../lib/migration-runner.js');
    const ran: string[] = [];
    const fakeMigrations: Migration[] = [
      {
        version: '0.16.0',
        description: 'test migration',
        scope: 'global',
        migrate: async () => { ran.push('0.16.0'); },
      },
    ];

    await runMigrations({
      currentVersion: '0.16.0',
      migrations: fakeMigrations,
      globalStateDir: tempDir,
    });

    expect(ran).toEqual([]);
    const state = JSON.parse(readFileSync(join(tempDir, 'migration-state.json'), 'utf-8'));
    expect(state.lastMigratedVersion).toBe('0.16.0');
  });

  test('runs pending global migrations in order', async () => {
    const { runMigrations } = await import('../lib/migration-runner.js');
    writeFileSync(join(tempDir, 'migration-state.json'), JSON.stringify({ lastMigratedVersion: '0.15.0' }));

    const ran: string[] = [];
    const fakeMigrations: Migration[] = [
      {
        version: '0.15.0',
        description: 'old migration',
        scope: 'global',
        migrate: async () => { ran.push('0.15.0'); },
      },
      {
        version: '0.16.0',
        description: 'new migration',
        scope: 'global',
        migrate: async () => { ran.push('0.16.0'); },
      },
      {
        version: '0.17.0',
        description: 'newer migration',
        scope: 'global',
        migrate: async () => { ran.push('0.17.0'); },
      },
    ];

    await runMigrations({
      currentVersion: '0.17.0',
      migrations: fakeMigrations,
      globalStateDir: tempDir,
    });

    expect(ran).toEqual(['0.16.0', '0.17.0']);
    const state = JSON.parse(readFileSync(join(tempDir, 'migration-state.json'), 'utf-8'));
    expect(state.lastMigratedVersion).toBe('0.17.0');
  });

  test('stops on first failure and preserves last successful state', async () => {
    const { runMigrations } = await import('../lib/migration-runner.js');
    writeFileSync(join(tempDir, 'migration-state.json'), JSON.stringify({ lastMigratedVersion: '0.14.0' }));

    const ran: string[] = [];
    const fakeMigrations: Migration[] = [
      {
        version: '0.15.0',
        description: 'succeeds',
        scope: 'global',
        migrate: async () => { ran.push('0.15.0'); },
      },
      {
        version: '0.16.0',
        description: 'fails',
        scope: 'global',
        migrate: async () => { throw new Error('boom'); },
      },
      {
        version: '0.17.0',
        description: 'should not run',
        scope: 'global',
        migrate: async () => { ran.push('0.17.0'); },
      },
    ];

    const result = await runMigrations({
      currentVersion: '0.17.0',
      migrations: fakeMigrations,
      globalStateDir: tempDir,
    });

    expect(ran).toEqual(['0.15.0']);
    expect(result.success).toBe(false);
    expect(result.failedVersion).toBe('0.16.0');
    const state = JSON.parse(readFileSync(join(tempDir, 'migration-state.json'), 'utf-8'));
    expect(state.lastMigratedVersion).toBe('0.15.0');
  });

  test('skips project-scoped migrations when no project config', async () => {
    const { runMigrations } = await import('../lib/migration-runner.js');
    writeFileSync(join(tempDir, 'migration-state.json'), JSON.stringify({ lastMigratedVersion: '0.15.0' }));

    const ran: string[] = [];
    const fakeMigrations: Migration[] = [
      {
        version: '0.16.0',
        description: 'project migration',
        scope: 'project',
        migrate: async () => { ran.push('0.16.0'); },
      },
    ];

    await runMigrations({
      currentVersion: '0.16.0',
      migrations: fakeMigrations,
      globalStateDir: tempDir,
      projectConfigVersion: undefined,
    });

    expect(ran).toEqual([]);
  });

  test('existing config dir but no state file triggers migrations from oldest', async () => {
    const { runMigrations } = await import('../lib/migration-runner.js');
    writeFileSync(join(tempDir, 'config.json'), '{}');

    const ran: string[] = [];
    const fakeMigrations: Migration[] = [
      {
        version: '0.16.0',
        description: 'migration',
        scope: 'global',
        migrate: async () => { ran.push('0.16.0'); },
      },
    ];

    await runMigrations({
      currentVersion: '0.16.0',
      migrations: fakeMigrations,
      globalStateDir: tempDir,
      existingConfigDir: true,
    });

    expect(ran).toEqual(['0.16.0']);
  });

  test('runs project-scoped migrations when projectConfigVersion is older', async () => {
    const { runMigrations } = await import('../lib/migration-runner.js');
    writeFileSync(join(tempDir, 'migration-state.json'), JSON.stringify({ lastMigratedVersion: '0.16.0' }));

    const ran: string[] = [];
    const fakeMigrations: Migration[] = [
      {
        version: '0.16.0',
        description: 'project migration',
        scope: 'project',
        migrate: async () => { ran.push('project-0.16.0'); },
      },
    ];

    await runMigrations({
      currentVersion: '0.16.0',
      migrations: fakeMigrations,
      globalStateDir: tempDir,
      projectConfigVersion: '0.15.0',
    });

    expect(ran).toEqual(['project-0.16.0']);
  });

  test('runs mixed global and project migrations in registry order', async () => {
    const { runMigrations } = await import('../lib/migration-runner.js');
    writeFileSync(join(tempDir, 'migration-state.json'), JSON.stringify({ lastMigratedVersion: '0.14.0' }));

    const ran: string[] = [];
    const fakeMigrations: Migration[] = [
      {
        version: '0.15.0',
        description: 'global first',
        scope: 'global',
        migrate: async () => { ran.push('global-0.15.0'); },
      },
      {
        version: '0.16.0',
        description: 'project second',
        scope: 'project',
        migrate: async () => { ran.push('project-0.16.0'); },
      },
      {
        version: '0.16.0',
        description: 'global third',
        scope: 'global',
        migrate: async () => { ran.push('global-0.16.0'); },
      },
    ];

    await runMigrations({
      currentVersion: '0.16.0',
      migrations: fakeMigrations,
      globalStateDir: tempDir,
      projectConfigVersion: '0.14.0',
    });

    expect(ran).toEqual(['global-0.15.0', 'project-0.16.0', 'global-0.16.0']);
  });
});
