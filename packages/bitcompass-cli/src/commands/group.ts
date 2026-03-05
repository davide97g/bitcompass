import chalk from 'chalk';
import { unlinkSync } from 'fs';
import inquirer from 'inquirer';
import {
  fetchRulesByGroupId,
  fetchRuleGroups,
  getRuleGroupById,
} from '../api/client.js';
import { loadCredentials } from '../auth/config.js';
import { scanInstalled } from '../lib/installed-scan.js';
import { pullRuleToFile } from '../lib/rule-file-ops.js';
import { createSpinner } from '../lib/spinner.js';
import type { Rule, RuleKind } from '../types.js';

const kindLabel = (k: RuleKind): string =>
  k === 'rule' ? 'rule' : k === 'solution' ? 'solution' : k === 'skill' ? 'skill' : 'command';

export const runGroupPull = async (
  groupId: string,
  options?: { global?: boolean; copy?: boolean; all?: boolean }
): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }

  const spinner = createSpinner('Loading group rules…');
  const group = await getRuleGroupById(groupId);
  if (!group) {
    spinner.fail(chalk.red('Group not found: ' + groupId));
    process.exit(1);
  }
  const groupRules: Rule[] = await fetchRulesByGroupId(groupId);
  spinner.stop();

  console.log(chalk.bold(group.title));
  if (group.description) console.log(chalk.dim(group.description));

  if (groupRules.length === 0) {
    console.log(chalk.yellow('No rules in this group (including sub-groups).'));
    return;
  }

  let toPull: Rule[];
  if (options?.all) {
    toPull = groupRules;
  } else {
    const choices = groupRules.map((r) => ({
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
    toPull = groupRules.filter((r) => idSet.has(r.id));
  }

  const useSymlink = !options?.copy;
  for (const rule of toPull) {
    const s = createSpinner(`Pulling ${rule.title}…`);
    try {
      await pullRuleToFile(rule.id, { global: options?.global, useSymlink });
      s.succeed(chalk.green('Pulled'));
    } catch (e) {
      s.fail(chalk.red('Failed'));
      console.error(chalk.red(e instanceof Error ? e.message : String(e)));
    }
  }
  console.log(chalk.green(`Pulled ${toPull.length} item(s) from group "${group.title}".`));
};

export const runGroupSync = async (
  groupId: string,
  options?: { prune?: boolean; global?: boolean }
): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }

  const spinner = createSpinner('Loading group rules…');
  const group = await getRuleGroupById(groupId);
  if (!group) {
    spinner.fail(chalk.red('Group not found: ' + groupId));
    process.exit(1);
  }
  const groupRules = await fetchRulesByGroupId(groupId);
  const groupIds = new Set(groupRules.map((r) => r.id));
  spinner.stop();

  const installed = scanInstalled({ global: options?.global });

  let pulled = 0;
  for (const rule of groupRules) {
    const isInstalled = installed.some((i) => i.id === rule.id);
    if (!isInstalled) {
      const s = createSpinner(`Syncing ${rule.title}…`);
      try {
        await pullRuleToFile(rule.id, { global: options?.global, useSymlink: true });
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
      if (!groupIds.has(item.id)) {
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
      `Sync done: ${pulled} pulled, ${pruned} pruned. Group has ${groupRules.length} item(s).`
    )
  );
};

export const runGroupList = async (): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }

  const spinner = createSpinner('Loading groups…');
  const groups = await fetchRuleGroups();
  spinner.stop();

  if (groups.length === 0) {
    console.log(chalk.yellow('No groups found.'));
    return;
  }

  for (const g of groups) {
    console.log(chalk.bold(g.title) + chalk.dim(` (${g.id})`));
    if (g.description) console.log(chalk.dim('  ' + g.description));
  }
  console.log(chalk.dim(`\n${groups.length} group(s) total.`));
};
