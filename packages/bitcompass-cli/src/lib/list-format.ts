import chalk from 'chalk';

export interface ListRow {
  id: string;
  title: string;
  kind?: string;
}

const ID_COLUMN_WIDTH = 36;
const TITLE_MAX_WIDTH = 50;
const KIND_WIDTH = 10;

/**
 * Format a list of rules/items for terminal output.
 * When useTable is true (TTY or --table), prints aligned columns; otherwise one line per row for scripts/CI.
 */
export const formatList = (
  list: ListRow[],
  options: { useTable: boolean; showKind?: boolean }
): void => {
  if (list.length === 0) return;

  const { useTable, showKind = false } = options;

  if (useTable) {
    const titleWidth = Math.min(
      TITLE_MAX_WIDTH,
      Math.max(...list.map((r) => r.title.length), 5)
    );
    const headerKind = showKind ? chalk.dim('Kind'.padEnd(KIND_WIDTH)) + ' ' : '';
    console.log(
      chalk.bold('ID'.padEnd(ID_COLUMN_WIDTH)) +
        ' ' +
        chalk.bold('Title'.padEnd(titleWidth)) +
        (showKind ? ' ' + chalk.bold('Kind') : '')
    );
    const sep = '-'.repeat(ID_COLUMN_WIDTH + 1 + titleWidth + (showKind ? KIND_WIDTH + 2 : 0));
    console.log(chalk.dim(sep));
    for (const r of list) {
      const id = r.id.length > ID_COLUMN_WIDTH ? r.id.slice(0, ID_COLUMN_WIDTH - 1) + '…' : r.id.padEnd(ID_COLUMN_WIDTH);
      const title = r.title.length > titleWidth ? r.title.slice(0, titleWidth - 1) + '…' : r.title.padEnd(titleWidth);
      const kindPart = showKind ? ' ' + (r.kind ?? '').padEnd(KIND_WIDTH) : '';
      console.log(chalk.dim(id) + ' ' + chalk.cyan(title) + kindPart);
    }
  } else {
    list.forEach((r) => console.log(`${chalk.cyan(r.title)}  ${chalk.dim(r.id)}`));
  }
};

/** Use table format when stdout is a TTY or when tableFlag is true. */
export const shouldUseTable = (tableFlag?: boolean): boolean =>
  Boolean(tableFlag ?? process.stdout.isTTY);
