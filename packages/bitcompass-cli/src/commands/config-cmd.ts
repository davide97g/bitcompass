import { loadConfig, saveConfig, getConfigDir } from '../auth/config.js';
import { loadProjectConfig } from '../auth/project-config.js';
import chalk from 'chalk';

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
