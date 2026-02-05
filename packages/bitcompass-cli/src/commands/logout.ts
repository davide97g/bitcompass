import { clearCredentials } from '../auth/config.js';
import chalk from 'chalk';

export const runLogout = (): void => {
  clearCredentials();
  console.log(chalk.green('Logged out.'));
};
