import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { BitcompassConfig, StoredCredentials } from '../types.js';

const getDir = (): string => {
  const base = process.env.BITCOMPASS_CONFIG_DIR ?? join(homedir(), '.bitcompass');
  return base;
};

let _dir: string | null = null;
const getDirCached = (): string => {
  if (_dir === null) _dir = getDir();
  return _dir;
};

const CONFIG_FILE = (): string => join(getDirCached(), 'config.json');
const TOKEN_FILE = (): string => join(getDirCached(), 'token.json');

const ensureDir = (): void => {
  const dir = getDirCached();
  if (!existsSync(dir)) {
    mkdirSync(dir, { mode: 0o700, recursive: true });
  }
};

export const getConfigDir = (): string => {
  ensureDir();
  return getDirCached();
};

export const getTokenFilePath = (): string => TOKEN_FILE();

export const loadConfig = (): BitcompassConfig => {
  ensureDir();
  const path = CONFIG_FILE();
  if (!existsSync(path)) {
    return {};
  }
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as BitcompassConfig;
  } catch {
    return {};
  }
};

export const saveConfig = (config: BitcompassConfig): void => {
  ensureDir();
  writeFileSync(CONFIG_FILE(), JSON.stringify(config, null, 2), { mode: 0o600 });
};

export const loadCredentials = (): StoredCredentials | null => {
  ensureDir();
  const path = TOKEN_FILE();
  if (!existsSync(path)) {
    return null;
  }
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as StoredCredentials;
  } catch {
    return null;
  }
};

export const saveCredentials = (creds: StoredCredentials): void => {
  ensureDir();
  const path = TOKEN_FILE();
  writeFileSync(path, JSON.stringify(creds, null, 0), { mode: 0o600 });
  if (!existsSync(path)) {
    throw new Error(`Token file was not created at ${path}`);
  }
};

export const clearCredentials = (): void => {
  const path = TOKEN_FILE();
  if (existsSync(path)) {
    try {
      writeFileSync(path, '{}', { mode: 0o600 });
    } catch {
      // ignore
    }
  }
};

export const isLoggedIn = (): boolean => {
  const creds = loadCredentials();
  return Boolean(creds?.access_token);
};
