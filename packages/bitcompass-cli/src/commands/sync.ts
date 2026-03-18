import chalk from 'chalk';
import { unlinkSync } from 'fs';
import inquirer from 'inquirer';
import {
  fetchRules,
  getCompassProjectById,
} from '../api/client.js';
import { loadCredentials } from '../auth/config.js';
import { getProjectConfig, loadProjectConfig } from '../auth/project-config.js';
import { scanInstalled } from '../lib/installed-scan.js';
import { pullRuleToFile } from '../lib/rule-file-ops.js';
import { createSpinner } from '../lib/spinner.js';
import type { Rule, RuleKind } from '../types.js';

export interface SyncOptions {
  all?: boolean;
  yes?: boolean;
  check?: boolean;
  prune?: boolean;
  global?: boolean;
}

type ItemStatus = 'new' | 'update' | 'up-to-date' | 'removed';

interface SyncItem {
  id: string;
  kind: RuleKind;
  title: string;
  localVersion: string | null;
  remoteVersion: string | null;
  status: ItemStatus;
  path?: string;
}

const STATUS_ICON: Record<ItemStatus, string> = {
  'new': chalk.green('+ new'),
  'update': chalk.cyan('↑ update'),
  'up-to-date': chalk.dim('✓ ok'),
  'removed': chalk.yellow('- removed'),
};

const kindLabel = (k: RuleKind): string =>
  k === 'rule' ? 'rule' : k === 'solution' ? 'solution' : k === 'skill' ? 'skill' : 'command';

function formatVersion(v: string | null): string {
  return v != null && v !== '' ? v : '—';
}

function printSyncTable(items: SyncItem[]): void {
  if (items.length === 0) return;

  const kindWidth = 10;
  const titleWidth = Math.min(40, Math.max(16, ...items.map((i) => i.title.length)));
  const vWidth = 10;
  const statusWidth = 12;

  console.log(
    '  ' +
      chalk.dim('Kind'.padEnd(kindWidth)) +
      chalk.dim('Name'.padEnd(titleWidth)) +
      chalk.dim('Local'.padEnd(vWidth)) +
      chalk.dim('Remote'.padEnd(vWidth)) +
      chalk.dim('Status')
  );
  console.log('  ' + chalk.dim('─'.repeat(kindWidth + titleWidth + vWidth * 2 + statusWidth)));

  for (const item of items) {
    const kind = kindLabel(item.kind).padEnd(kindWidth);
    const title =
      item.title.length > titleWidth
        ? item.title.slice(0, titleWidth - 1) + '…'
        : item.title.padEnd(titleWidth);
    const local = formatVersion(item.localVersion).padEnd(vWidth);
    const remote = formatVersion(item.remoteVersion).padEnd(vWidth);
    const statusStr = STATUS_ICON[item.status];

    console.log('  ' + chalk.dim(kind) + title + '  ' + local + '  ' + remote + '  ' + statusStr);
  }
  console.log('');
}

/**
 * Simple semver compare: 1 if a > b, -1 if a < b, 0 if equal.
 */
function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map((s) => s.replace(/\D.*$/, ''));
  const pb = b.split('.').map((s) => s.replace(/\D.*$/, ''));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = parseInt(pa[i] ?? '0', 10);
    const nb = parseInt(pb[i] ?? '0', 10);
    if (na !== nb) return na > nb ? 1 : -1;
  }
  return 0;
}

