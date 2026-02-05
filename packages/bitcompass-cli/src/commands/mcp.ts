import chalk from 'chalk';
import { isLoggedIn } from '../auth/config.js';
import { startMcpServer } from '../mcp/server.js';

export const runMcpStart = async (): Promise<void> => {
  if (!isLoggedIn()) {
    console.error(chalk.red('Not logged in. Run bitcompass login first.'));
    process.exit(1);
  }
  await startMcpServer();
};

export const runMcpStatus = (): void => {
  if (isLoggedIn()) {
    console.log(chalk.green('MCP: ready (logged in)'));
  } else {
    console.log(chalk.yellow('MCP: not logged in. Run bitcompass login.'));
  }
};
