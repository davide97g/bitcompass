import { readFileSync, writeFileSync } from 'fs';
import inquirer from 'inquirer';
import { createSpinner } from '../lib/spinner.js';
import chalk from 'chalk';
import { basename, dirname, relative, resolve } from 'path';
import { loadCredentials } from '../auth/config.js';
import { insertRule, updateRule, getRuleById } from '../api/client.js';
import { loadProjectConfig, getProjectRoot, SPECIAL_FILE_TARGETS } from '../auth/project-config.js';
import { parseRuleMdcContent, parseFrontmatterKind, writeIdToFrontmatter } from '../lib/mdc-format.js';
import { bumpRuleVersionMajor } from '../lib/version-bump.js';
import { SHARE_KIND_CHOICES, inferKindFromFilename } from '../lib/share-types.js';
import type { RuleInsert, RuleKind } from '../types.js';

const KIND_LABELS: Record<RuleKind, string> = {
  rule: 'rule',
  documentation: 'doc',
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
    const payload: Omit<RuleInsert, 'kind'> & { kind?: RuleKind } = {
      kind: (parsed.kind as RuleKind) ?? kind ?? 'rule',
      title: (parsed.title as string) ?? 'Untitled',
      description: (parsed.description as string) ?? '',
      body: (parsed.body as string) ?? '',
      context: typeof parsed.context === 'string' ? parsed.context : undefined,
      examples: Array.isArray(parsed.examples) ? (parsed.examples as string[]) : undefined,
      technologies: Array.isArray(parsed.technologies) ? (parsed.technologies as string[]) : undefined,
      globs: typeof parsed.globs === 'string' ? parsed.globs : undefined,
      always_apply: Boolean(parsed.always_apply),
      version: typeof parsed.version === 'string' ? parsed.version : undefined,
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
      version: mdc.version ?? undefined,
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

/**
 * Auto-detect special file target from a file path.
 * Matches against known SPECIAL_FILE_TARGETS paths.
 */
const inferSpecialFileTarget = (filePath: string): string | null => {
  const normalized = filePath.replace(/\\/g, '/');
  for (const [key, target] of Object.entries(SPECIAL_FILE_TARGETS)) {
    if (normalized === target.path || normalized.endsWith('/' + target.path) || basename(normalized) === target.path) {
      return key;
    }
  }
  return null;
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
  options?: { kind?: RuleKind; projectId?: string; specialFile?: string; forceNew?: boolean; relativePath?: string }
): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }

  // Auto-detect project from config (explicit --project-id takes precedence)
  let projectId = options?.projectId ?? null;
  let autoProject = false;
  if (!projectId) {
    const projectConfig = loadProjectConfig();
    if (projectConfig?.compassProjectId) {
      projectId = projectConfig.compassProjectId;
      autoProject = true;
    }
  }

  // When scoped to a project, default to public visibility
  const visibility = projectId ? 'public' : 'private';

  // Compute relative_path: explicit option, or auto-infer from file location
  let relativePath = options?.relativePath ?? undefined;
  if (!relativePath && file) {
    const root = getProjectRoot();
    const fileDir = dirname(resolve(file));
    const rel = relative(root, fileDir);
    // Only set if the file is in a subdirectory (not at root or outside)
    if (rel && !rel.startsWith('..') && rel !== '.') {
      relativePath = rel;
    }
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
      project_id: projectId,
      globs: parsed.globs,
      always_apply: parsed.always_apply,
      version: parsed.version ? bumpRuleVersionMajor(parsed.version) : '1.0.0',
      visibility,
      special_file_target: options?.specialFile ?? inferSpecialFileTarget(file) ?? undefined,
      relative_path: relativePath,
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
      project_id: projectId,
      version: '1.0.0',
      visibility,
      special_file_target: options?.specialFile ?? undefined,
      relative_path: relativePath,
    };
  }

  const label = KIND_LABELS[payload.kind];

  // Check if this file already has an ID in frontmatter (update vs insert)
  let existingId: string | undefined;
  if (file && !options?.forceNew) {
    const raw = readFileSync(file, 'utf-8');
    const parsed = parseRuleMdcContent(raw);
    if (parsed?.id) {
      existingId = parsed.id;
    }
  }

  if (existingId) {
    // Check if the remote rule still exists
    const remote = await getRuleById(existingId).catch(() => null);
    if (remote) {
      const spinner = createSpinner(`Updating ${label}…`);
      const updated = await updateRule(existingId, {
        title: payload.title,
        description: payload.description,
        body: payload.body,
        context: payload.context,
        examples: payload.examples,
        technologies: payload.technologies,
        globs: payload.globs,
        always_apply: payload.always_apply,
        version: payload.version,
        special_file_target: payload.special_file_target,
        relative_path: payload.relative_path,
      });
      spinner.succeed(chalk.green(`Updated ${label} `) + updated.id);
      console.log(chalk.dim(updated.title));
      if (projectId) {
        console.log(
          chalk.dim(autoProject ? 'Auto-linked to project ' : 'Linked to project ') +
            chalk.cyan(projectId) +
            chalk.dim(` (${visibility})`)
        );
      }
      return;
    }
    // Orphaned ID — fall through to insert as new
  }

  const spinner = createSpinner(`Publishing ${label}…`);
  const created = await insertRule(payload);
  spinner.succeed(chalk.green(`Published ${label} `) + created.id);
  console.log(chalk.dim(created.title));

  // Write the new ID back into the file's frontmatter for future updates
  if (file) {
    const raw = readFileSync(file, 'utf-8');
    const updated = writeIdToFrontmatter(raw, created.id, payload.version);
    if (updated !== raw) {
      writeFileSync(file, updated);
      console.log(chalk.dim('Wrote ID back to file for future updates.'));
    }
  }

  if (projectId) {
    console.log(
      chalk.dim(autoProject ? 'Auto-linked to project ' : 'Linked to project ') +
        chalk.cyan(projectId) +
        chalk.dim(` (${visibility})`)
    );
  }
};
