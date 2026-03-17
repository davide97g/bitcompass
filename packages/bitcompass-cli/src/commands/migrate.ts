import chalk from 'chalk';
import { existsSync, mkdirSync, readFileSync, readdirSync, lstatSync, readlinkSync, symlinkSync, writeFileSync, unlinkSync } from 'fs';
import { basename, dirname, join } from 'path';
import { getRuleById } from '../api/client.js';
import { isLoggedIn } from '../auth/config.js';
import {
  CURRENT_CONFIG_VERSION,
  EDITOR_BASE_PATHS,
  KIND_SUBFOLDERS,
  SPECIAL_FILE_TARGETS,
  loadProjectConfig,
  saveProjectConfig,
} from '../auth/project-config.js';
import { parseRuleMdcContent } from '../lib/mdc-format.js';
import { titleToSlug } from '../lib/slug.js';
import { scanInstalled } from '../lib/installed-scan.js';
import { createSpinner } from '../lib/spinner.js';
import type { EditorProvider } from '../types.js';

interface MigrationSummary {
  moved: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Migrate project files from older BitCompass versions to current layout.
 * Safe: copy-then-delete, idempotent, verifies new file exists before removing old.
 */
export const runMigrate = async (opts?: { dryRun?: boolean }): Promise<void> => {
  const dryRun = opts?.dryRun ?? false;
  const config = loadProjectConfig();

  if (!config) {
    console.error(chalk.red('No project config found. Run "bitcompass init" first.'));
    process.exit(1);
  }

  if (config.configVersion !== undefined && config.configVersion >= CURRENT_CONFIG_VERSION) {
    console.log(chalk.green('Already up to date.'));
    return;
  }

  const cwd = process.cwd();
  const editors: EditorProvider[] = config.editors?.length ? config.editors : [config.editor];
  const summary: MigrationSummary = { moved: [], skipped: [], errors: [] };

  if (dryRun) {
    console.log(chalk.bold('Dry run — no files will be changed.\n'));
  }

  // ── Step A: Migrate flat skill files → subdirectories ──
  const spinnerA = dryRun ? null : createSpinner('Migrating flat skill files…');
  for (const editor of editors) {
    const basePath = EDITOR_BASE_PATHS[editor];
    const skillsDir = join(cwd, basePath, KIND_SUBFOLDERS.skill);
    if (!existsSync(skillsDir)) continue;

    let entries;
    try {
      entries = readdirSync(skillsDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.name.endsWith('.md')) continue;
      // Only process flat files (not directories or SKILL.md inside subdirs)
      const entryPath = join(skillsDir, entry.name);
      const stat = lstatSync(entryPath);
      if (!stat.isFile() && !stat.isSymbolicLink()) continue;

      // Parse frontmatter to get slug/name and id
      let raw: string;
      let targetPath: string;
      try {
        if (stat.isSymbolicLink()) {
          // Read the actual content via the symlink
          raw = readFileSync(entryPath, 'utf-8');
        } else {
          raw = readFileSync(entryPath, 'utf-8');
        }
      } catch (err) {
        summary.errors.push(`Could not read ${entryPath}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }

      const parsed = parseRuleMdcContent(raw);
      const slug = parsed?.id
        ? (titleToSlug(parsed.description || basename(entry.name, '.md')) || parsed.id)
        : basename(entry.name, '.md');

      targetPath = join(skillsDir, slug, 'SKILL.md');

      // Check if target already exists with same id
      if (existsSync(targetPath)) {
        try {
          const existingRaw = readFileSync(targetPath, 'utf-8');
          const existingParsed = parseRuleMdcContent(existingRaw);
          if (existingParsed?.id && parsed?.id && existingParsed.id === parsed.id) {
            summary.skipped.push(`${entryPath} (already migrated)`);
            continue;
          }
        } catch { /* proceed with migration */ }
      }

      if (dryRun) {
        console.log(`  ${chalk.cyan('move')} ${entryPath} → ${targetPath}`);
        summary.moved.push(entryPath);
        continue;
      }

      try {
        // Create subdirectory
        mkdirSync(dirname(targetPath), { recursive: true });

        if (stat.isSymbolicLink()) {
          // Recreate symlink in new location
          const linkTarget = readlinkSync(entryPath);
          symlinkSync(linkTarget, targetPath);
        } else {
          // Copy content to new location
          writeFileSync(targetPath, raw, 'utf-8');
        }

        // Verify new file exists before removing old
        if (existsSync(targetPath)) {
          unlinkSync(entryPath);
          summary.moved.push(`${entryPath} → ${targetPath}`);
        } else {
          summary.errors.push(`Failed to verify ${targetPath} after write`);
        }
      } catch (err) {
        summary.errors.push(`Error migrating ${entryPath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  spinnerA?.succeed('Skill files migrated.');

  // ── Step B: Relocate special files → correct paths ──
  const spinnerB = dryRun ? null : createSpinner('Checking special files…');

  if (isLoggedIn()) {
    try {
      const installed = scanInstalled({ global: false });
      for (const item of installed) {
        let rule;
        try {
          rule = await getRuleById(item.id);
        } catch {
          continue;
        }
        if (!rule?.special_file_target) continue;

        const targetInfo = SPECIAL_FILE_TARGETS[rule.special_file_target];
        if (!targetInfo) continue;

        const correctPath = join(cwd, targetInfo.path);

        // Only migrate if item is currently inside an editor subfolder
        const isInEditorDir = editors.some((editor) => {
          const editorBase = join(cwd, EDITOR_BASE_PATHS[editor]);
          return item.path.startsWith(editorBase);
        });
        if (!isInEditorDir) continue;

        // Don't overwrite if correct path already exists with same content
        if (existsSync(correctPath)) {
          summary.skipped.push(`${item.path} → ${correctPath} (target already exists)`);
          continue;
        }

        if (dryRun) {
          console.log(`  ${chalk.cyan('move')} ${item.path} → ${correctPath} (special: ${rule.special_file_target})`);
          summary.moved.push(item.path);
          continue;
        }

        try {
          // Read body content, strip frontmatter (write body only for special files)
          const raw = readFileSync(item.path, 'utf-8');
          const parsed = parseRuleMdcContent(raw);
          const bodyContent = parsed?.body ?? raw;

          // Ensure parent directory exists
          mkdirSync(dirname(correctPath), { recursive: true });
          writeFileSync(correctPath, bodyContent, 'utf-8');

          // Verify and remove old
          if (existsSync(correctPath)) {
            unlinkSync(item.path);
            summary.moved.push(`${item.path} → ${correctPath}`);
          } else {
            summary.errors.push(`Failed to verify ${correctPath} after write`);
          }
        } catch (err) {
          summary.errors.push(`Error relocating ${item.path}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      summary.errors.push(`Could not scan installed items: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    // Fallback: heuristic matching against SPECIAL_FILE_TARGETS keys
    for (const editor of editors) {
      const editorBase = join(cwd, EDITOR_BASE_PATHS[editor]);
      const rulesDir = join(editorBase, KIND_SUBFOLDERS.rule);
      if (!existsSync(rulesDir)) continue;

      for (const [targetKey, targetInfo] of Object.entries(SPECIAL_FILE_TARGETS)) {
        // Check common filename patterns
        const possibleNames = [
          targetInfo.path.replace(/\//g, '-'), // e.g. CLAUDE.md
          basename(targetInfo.path),            // e.g. CLAUDE.md
        ];
        for (const name of possibleNames) {
          const candidatePath = join(rulesDir, name);
          if (!existsSync(candidatePath)) continue;

          const correctPath = join(cwd, targetInfo.path);
          if (existsSync(correctPath)) {
            summary.skipped.push(`${candidatePath} → ${correctPath} (target already exists)`);
            continue;
          }

          if (dryRun) {
            console.log(`  ${chalk.cyan('move')} ${candidatePath} → ${correctPath} (special: ${targetKey}, heuristic)`);
            summary.moved.push(candidatePath);
            continue;
          }

          try {
            const raw = readFileSync(candidatePath, 'utf-8');
            const parsed = parseRuleMdcContent(raw);
            const bodyContent = parsed?.body ?? raw;

            mkdirSync(dirname(correctPath), { recursive: true });
            writeFileSync(correctPath, bodyContent, 'utf-8');

            if (existsSync(correctPath)) {
              unlinkSync(candidatePath);
              summary.moved.push(`${candidatePath} → ${correctPath}`);
            }
          } catch (err) {
            summary.errors.push(`Error relocating ${candidatePath}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
    }

    if (!dryRun) {
      console.log(chalk.dim('  Not logged in — special file detection used filename heuristics only.'));
      console.log(chalk.dim('  Run "bitcompass login" and "bitcompass migrate" again for full API-based detection.'));
    }
  }
  spinnerB?.succeed('Special files checked.');

  // ── Step C: Update configVersion ──
  if (!dryRun) {
    config.configVersion = CURRENT_CONFIG_VERSION;
    saveProjectConfig(config);
  }

  // ── Summary ──
  console.log('');
  if (summary.moved.length > 0) {
    console.log(chalk.green(`Moved: ${summary.moved.length} file(s)`));
    for (const m of summary.moved) {
      console.log(chalk.dim(`  ${m}`));
    }
  }
  if (summary.skipped.length > 0) {
    console.log(chalk.yellow(`Skipped: ${summary.skipped.length} file(s)`));
    for (const s of summary.skipped) {
      console.log(chalk.dim(`  ${s}`));
    }
  }
  if (summary.errors.length > 0) {
    console.log(chalk.red(`Errors: ${summary.errors.length}`));
    for (const e of summary.errors) {
      console.log(chalk.red(`  ${e}`));
    }
  }
  if (summary.moved.length === 0 && summary.skipped.length === 0 && summary.errors.length === 0) {
    console.log(chalk.green('No files needed migration.'));
  }
  if (dryRun) {
    console.log(chalk.dim('\nDry run complete. Run "bitcompass migrate" to apply changes.'));
  } else {
    console.log(chalk.green('\nMigration complete.'));
  }
};
