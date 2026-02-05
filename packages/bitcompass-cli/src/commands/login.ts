import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import { createServer } from 'http';
import open from 'open';
import ora from 'ora';
import { getTokenFilePath, loadConfig, saveCredentials } from '../auth/config.js';
import type { StoredCredentials } from '../types.js';

const CALLBACK_PORT = 38473;

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
  const url = config.supabaseUrl ?? process.env.BITCOMPASS_SUPABASE_URL;
  const anonKey = config.supabaseAnonKey ?? process.env.BITCOMPASS_SUPABASE_ANON_KEY;

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
          res.end(`<!DOCTYPE html><html><body><p>Login failed: ${errorDesc}</p></body></html>`);
          spinner.fail(chalk.red('Login failed: ' + errorDesc));
          server.close();
          reject(new Error(errorDesc));
          return;
        }
        if (!code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<!DOCTYPE html><html><body><p>No authorization code in URL. Try again.</p></body></html>');
          spinner.fail(chalk.red('No code received. Try again.'));
          server.close();
          reject(new Error('No code'));
          return;
        }
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<!DOCTYPE html><html><body><p>Exchange failed: ${error.message}</p></body></html>`);
            spinner.fail(chalk.red('Login failed: ' + error.message));
            server.close();
            reject(error);
            return;
          }
          const session = data?.session;
          if (!session?.access_token) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<!DOCTYPE html><html><body><p>No session received.</p></body></html>');
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
          res.end('<!DOCTYPE html><html><body><p>Logged in. You can close this window.</p></body></html>');
          spinner.succeed(chalk.green('Logged in successfully.'));
          console.log(chalk.dim('Credentials saved to:'), tokenPath);
          server.close();
          resolve();
        } catch (e) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<!DOCTYPE html><html><body><p>Error: ${e instanceof Error ? e.message : String(e)}</p></body></html>`);
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
