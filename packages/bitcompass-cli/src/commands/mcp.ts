import chalk from 'chalk';
import { isLoggedIn } from '../auth/config.js';
import { startMcpServer } from '../mcp/server.js';

export const runMcpStart = async (): Promise<void> => {
  // Do not exit when not logged in: Cursor needs the process to stay alive to complete
  // the MCP handshake. Tools return an auth message (run bitcompass login, then restart MCP) when needed.
  await startMcpServer();
};

export const runMcpStatus = (): void => {
  if (isLoggedIn()) {
    console.log(chalk.green('MCP: ready (logged in)'));
  } else {
    console.log(chalk.yellow('MCP: not logged in. Run bitcompass login.'));
  }
};
