import React, { useState } from 'react';
import { render, useApp } from 'ink';
import type { Command } from 'commander';
import { Banner } from './Banner.js';
import { CommandBrowser } from './CommandBrowser.js';
import { CommandInspect } from './CommandInspect.js';
import type { FlatCommand } from './commands.js';
import type { TuiCommand } from './types.js';

type Screen = 'banner' | 'browser' | 'inspect';

interface AppProps {
  onRunCommand: (argv: string[]) => void;
  onQuit: () => void;
}

const App: React.FC<AppProps> = ({ onRunCommand, onQuit }) => {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>('banner');
  const [selectedCommand, setSelectedCommand] = useState<TuiCommand | null>(null);

  const handleBannerComplete = () => setScreen('browser');

  const handleSelect = (item: FlatCommand) => {
    setSelectedCommand(item.command);
    setScreen('inspect');
  };

  const handleRun = (argv: string[]) => {
    exit();
    onRunCommand(argv);
  };

  const handleQuit = () => {
    exit();
    onQuit();
  };

  if (screen === 'banner') {
    return <Banner onComplete={handleBannerComplete} />;
  }

  if (screen === 'browser') {
    return <CommandBrowser onSelect={handleSelect} onQuit={handleQuit} />;
  }

  if (screen === 'inspect' && selectedCommand) {
    return (
      <CommandInspect
        command={selectedCommand}
        onRun={handleRun}
        onBack={() => setScreen('browser')}
      />
    );
  }

  return null;
};

export const launchTui = async (program: Command): Promise<void> => {
  return new Promise((done) => {
    let runningCommand = false;

    const instance = render(
      <App
        onRunCommand={(argv) => {
          runningCommand = true;
          instance.waitUntilExit().then(() => {
            setTimeout(async () => {
              process.stdin.resume();
              process.stdin.ref();
              process.stdout.write(`\n$ bitcompass ${argv.join(' ')}\n\n`);
              try {
                await program.parseAsync(argv, { from: 'user' });
              } catch (err: unknown) {
                if ((err as { name?: string })?.name !== 'ExitPromptError') throw err;
              }
              done();
            }, 50);
          });
        }}
        onQuit={done}
      />
    );

    instance.waitUntilExit().then(() => {
      if (!runningCommand) done();
    });
  });
};
