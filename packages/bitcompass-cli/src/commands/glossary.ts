import chalk from 'chalk';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Path to glossary.md in the CLI package (works when run from source or installed). */
const getGlossaryPath = (): string => join(__dirname, '..', '..', 'glossary.md');

export const runGlossary = (): void => {
  const path = getGlossaryPath();
  if (!existsSync(path)) {
    console.error(chalk.red('Glossary file not found.'));
    process.exit(1);
  }
  const content = readFileSync(path, 'utf8');
  console.log(content.trim());
};
