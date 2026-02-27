import { readFileSync } from 'fs';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { loadCredentials } from '../auth/config.js';
import { insertRule } from '../api/client.js';
import { parseRuleMdcContent, parseFrontmatterKind } from '../lib/mdc-format.js';
import { SHARE_KIND_CHOICES, inferKindFromFilename } from '../lib/share-types.js';
import type { RuleInsert, RuleKind } from '../types.js';

const KIND_LABELS: Record<RuleKind, string> = {
  rule: 'rule',
  solution: 'solution',
  skill: 'skill',
  command: 'command',
};

/**
 * Infers RuleKind from file content (frontmatter kind) or filename prefix.
 */
export const inferKindFromFile = (filePath: string, rawContent: string): RuleKind | null => {
  const fromFrontmatter = parseFrontmatterKind(rawContent);
  if (fromFrontmatter) return fromFrontmatter;
  return inferKindFromFilename(filePath);
};

/**
 * Parses file content into RuleInsert. Uses explicitKind if provided, else inferred from file.
 * If kind cannot be determined, payload.kind may be left undefined (caller should prompt).
 */
export const parseFileToPayload = (
  filePath: string,
  rawContent: string,
  explicitKind?: RuleKind
): Omit<RuleInsert, 'kind'> & { kind?: RuleKind } => {
  const inferredKind = inferKindFromFile(filePath, rawContent);
  const kind = explicitKind ?? inferredKind ?? undefined;

  try {
    const parsed = JSON.parse(rawContent) as Record<string, unknown>;
    const payload: RuleInsert = {
      kind: (parsed.kind as RuleKind) ?? kind ?? 'rule',
      title: (parsed.title as string) ?? 'Untitled',
      description: (parsed.description as string) ?? '',
      body: (parsed.body as string) ?? '',
      context: typeof parsed.context === 'string' ? parsed.context : undefined,
      examples: Array.isArray(parsed.examples) ? (parsed.examples as string[]) : undefined,
      technologies: Array.isArray(parsed.technologies) ? (parsed.technologies as string[]) : undefined,
      globs: typeof parsed.globs === 'string' ? parsed.globs : undefined,
      always_apply: Boolean(parsed.always_apply),
    };
    if (explicitKind) payload.kind = explicitKind;
    else if (kind) payload.kind = kind;
    return payload;
  } catch {
    // not JSON
  }

  const mdc = parseRuleMdcContent(rawContent);
  if (mdc) {
    const titleFromBody = mdc.body.split('\n')[0]?.replace(/^#\s*/, '').trim() || 'Untitled';
    return {
      kind: explicitKind ?? mdc.kind ?? inferredKind ?? undefined,
      title: titleFromBody,
      description: mdc.description,
      body: mdc.body,
      globs: mdc.globs ?? undefined,
      always_apply: mdc.alwaysApply,
    };
  }

  const lines = rawContent.split('\n');
  const title = (lines[0] ?? '').replace(/^#\s*/, '').trim() || 'Untitled';
  return {
    kind: explicitKind ?? inferredKind ?? undefined,
    title,
    description: '',
    body: rawContent,
  };
};

const promptForKind = async (): Promise<RuleKind> => {
  const { kind } = await inquirer.prompt<{ kind: RuleKind }>([
    {
      name: 'kind',
      message: 'What are you sharing?',
      type: 'list',
      choices: SHARE_KIND_CHOICES.map((c) => ({ name: `${c.name} – ${c.description}`, value: c.value })),
    },
  ]);
  return kind;
};

/**
 * Unified share push: optionally read from file, infer or prompt for kind, then publish.
 */
export const runSharePush = async (
  file?: string,
  options?: { kind?: RuleKind; projectId?: string }
): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }

  let payload: RuleInsert;

  if (file) {
    const raw = readFileSync(file, 'utf-8');
    const parsed = parseFileToPayload(file, raw, options?.kind);
    let kind = parsed.kind;
    if (!kind) {
      kind = await promptForKind();
    }
    payload = {
      kind,
      title: parsed.title,
      description: parsed.description ?? '',
      body: parsed.body,
      context: parsed.context,
      examples: parsed.examples,
      technologies: parsed.technologies,
      project_id: options?.projectId,
      globs: parsed.globs,
      always_apply: parsed.always_apply,
    };
  } else {
    const kind = options?.kind ?? (await promptForKind());
    const answers = await inquirer.prompt<{ title: string; description: string; body: string }>([
      { name: 'title', message: 'Title', type: 'input', default: 'Untitled' },
      { name: 'description', message: 'Description', type: 'input', default: '' },
      { name: 'body', message: 'Content', type: 'editor', default: '' },
    ]);
    payload = {
      kind,
      title: answers.title,
      description: answers.description,
      body: answers.body,
      project_id: options?.projectId,
    };
  }

  if (options?.projectId) {
    payload = { ...payload, project_id: options.projectId };
  }

  const label = KIND_LABELS[payload.kind];
  const spinner = ora(`Publishing ${label}…`).start();
  const created = await insertRule(payload);
  spinner.succeed(chalk.green(`Published ${label} `) + created.id);
  console.log(chalk.dim(created.title));
};
