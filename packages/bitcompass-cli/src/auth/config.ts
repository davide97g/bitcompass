import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { BitcompassConfig, StoredCredentials } from '../types.js';
import { DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL } from './defaults.js';

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

/** Returns the current user email if logged in, otherwise null. Reused by whoami and init. */
export const getCurrentUserEmail = (): string | null => {
  const creds = loadCredentials();
  if (!creds?.access_token) return null;
  return creds.user?.email ?? null;
};

/** Buffer before actual expiry (2 minutes) to refresh proactively. */
const REFRESH_BUFFER_MS = 2 * 60 * 1000;

/**
 * Returns true if the stored access token is expired (or about to expire).
 * If expires_at is missing, falls back to decoding the JWT `exp` claim.
 */
export const isTokenExpired = (creds: StoredCredentials): boolean => {
  let expiresAt = creds.expires_at;
  if (!expiresAt) {
    // Try to read exp from JWT payload
    try {
      const parts = creds.access_token.split('.');
      const payloadPart = parts[1];
      if (parts.length === 3 && payloadPart) {
        const payload = JSON.parse(
          Buffer.from(payloadPart, 'base64url').toString('utf-8')
        ) as { exp?: number };
        if (typeof payload.exp === 'number') {
          expiresAt = payload.exp * 1000; // exp is in seconds
        }
      }
    } catch {
      // Can't determine expiry, assume valid
      return false;
    }
  }
  if (!expiresAt) return false;
  return Date.now() >= expiresAt - REFRESH_BUFFER_MS;
};

/**
 * Attempts to refresh the session using the stored refresh token.
 * On success, updates token.json and returns the new credentials.
 * On failure, returns null (caller should prompt re-login).
 */
export const refreshSession = async (): Promise<StoredCredentials | null> => {
  const creds = loadCredentials();
  if (!creds?.refresh_token) return null;

  const config = loadConfig();
  const url = config.supabaseUrl ?? process.env.BITCOMPASS_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
  const key = config.supabaseAnonKey ?? process.env.BITCOMPASS_SUPABASE_ANON_KEY ?? DEFAULT_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: creds.refresh_token,
  });

  if (error || !data.session) return null;

  const newCreds: StoredCredentials = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token ?? creds.refresh_token,
    expires_at: data.session.expires_at
      ? data.session.expires_at * 1000
      : undefined,
    user: data.session.user ? { email: data.session.user.email ?? creds.user?.email } : creds.user,
  };
  saveCredentials(newCreds);
  return newCreds;
};

/**
 * Loads credentials, auto-refreshing if the token is expired.
 * Returns null if no credentials or refresh fails.
 */
export const loadCredentialsWithRefresh = async (): Promise<StoredCredentials | null> => {
  const creds = loadCredentials();
  if (!creds?.access_token) return null;
  if (!isTokenExpired(creds)) return creds;
  // Token expired, try refresh
  return refreshSession();
};