export const runSync = async (options: SyncOptions): Promise<void> => {
  // 1. Auth check
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }

  // 2. Project detection
  const projectConfig = loadProjectConfig();
  if (!projectConfig) {
    console.error(chalk.red('No project config found. Run ' + chalk.cyan('bitcompass init') + ' first.'));
    process.exit(1);
  }
  const projectId = projectConfig.compassProjectId;
  if (!projectId) {
    console.error(
      chalk.red('No Compass project linked. Run ' + chalk.cyan('bitcompass init') + ' and select a project.')
    );
    process.exit(1);
  }

  // 3. Fetch project info + remote rules
  const spinner = createSpinner('Loading project…');
  const [project, remoteRules] = await Promise.all([
    getCompassProjectById(projectId),
    fetchRules(undefined, { projectId }),
  ]);
  spinner.stop();

  if (!project) {
    console.error(chalk.red('Compass project not found or no access: ' + projectId));
    process.exit(1);
  }

  console.log(chalk.bold('Project: ') + project.title + chalk.dim(` (${projectId})`));

  // 4. Scan locally installed items
  const config = getProjectConfig({ warnIfMissing: false });
  const installed = scanInstalled({ global: options.global });
  const installedById = new Map(installed.map((i) => [i.id, i]));
  const remoteById = new Map(remoteRules.map((r) => [r.id, r]));

  // 5. Build sync items list
  const syncItems: SyncItem[] = [];

  // Remote rules: check new vs update vs up-to-date
  for (const rule of remoteRules) {
    const local = installedById.get(rule.id);
    const remoteVersion = rule.version ?? null;

    if (!local) {
      syncItems.push({
        id: rule.id,
        kind: rule.kind,
        title: rule.title,
        localVersion: null,
        remoteVersion,
        status: 'new',
      });
    } else {
      // Check if update needed
      let needsUpdate = false;
      if (remoteVersion && local.currentVersion) {
        needsUpdate = compareVersion(remoteVersion, local.currentVersion) > 0;
      } else if (remoteVersion && !local.currentVersion) {
        needsUpdate = true;
      } else {
        // Fallback: compare by timestamp
        needsUpdate = new Date(rule.updated_at).getTime() > local.mtimeMs;
      }

      syncItems.push({
        id: rule.id,
        kind: rule.kind,
        title: rule.title,
        localVersion: local.currentVersion,
        remoteVersion,
        status: needsUpdate ? 'update' : 'up-to-date',
        path: local.path,
      });
    }
  }

  // Local items not in remote anymore → removed
  for (const local of installed) {
    if (!remoteById.has(local.id)) {
      syncItems.push({
        id: local.id,
        kind: local.kind,
        title: local.id, // We don't have the title since it's not in remote anymore
        localVersion: local.currentVersion,
        remoteVersion: null,
        status: 'removed',
        path: local.path,
      });
    }
  }

  // Sort: new first, then updates, then removed, then up-to-date
  const statusOrder: Record<ItemStatus, number> = { 'new': 0, 'update': 1, 'removed': 2, 'up-to-date': 3 };
  syncItems.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  // 6. Print status table
  const newCount = syncItems.filter((i) => i.status === 'new').length;
  const updateCount = syncItems.filter((i) => i.status === 'update').length;
  const upToDateCount = syncItems.filter((i) => i.status === 'up-to-date').length;
  const removedCount = syncItems.filter((i) => i.status === 'removed').length;

  console.log('');
  printSyncTable(syncItems);

  const parts: string[] = [];
  if (newCount) parts.push(chalk.green(`${newCount} new`));
  if (updateCount) parts.push(chalk.cyan(`${updateCount} to update`));
  if (upToDateCount) parts.push(chalk.dim(`${upToDateCount} up to date`));
  if (removedCount) parts.push(chalk.yellow(`${removedCount} removed from project`));
  console.log('  ' + parts.join(chalk.dim(' · ')));
  console.log('');

  // 7. Nothing to do?
  // "removed" items are only actionable when --prune is set
  const actionable = syncItems.filter(
    (i) => i.status === 'new' || i.status === 'update' || (i.status === 'removed' && options.prune)
  );
  if (actionable.length === 0) {
    console.log(chalk.green('Everything is up to date.'));
    return;
  }

  // 8. Check-only mode
  if (options.check) {
    return;
  }

  // 9. Select items to sync
  let toSync: SyncItem[];
  if (options.all) {
    toSync = actionable;
  } else if (process.stdout.isTTY) {
    const choices = actionable.map((item) => {
      const label =
        item.status === 'new'
          ? `${chalk.green('[new]')} ${item.title}`
          : item.status === 'update'
            ? `${chalk.cyan('[update]')} ${item.title} ${chalk.dim(formatVersion(item.localVersion) + ' → ' + formatVersion(item.remoteVersion))}`
            : `${chalk.yellow('[remove]')} ${item.title}`;
      return {
        name: label,
        value: item.id,
        short: item.title,
        checked: true, // default: all selected
      };
    });

    const { selectedIds } = await inquirer.prompt<{ selectedIds: string[] }>([
      {
        name: 'selectedIds',
        message: 'Select items to sync (all selected by default)',
        type: 'checkbox',
        choices,
        pageSize: Math.min(20, Math.max(5, choices.length)),
      },
    ]);

    if (selectedIds.length === 0) {
      console.log(chalk.dim('Nothing selected.'));
      return;
    }
    const idSet = new Set(selectedIds);
    toSync = actionable.filter((i) => idSet.has(i.id));
  } else {
    if (!options.yes) {
      console.error(chalk.red('Non-interactive mode: use --all -y to sync all.'));
      process.exit(1);
    }
    toSync = actionable;
  }

  // 10. Confirmation (unless --yes)
  if (!options.yes && process.stdout.isTTY) {
    const toPull = toSync.filter((i) => i.status === 'new' || i.status === 'update').length;
    const toRemove = toSync.filter((i) => i.status === 'removed').length;
    const desc: string[] = [];
    if (toPull) desc.push(`pull/update ${toPull}`);
    if (toRemove) desc.push(`remove ${toRemove}`);

    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        name: 'confirm',
        message: `Sync ${desc.join(', ')} item(s)?`,
        type: 'confirm',
        default: true,
      },
    ]);
    if (!confirm) {
      console.log(chalk.dim('Cancelled.'));
      return;
    }
  }

  // 11. Apply sync
  let pulledCount = 0;
  let prunedCount = 0;
  let failedCount = 0;

  for (const item of toSync) {
    if (item.status === 'new' || item.status === 'update') {
      const s = createSpinner(`${item.status === 'new' ? 'Pulling' : 'Updating'} ${item.title}…`);
      try {
        await pullRuleToFile(item.id, {
          global: options.global,
          useSymlink: true,
          source: 'sync',
        });
        s.succeed(chalk.green(item.status === 'new' ? 'Pulled' : 'Updated') + ' ' + item.title);
        pulledCount++;
      } catch (e) {
        s.fail(chalk.red('Failed') + ' ' + item.title);
        console.error(chalk.red(e instanceof Error ? e.message : String(e)));
        failedCount++;
      }
    } else if (item.status === 'removed' && item.path) {
      try {
        unlinkSync(item.path);
        console.log(chalk.yellow('  Removed') + ' ' + chalk.dim(item.path));
        prunedCount++;
      } catch (e) {
        console.error(chalk.red('  Could not remove ') + item.path);
        failedCount++;
      }
    }
  }

  // 12. Summary
  console.log('');
  const summary: string[] = [];
  if (pulledCount) summary.push(chalk.green(`${pulledCount} synced`));
  if (prunedCount) summary.push(chalk.yellow(`${prunedCount} removed`));
  if (failedCount) summary.push(chalk.red(`${failedCount} failed`));
  console.log(chalk.bold('Done: ') + summary.join(chalk.dim(', ')) + '.');
};
