import inquirer from 'inquirer';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  getEditorDefaultPath,
  loadProjectConfig,
  saveProjectConfig,
  getProjectConfigDir,
} from '../auth/project-config.js';
import type { EditorProvider, ProjectConfig } from '../types.js';

const EDITOR_CHOICES: { name: string; value: EditorProvider }[] = [
  { name: 'VSCode', value: 'vscode' },
  { name: 'Cursor', value: 'cursor' },
  { name: 'Antigrativity', value: 'antigrativity' },
  { name: 'Claude Code', value: 'claudecode' },
];

const GITIGNORE_ENTRY = '.bitcompass';

const ensureGitignoreEntry = (): void => {
  const gitignorePath = join(process.cwd(), '.gitignore');
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, `${GITIGNORE_ENTRY}\n`, 'utf-8');
    return;
  }
  const content = readFileSync(gitignorePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const hasEntry = lines.some((line) => line.trim() === GITIGNORE_ENTRY);
  if (hasEntry) return;
  const trimmed = content.trimEnd();
  const suffix = trimmed ? '\n' : '';
  writeFileSync(gitignorePath, `${trimmed}${suffix}\n${GITIGNORE_ENTRY}\n`, 'utf-8');
};

export const runInit = async (): Promise<void> => {
  const existing = loadProjectConfig();
  const answers = await inquirer.prompt<{ editor: EditorProvider; outputPath: string }>([
    {
      name: 'editor',
      message: 'Editor / AI provider',
      type: 'list',
      choices: EDITOR_CHOICES,
      default: existing?.editor ?? 'cursor',
    },
    {
      name: 'outputPath',
      message: 'Folder for rules/docs/commands output',
      type: 'input',
      default: ({ editor }: { editor: EditorProvider }) => getEditorDefaultPath(editor),
    },
  ]);

  const config: ProjectConfig = {
    editor: answers.editor,
    outputPath: answers.outputPath.trim() || getEditorDefaultPath(answers.editor),
  };

  saveProjectConfig(config);
  ensureGitignoreEntry();

  console.log(chalk.green('Project configured.'));
  console.log(chalk.dim('Config:'), join(getProjectConfigDir(), 'config.json'));
  console.log(chalk.dim('Editor:'), config.editor);
  console.log(chalk.dim('Output path:'), config.outputPath);
  console.log(chalk.dim('.gitignore:'), GITIGNORE_ENTRY, 'added or already present.');
};
