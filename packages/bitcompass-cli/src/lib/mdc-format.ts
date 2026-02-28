import type { Rule, RuleKind } from '../types.js';
import { isValidRuleKind } from './share-types.js';
import { titleToSlug } from './slug.js';

const FRONTMATTER_DELIM = '---';

/**
 * Builds Cursor .mdc content for a rule: YAML frontmatter (description, globs, alwaysApply, kind) then body.
 */
export const buildRuleMdcContent = (rule: Rule): string => {
  const lines: string[] = [FRONTMATTER_DELIM];
  lines.push(`kind: ${rule.kind}`);
  lines.push(`description: ${escapeYamlValue(rule.description ?? '')}`);
  if (rule.globs != null && String(rule.globs).trim() !== '') {
    lines.push(`globs: ${escapeYamlValue(String(rule.globs).trim())}`);
  }
  lines.push(`alwaysApply: ${rule.always_apply === true}`);
  lines.push(FRONTMATTER_DELIM);
  lines.push('');
  lines.push(rule.body.trimEnd());
  if (!rule.body.endsWith('\n')) {
    lines.push('');
  }
  return lines.join('\n');
};

/**
 * Builds .md content for solution, skill, or command with frontmatter (kind, description)
 * so that bitcompass share can infer kind when re-pushing. Used for cache and round-trip.
 */
export const buildMarkdownWithKind = (rule: Rule): string => {
  if (rule.kind === 'rule') {
    return buildRuleMdcContent(rule);
  }
  const lines: string[] = [FRONTMATTER_DELIM];
  lines.push(`kind: ${rule.kind}`);
  lines.push(`description: ${escapeYamlValue(rule.description ?? '')}`);
  lines.push(FRONTMATTER_DELIM);
  lines.push('');
  lines.push(`# ${rule.title}`);
  lines.push('');
  if (rule.description) {
    lines.push(rule.description);
    lines.push('');
  }
  if (rule.kind === 'solution') {
    lines.push('## Solution');
    lines.push('');
  }
  lines.push(rule.body.trimEnd());
  if (!rule.body.endsWith('\n')) {
    lines.push('');
  }
  return lines.join('\n');
};

/**
 * Builds skill .md content for .cursor/skills: YAML frontmatter (name, description) then body.
 * Matches create-skill SKILL.md format (name and description only, no alwaysApply/globs).
 */
export const buildSkillContent = (rule: Rule): string => {
  const name = titleToSlug(rule.title) || rule.id;
  const lines: string[] = [FRONTMATTER_DELIM];
  lines.push(`name: ${name}`);
  lines.push(`description: ${escapeYamlValue(rule.description ?? '')}`);
  lines.push(FRONTMATTER_DELIM);
  lines.push('');
  lines.push(rule.body.trimEnd());
  if (!rule.body.endsWith('\n')) {
    lines.push('');
  }
  return lines.join('\n');
};

/**
 * Builds command .md content for .cursor/commands: plain markdown, no frontmatter.
 */
export const buildCommandContent = (rule: Rule): string => {
  const body = rule.body.trimEnd();
  return body ? (body.endsWith('\n') ? body : body + '\n') : '\n';
};

/**
 * Builds solution .md content for .cursor/documentation: plain markdown, no frontmatter.
 */
export const buildSolutionContent = (rule: Rule): string => {
  const body = rule.body.trimEnd();
  return body ? (body.endsWith('\n') ? body : body + '\n') : '\n';
};

const escapeYamlValue = (s: string): string => {
  if (/^[a-z0-9-]+$/i.test(s) && !s.includes(':')) return s;
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
};

export interface ParsedMdcFrontmatter {
  description: string;
  globs?: string;
  alwaysApply: boolean;
  kind?: RuleKind;
  body: string;
}

/**
 * Parses .mdc content: frontmatter (description, globs, alwaysApply) and body.
 * Returns null if the file does not start with --- (not frontmatter format).
 */
export const parseRuleMdcContent = (raw: string): ParsedMdcFrontmatter | null => {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith(FRONTMATTER_DELIM)) {
    return null;
  }
  const rest = trimmed.slice(FRONTMATTER_DELIM.length);
  const endIdx = rest.indexOf('\n' + FRONTMATTER_DELIM);
  if (endIdx === -1) {
    return null;
  }
  const frontmatterBlock = rest.slice(0, endIdx).trim();
  const body = rest.slice(endIdx + FRONTMATTER_DELIM.length + 1).trimStart();

  let description = '';
  let globs: string | undefined;
  let alwaysApply = false;
  let kind: RuleKind | undefined;

  for (const line of frontmatterBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    switch (key) {
      case 'description':
        description = value;
        break;
      case 'globs':
        globs = value;
        break;
      case 'alwaysApply':
        alwaysApply = value === 'true' || value === '1';
        break;
      case 'kind':
        if (isValidRuleKind(value)) kind = value;
        break;
    }
  }

  return { description, globs, alwaysApply, kind, body };
};

/**
 * Returns kind from the first frontmatter block if present and valid.
 * Use for .md or .mdc files when you only need kind (e.g. solution/skill/command round-trip).
 */
export const parseFrontmatterKind = (raw: string): RuleKind | null => {
  const parsed = parseRuleMdcContent(raw);
  return parsed?.kind ?? null;
};
