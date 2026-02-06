import { loadConfig, saveConfig, getConfigDir } from '../auth/config.js';
import chalk from 'chalk';

const CONFIG_KEYS = ['supabaseUrl', 'supabaseAnonKey', 'apiUrl'] as const;

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
  const config = loadConfig();
  if (!CONFIG_KEYS.includes(key as (typeof CONFIG_KEYS)[number])) {
    console.error(chalk.red('Unknown key.'));
    process.exit(2);
  }
  const val = config[key as keyof typeof config] ?? process.env[`BITCOMPASS_${key.toUpperCase()}`];
  console.log(val ?? '');
};
