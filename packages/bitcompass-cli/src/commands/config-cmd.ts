import { loadConfig, saveConfig, getConfigDir, loadCredentials } from '../auth/config.js';
import { loadProjectConfig, saveProjectConfig } from '../auth/project-config.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

const CONFIG_KEYS = ['supabaseUrl', 'supabaseAnonKey', 'apiUrl'] as const;

const PROJECT_CONFIG_KEYS = ['compassProjectId'] as const;

export const runConfigList = (): void => {
  const dir = getConfigDir();
  const config = loadConfig();
  console.log(chalk.dim('Config dir:'), dir);
  console.log('');
  CONFIG_KEYS.forEach((key) => {
    const val = config[key as keyof typeof config] ?? process.env[`BITCOMPASS_${key.toUpperCase()}`] ?? '(not set)';
    const display = typeof val === 'string' && val.length > 40 ? val.slice(0, 40) + '…' : val;
    console.log(`  ${key}: ${display}`);
  });
  const projectConfig = loadProjectConfig();
  if (projectConfig) {
    console.log('');
    console.log(chalk.dim('Project (current folder):'));
    PROJECT_CONFIG_KEYS.forEach((key) => {
      const val = projectConfig[key as (typeof PROJECT_CONFIG_KEYS)[number]];
      const display = val ?? '(not set)';
      console.log(`  ${key}: ${display}`);
    });
  }
};

export const runConfigSet = (key: string, value: string): void => {
  const config = loadConfig();
  if (!CONFIG_KEYS.includes(key as (typeof CONFIG_KEYS)[number])) {
    console.error(chalk.red('Unknown key. Use one of:'), CONFIG_KEYS.join(', '));
    process.exit(2);
  }
  (config as Record<string, string>)[key] = value;
  saveConfig(config);
  console.log(chalk.green('Updated'), key);
};

export const runConfigGet = (key: string): void => {
  if (PROJECT_CONFIG_KEYS.includes(key as (typeof PROJECT_CONFIG_KEYS)[number])) {
    const projectConfig = loadProjectConfig();
    const val = projectConfig?.[key as (typeof PROJECT_CONFIG_KEYS)[number]] ?? null;
    console.log(val ?? '');
    return;
  }
  const config = loadConfig();
  if (!CONFIG_KEYS.includes(key as (typeof CONFIG_KEYS)[number])) {
    console.error(chalk.red('Unknown key. Use one of:'), [...CONFIG_KEYS, ...PROJECT_CONFIG_KEYS].join(', '));
    process.exit(2);
  }
  const val = config[key as keyof typeof config] ?? process.env[`BITCOMPASS_${key.toUpperCase()}`];
  console.log(val ?? '');
};

/**
 * Pushes local project config to the linked Compass project.
 */
export const runConfigPush = async (): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  const projectConfig = loadProjectConfig();
  if (!projectConfig) {
    console.error(chalk.red('No project config found. Run ' + chalk.cyan('bitcompass init') + ' first.'));
    process.exit(1);
  }
  if (!projectConfig.compassProjectId) {
    console.error(chalk.red('No Compass project linked. Run ' + chalk.cyan('bitcompass init') + ' and select a project.'));
    process.exit(1);
  }
  const { pushProjectConfig } = await import('../api/client.js');
  await pushProjectConfig(projectConfig.compassProjectId, projectConfig);
  console.log(chalk.green('Project config pushed to Compass project ') + chalk.cyan(projectConfig.compassProjectId));
};

/**
 * Pulls project config from the linked Compass project and saves locally.
 */
export const runConfigPull = async (): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  const localConfig = loadProjectConfig();
  const projectId = localConfig?.compassProjectId;
  if (!projectId) {
    console.error(chalk.red('No Compass project linked. Run ' + chalk.cyan('bitcompass init') + ' and select a project.'));
    process.exit(1);
  }
  const { pullProjectConfig } = await import('../api/client.js');
  const remoteConfig = await pullProjectConfig(projectId);
  if (!remoteConfig) {
    console.log(chalk.yellow('No config stored in Compass project.'));
    return;
  }
  if (localConfig) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([{
      name: 'confirm',
      message: 'Overwrite local config with remote config?',
      type: 'confirm',
      default: false,
    }]);
    if (!confirm) {
      console.log(chalk.dim('Cancelled.'));
      return;
    }
  }
  // Preserve the local compassProjectId
  remoteConfig.compassProjectId = projectId;
  saveProjectConfig(remoteConfig);
  console.log(chalk.green('Project config pulled from Compass project ') + chalk.cyan(projectId));
};
