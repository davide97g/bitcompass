import chalk from 'chalk';
import { unlinkSync } from 'fs';
import inquirer from 'inquirer';
import {
  fetchRules,
  getCompassProjectById,
} from '../api/client.js';
import { loadCredentials } from '../auth/config.js';
import { getProjectConfig } from '../auth/project-config.js';
import { scanInstalled } from '../lib/installed-scan.js';
import { pullRuleToFile } from '../lib/rule-file-ops.js';
import { createSpinner } from '../lib/spinner.js';
import { flattenUpdatable, getGroupedUpdatable } from '../lib/update-check.js';
import type { Rule, RuleKind } from '../types.js';

const NO_PROJECT_MSG =
  'Nessun Compass project configurato. Esegui bitcompass init e scegli un progetto.';

const kindLabel = (k: RuleKind): string =>
  k === 'rule' ? 'rule' : k === 'solution' ? 'solution' : k === 'skill' ? 'skill' : 'command';

export const runProjectPull = async (options?: {
  global?: boolean;
  copy?: boolean;
  /** When true, skip multiselect and pull all (non-interactive). */
  all?: boolean;
}): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  const config = getProjectConfig({ warnIfMissing: false });
  const projectId = config.compassProjectId ?? null;
  if (projectId == null || projectId === '') {
    console.error(chalk.red(NO_PROJECT_MSG));
    process.exit(1);
  }

  const spinner = createSpinner('Loading project rules…');
  const projectRules: Rule[] = await fetchRules(undefined, { projectId });
  spinner.stop();

  if (projectRules.length === 0) {
    console.log(chalk.yellow('No rules, skills, commands, or solutions in this project.'));
    return;
  }

  let toPull: Rule[];
  if (options?.all) {
    toPull = projectRules;
  } else {
    const choices = projectRules.map((r) => ({
      name: `[${kindLabel(r.kind)}] ${r.title}`,
      value: r.id,
      short: r.title,
    }));
    const { selectedIds } = await inquirer.prompt<{ selectedIds: string[] }>([
      {
        name: 'selectedIds',
        message: 'Select items to pull (space to toggle, enter to confirm)',
        type: 'checkbox',
        choices,
        pageSize: Math.min(15, Math.max(5, choices.length)),
      },
    ]);
    if (selectedIds.length === 0) {
      console.log(chalk.dim('Nothing selected. Exiting.'));
      return;
    }
    const idSet = new Set(selectedIds);
    toPull = projectRules.filter((r) => idSet.has(r.id));
  }

  const useSymlink = !options?.copy;
  for (const rule of toPull) {
    const s = createSpinner(`Pulling ${rule.title}…`);
    try {
      await pullRuleToFile(rule.id, {
        global: options?.global,
        useSymlink,
      });
      s.succeed(chalk.green('Pulled'));
    } catch (e) {
      s.fail(chalk.red('Failed'));
      console.error(chalk.red(e instanceof Error ? e.message : String(e)));
    }
  }
  console.log(chalk.green(`Pulled ${toPull.length} item(s) from the Compass project.`));
};

export const runProjectSync = async (options?: {
  prune?: boolean;
  global?: boolean;
}): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  const config = getProjectConfig({ warnIfMissing: false });
  const projectId = config.compassProjectId ?? null;
  if (projectId == null || projectId === '') {
    console.error(chalk.red(NO_PROJECT_MSG));
    process.exit(1);
  }

  const spinner = createSpinner('Loading project rules…');
  const projectRules = await fetchRules(undefined, { projectId });
  const projectIds = new Set(projectRules.map((r) => r.id));
  spinner.stop();

  const installed = scanInstalled({ global: options?.global });
  const grouped = await getGroupedUpdatable(installed, { projectId });
  const updatable = flattenUpdatable(grouped);
  const updatableIds = new Set(updatable.map((u) => u.id));

  let pulled = 0;
  for (const rule of projectRules) {
    const isInstalled = installed.some((i) => i.id === rule.id);
    const needsUpdate = updatableIds.has(rule.id);
    if (!isInstalled || needsUpdate) {
      const s = createSpinner(`Syncing ${rule.title}…`);
      try {
        await pullRuleToFile(rule.id, {
          global: options?.global,
          useSymlink: true,
        });
        s.succeed(chalk.green('Synced'));
        pulled++;
      } catch (e) {
        s.fail(chalk.red('Failed'));
        console.error(chalk.red(e instanceof Error ? e.message : String(e)));
      }
    }
  }

  let pruned = 0;
  if (options?.prune) {
    for (const item of installed) {
      if (!projectIds.has(item.id)) {
        try {
          unlinkSync(item.path);
          console.log(chalk.dim('Pruned'), item.path);
          pruned++;
        } catch (e) {
          console.error(chalk.red('Could not remove'), item.path, e instanceof Error ? e.message : e);
        }
      }
    }
  }

  console.log(
    chalk.green(
      `Sync done: ${pulled} updated, ${pruned} pruned. Project has ${projectRules.length} item(s).`
    )
  );
};

export const runProjectList = async (): Promise<void> => {
  const config = getProjectConfig({ warnIfMissing: false });
  const projectId = config.compassProjectId ?? null;
  if (projectId == null || projectId === '') {
    console.log(chalk.yellow(NO_PROJECT_MSG));
    return;
  }
  const project = await getCompassProjectById(projectId);
  if (!project) {
    console.log(chalk.yellow('Compass project not found or no access:', projectId));
    return;
  }
  console.log(chalk.bold(project.title));
  console.log(chalk.dim(project.id));
  if (project.description) {
    console.log(chalk.dim(project.description));
  }
};
