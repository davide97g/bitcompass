import { loadCredentials } from '../auth/config.js';
import chalk from 'chalk';

export const runWhoami = (): void => {
  const creds = loadCredentials();
  if (!creds?.access_token) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  const email = (creds as { user?: { email?: string } }).user?.email;
  if (email) {
    console.log(email);
  } else {
    console.log(chalk.yellow('Logged in (email not stored). Run bitcompass login to refresh.'));
  }
};
