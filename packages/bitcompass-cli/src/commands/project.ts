import chalk from 'chalk';
import { unlinkSync } from 'fs';
import { loadCredentials } from '../auth/config.js';
import { getProjectConfig } from '../auth/project-config.js';
import {
  fetchRules,
  getCompassProjectById,
} from '../api/client.js';
import { pullRuleToFile } from '../lib/rule-file-ops.js';
import { scanInstalled } from '../lib/installed-scan.js';
import { getGroupedUpdatable, flattenUpdatable } from '../lib/update-check.js';
import { createSpinner } from '../lib/spinner.js';
import type { RuleKind } from '../types.js';

const KINDS: RuleKind[] = ['rule', 'solution', 'skill', 'command'];

const NO_PROJECT_MSG =
  'Nessun Compass project configurato. Esegui bitcompass init e scegli un progetto.';

export const runProjectPull = async (options?: {
  global?: boolean;
  copy?: boolean;
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
  const allRules: { id: string; kind: RuleKind }[] = [];
  for (const kind of KINDS) {
    const list = await fetchRules(kind, { projectId });
    for (const r of list) {
      allRules.push({ id: r.id, kind: r.kind });
    }
  }
  spinner.stop();

  if (allRules.length === 0) {
    console.log(chalk.yellow('No rules, skills, commands, or solutions in this project.'));
    return;
  }

  const useSymlink = !options?.copy;
  for (const { id } of allRules) {
    const s = createSpinner(`Pulling ${id}…`);
    try {
      await pullRuleToFile(id, {
        global: options?.global,
        useSymlink,
      });
      s.succeed(chalk.green('Pulled'));
    } catch (e) {
      s.fail(chalk.red('Failed'));
      console.error(chalk.red(e instanceof Error ? e.message : String(e)));
    }
  }
  console.log(chalk.green(`Pulled ${allRules.length} item(s) from the Compass project.`));
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
