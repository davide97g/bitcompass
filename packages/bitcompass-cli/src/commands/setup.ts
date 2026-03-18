import chalk from 'chalk';
import { loadCredentialsWithRefresh, getCurrentUserEmail } from '../auth/config.js';
import { loadProjectConfig } from '../auth/project-config.js';
import { printBanner } from '../lib/banner.js';

type StepStatus = 'done' | 'pending' | 'skip';

interface Step {
  name: string;
  status: StepStatus;
  detail: string;
}

function printSteps(steps: Step[]): void {
  console.log('');
  for (const step of steps) {
    const icon = step.status === 'done' ? chalk.green('✓') : chalk.dim('○');
    const label = step.status === 'done' ? chalk.green(step.name) : step.name;
    const detail = step.status === 'done' ? chalk.dim(step.detail) : chalk.dim(step.detail);
    console.log(`  ${icon} ${label.padEnd(12)} ${detail}`);
  }
  console.log('');
}

export const runSetup = async (): Promise<void> => {
  await printBanner();
  console.log(chalk.bold('BitCompass Setup'));

  // Step 1: Detect login state
  const creds = await loadCredentialsWithRefresh();
  const loggedIn = Boolean(creds?.access_token);
  const email = getCurrentUserEmail();

  // Step 2: Detect init state
  let config = loadProjectConfig();
  const initialized = Boolean(config?.editor && config?.outputPath);

  // Step 3: Detect sync eligibility
  const canSync = Boolean(config?.compassProjectId);

  // Build steps
  const steps: Step[] = [
    {
      name: 'Login',
      status: loggedIn ? 'done' : 'pending',
      detail: loggedIn ? `Logged in as ${email ?? 'unknown'}` : 'Not logged in',
    },
    {
      name: 'Init',
      status: initialized ? 'done' : 'pending',
      detail: initialized ? 'Project configured' : 'Not configured',
    },
    {
      name: 'Sync',
      status: 'pending',
      detail: canSync ? 'Ready' : 'Pending (requires init with Compass project)',
    },
  ];

  printSteps(steps);

  // Run pending steps in order

  // Login
  if (!loggedIn) {
    console.log(chalk.bold('→ Login'));
    const { runLogin } = await import('./login.js');
    await runLogin();
    console.log('');
  }

  // Init
  if (!initialized) {
    console.log(chalk.bold('→ Init'));
    const { runInit } = await import('./init.js');
    await runInit();
    // Re-check config after init
    config = loadProjectConfig();
    console.log('');
  }

  // Sync (only if Compass project is linked)
  const projectId = config?.compassProjectId;
  if (projectId) {
    console.log(chalk.bold('→ Sync'));
    const { runSync } = await import('./sync.js');
    await runSync({ all: true, yes: false });
    console.log('');
  } else {
    console.log(chalk.dim('  Skipping sync: no Compass project linked.'));
    console.log('');
  }

  // Final status
  const finalCreds = await loadCredentialsWithRefresh();
  const finalConfig = loadProjectConfig();
  const allDone = Boolean(finalCreds?.access_token) && Boolean(finalConfig?.editor && finalConfig?.outputPath);

  if (allDone) {
    console.log(chalk.green.bold('All set!') + ' BitCompass is ready to use.');
  } else {
    console.log(chalk.yellow('Some steps were skipped. Run ') + chalk.cyan('bitcompass setup') + chalk.yellow(' again to complete.'));
  }
};
