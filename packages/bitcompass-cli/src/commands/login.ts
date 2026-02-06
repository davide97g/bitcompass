import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import { createServer } from 'http';
import open from 'open';
import ora from 'ora';
import { getTokenFilePath, loadConfig, saveCredentials } from '../auth/config.js';
import { DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL } from '../auth/defaults.js';
import type { StoredCredentials } from '../types.js';

const CALLBACK_PORT = 38473;

/** Design tokens matching src/index.css (light theme) */
const STYLES = {
  background: 'hsl(0, 0%, 98%)',
  foreground: 'hsl(222, 47%, 11%)',
  primary: 'hsl(221, 83%, 53%)',
  primaryForeground: 'hsl(0, 0%, 100%)',
  muted: 'hsl(220, 9%, 46%)',
  card: 'hsl(0, 0%, 100%)',
  border: 'hsl(220, 13%, 91%)',
  radius: '0.625rem',
  shadow: '0 10px 15px -3px hsl(220 13% 11% / 0.08), 0 4px 6px -4px hsl(220 13% 11% / 0.05)',
};

const CALLBACK_SUCCESS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Logged in — Bitcompass</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${STYLES.background};
      color: ${STYLES.foreground};
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      padding: 1rem;
    }
    .card {
      width: 100%;
      max-width: 28rem;
      background: ${STYLES.card};
      border: 1px solid ${STYLES.border};
      border-radius: ${STYLES.radius};
      box-shadow: ${STYLES.shadow};
      padding: 2rem;
      text-align: center;
      animation: fadeIn 0.35s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 4rem;
      height: 4rem;
      border-radius: 1rem;
      background: ${STYLES.primary};
      color: ${STYLES.primaryForeground};
      margin-bottom: 1.25rem;
    }
    .icon-wrap svg { width: 2rem; height: 2rem; }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      font-weight: 700;
    }
    .muted {
      color: ${STYLES.muted};
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0;
    }
    .hint {
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 1px solid ${STYLES.border};
      font-size: 0.8125rem;
      color: ${STYLES.muted};
    }
    .verify-block {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid ${STYLES.border};
      font-size: 0.8125rem;
      color: ${STYLES.muted};
    }
    .cmd-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      flex-wrap: wrap;
    }
    .cmd {
      font-family: ui-monospace, monospace;
      font-size: 0.8125rem;
      padding: 0.375rem 0.75rem;
      background: ${STYLES.background};
      border: 1px solid ${STYLES.border};
      border-radius: 0.375rem;
      color: ${STYLES.foreground};
    }
    .copy-btn {
      font-size: 0.8125rem;
      padding: 0.375rem 0.75rem;
      background: ${STYLES.primary};
      color: ${STYLES.primaryForeground};
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-weight: 500;
    }
    .copy-btn:hover { opacity: 0.9; }
    .copy-btn.copied { background: ${STYLES.muted}; cursor: default; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    </div>
    <h1>You're all set</h1>
    <p class="muted">You're logged in successfully. You can close this window safely—your credentials are saved and the CLI is ready to use.</p>
    <p class="hint">Return to your terminal to continue.</p>
    <div class="verify-block">
      <p class="muted" style="margin:0">Verify in terminal:</p>
      <div class="cmd-row">
        <code class="cmd" id="whoami-cmd">bitcompass whoami</code>
        <button type="button" class="copy-btn" id="copy-btn" aria-label="Copy command">Copy</button>
      </div>
    </div>
  </div>
  <script>
    (function() {
      var btn = document.getElementById('copy-btn');
      var cmd = document.getElementById('whoami-cmd');
      if (!btn || !cmd) return;
      btn.addEventListener('click', function() {
        navigator.clipboard.writeText('bitcompass whoami').then(function() {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(function() {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 2000);
        });
      });
    })();
  </script>
</body>
</html>`;

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const callbackPage = (opts: { title: string; message: string; isError?: boolean }) => {
  const iconColor = opts.isError ? 'hsl(0, 84%, 60%)' : STYLES.primary;
  const safeMessage = escapeHtml(opts.message);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.title} — Bitcompass</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${STYLES.background};
      color: ${STYLES.foreground};
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      padding: 1rem;
    }
    .card {
      width: 100%;
      max-width: 28rem;
      background: ${STYLES.card};
      border: 1px solid ${STYLES.border};
      border-radius: ${STYLES.radius};
      box-shadow: ${STYLES.shadow};
      padding: 2rem;
      text-align: center;
    }
    .icon-wrap { display: inline-flex; align-items: center; justify-content: center; width: 4rem; height: 4rem; border-radius: 1rem; margin-bottom: 1.25rem; }
    .icon-wrap svg { width: 2rem; height: 2rem; }
    .icon-wrap { background: ${iconColor}; color: ${STYLES.primaryForeground}; }
    h1 { margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 700; }
    .muted { color: ${STYLES.muted}; font-size: 0.875rem; line-height: 1.5; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <h1>${opts.title}</h1>
    <p class="muted">${safeMessage}</p>
  </div>
</body>
</html>`;
};

const createInMemoryStorage = (): { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void>; removeItem: (key: string) => Promise<void> } => {
  const store = new Map<string, string>();
  return {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  };
};

export const runLogin = async (): Promise<void> => {
  const config = loadConfig();
  const url =
    config.supabaseUrl ??
    process.env.BITCOMPASS_SUPABASE_URL ??
    DEFAULT_SUPABASE_URL;
  const anonKey =
    config.supabaseAnonKey ??
    process.env.BITCOMPASS_SUPABASE_ANON_KEY ??
    DEFAULT_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error(
      chalk.red(
        'Supabase not configured. Set supabaseUrl and supabaseAnonKey:\n  bitcompass config set supabaseUrl https://YOUR_PROJECT.supabase.co\n  bitcompass config set supabaseAnonKey YOUR_ANON_KEY\nOr set BITCOMPASS_SUPABASE_URL and BITCOMPASS_SUPABASE_ANON_KEY.'
      )
    );
    process.exit(1);
  }

  const redirectTo = `http://127.0.0.1:${CALLBACK_PORT}/callback`;
  const storage = createInMemoryStorage();
  const supabase = createClient(url, anonKey, {
    auth: {
      flowType: 'pkce',
      storage,
      detectSessionInUrl: false,
    },
  });

  const spinner = ora('Opening browser for Google login…').start();

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const u = new URL(req.url ?? '/', `http://127.0.0.1:${CALLBACK_PORT}`);
      if (u.pathname === '/callback') {
        const code = u.searchParams.get('code');
        const errorDesc = u.searchParams.get('error_description');
        if (errorDesc) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(callbackPage({ title: 'Login failed', message: errorDesc, isError: true }));
          spinner.fail(chalk.red('Login failed: ' + errorDesc));
          server.close();
          reject(new Error(errorDesc));
          return;
        }
        if (!code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(callbackPage({ title: 'No authorization code', message: 'No authorization code was received. Please try logging in again.', isError: true }));
          spinner.fail(chalk.red('No code received. Try again.'));
          server.close();
          reject(new Error('No code'));
          return;
        }
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(callbackPage({ title: 'Login failed', message: error.message, isError: true }));
            spinner.fail(chalk.red('Login failed: ' + error.message));
            server.close();
            reject(error);
            return;
          }
          const session = data?.session;
          if (!session?.access_token) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(callbackPage({ title: 'No session', message: 'No session was received. Please try again.', isError: true }));
            spinner.fail(chalk.red('No session.'));
            server.close();
            reject(new Error('No session'));
            return;
          }
          const creds: StoredCredentials = {
            access_token: session.access_token,
            refresh_token: session.refresh_token ?? '',
            user: session.user ? { email: session.user.email ?? undefined } : {},
          };
          const tokenPath = getTokenFilePath();
          saveCredentials(creds);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(CALLBACK_SUCCESS_HTML);
          spinner.succeed(chalk.green('Logged in successfully.'));
          console.log(chalk.dim('Credentials saved to:'), tokenPath);
          server.close();
          resolve();
        } catch (e) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(callbackPage({ title: 'Error', message: e instanceof Error ? e.message : String(e), isError: true }));
          spinner.fail('Login failed.');
          console.error(chalk.red(e instanceof Error ? e.message : String(e)));
          server.close();
          reject(e);
        }
        return;
      }
      res.writeHead(404);
      res.end();
    });

    server.listen(CALLBACK_PORT, '127.0.0.1', async () => {
      spinner.text = 'Waiting for login…';
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            scopes: 'openid email profile',
            queryParams: { access_type: 'offline', prompt: 'consent' },
            skipBrowserRedirect: true,
          },
        });
        if (error) {
          spinner.fail(chalk.red('Login failed: ' + error.message));
          server.close();
          reject(error);
          return;
        }
        const authUrl = data?.url;
        if (!authUrl) {
          spinner.fail(chalk.red('No auth URL returned.'));
          server.close();
          reject(new Error('No auth URL'));
          return;
        }
        open(authUrl).catch(() => {
          console.log(chalk.yellow('Open this URL in your browser:'), authUrl);
        });
      } catch (e) {
        spinner.fail('Login failed.');
        server.close();
        reject(e);
      }
    });

    server.on('error', (err) => {
      spinner.fail('Could not start callback server.');
      reject(err);
    });
  });
};
