import type { Rule, RuleKind } from '../types.js';
import { isValidRuleKind } from './share-types.js';
import { titleToSlug } from './slug.js';

const FRONTMATTER_DELIM = '---';

/**
 * Builds Cursor .mdc content for a rule: YAML frontmatter (id, version, description, globs, alwaysApply, kind) then body.
 */
export const buildRuleMdcContent = (rule: Rule): string => {
  const lines: string[] = [FRONTMATTER_DELIM];
  lines.push(`kind: ${rule.kind}`);
  lines.push(`id: ${rule.id}`);
  if (rule.version != null && String(rule.version).trim() !== '') {
    lines.push(`version: ${escapeYamlValue(String(rule.version).trim())}`);
  }
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
 * Builds .md content for solution, skill, or command with frontmatter (kind, id, version, description)
 * so that bitcompass share can infer kind when re-pushing. Used for cache and round-trip.
 */
export const buildMarkdownWithKind = (rule: Rule): string => {
  if (rule.kind === 'rule') {
    return buildRuleMdcContent(rule);
  }
  const lines: string[] = [FRONTMATTER_DELIM];
  lines.push(`kind: ${rule.kind}`);
  lines.push(`id: ${rule.id}`);
  if (rule.version != null && String(rule.version).trim() !== '') {
    lines.push(`version: ${escapeYamlValue(String(rule.version).trim())}`);
  }
  lines.push(`description: ${escapeYamlValue(rule.description ?? '')}`);
  lines.push(FRONTMATTER_DELIM);
  lines.push('');
  lines.push(`# ${rule.title}`);
  lines.push('');
  if (rule.description) {
    lines.push(rule.description);
    lines.push('');
  }
  if (rule.kind === 'documentation') {
    lines.push('## Documentation');
    lines.push('');
  }
  lines.push(rule.body.trimEnd());
  if (!rule.body.endsWith('\n')) {
    lines.push('');
  }
  return lines.join('\n');
};

/**
 * Builds skill .md content for .cursor/skills: YAML frontmatter (name, id, version, description) then body.
 * Matches create-skill SKILL.md format (name and description only, no alwaysApply/globs).
 */
export const buildSkillContent = (rule: Rule): string => {
  const name = titleToSlug(rule.title) || rule.id;
  const lines: string[] = [FRONTMATTER_DELIM];
  lines.push(`name: ${name}`);
  lines.push(`id: ${rule.id}`);
  if (rule.version != null && String(rule.version).trim() !== '') {
    lines.push(`version: ${escapeYamlValue(String(rule.version).trim())}`);
  }
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
 * Builds command .md content for .cursor/commands: minimal frontmatter (id, version, kind) then body.
 */
export const buildCommandContent = (rule: Rule): string => {
  const lines: string[] = [FRONTMATTER_DELIM];
  lines.push(`kind: command`);
  lines.push(`id: ${rule.id}`);
  if (rule.version != null && String(rule.version).trim() !== '') {
    lines.push(`version: ${escapeYamlValue(String(rule.version).trim())}`);
  }
  lines.push(FRONTMATTER_DELIM);
  lines.push('');
  const body = rule.body.trimEnd();
  lines.push(body ? (body.endsWith('\n') ? body : body + '\n') : '\n');
  return lines.join('\n');
};

/**
 * Builds documentation .md content for .cursor/docs: minimal frontmatter (id, version, kind) then body.
 */
export const buildDocumentationContent = (rule: Rule): string => {
  const lines: string[] = [FRONTMATTER_DELIM];
  lines.push(`kind: documentation`);
  lines.push(`id: ${rule.id}`);
  if (rule.version != null && String(rule.version).trim() !== '') {
    lines.push(`version: ${escapeYamlValue(String(rule.version).trim())}`);
  }
  lines.push(FRONTMATTER_DELIM);
  lines.push('');
  const body = rule.body.trimEnd();
  lines.push(body ? (body.endsWith('\n') ? body : body + '\n') : '\n');
  return lines.join('\n');
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
  id?: string;
  version?: string | null;
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
  let id: string | undefined;
  let version: string | null | undefined;

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
      case 'id':
        id = value;
        break;
      case 'version':
        version = value;
        break;
    }
  }

  return { description, globs, alwaysApply, kind, id, version, body };
};

/**
 * Returns kind from the first frontmatter block if present and valid.
 * Use for .md or .mdc files when you only need kind (e.g. solution/skill/command round-trip).
 */
export const parseFrontmatterKind = (raw: string): RuleKind | null => {
  const parsed = parseRuleMdcContent(raw);
  return parsed?.kind ?? null;
};

/**
 * Writes or updates the `id` (and optionally `version`) field in a file's frontmatter.
 * If the file has no frontmatter, prepends a new frontmatter block with the id.
 * Returns the updated file content.
 */
export const writeIdToFrontmatter = (raw: string, id: string, version?: string): string => {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith(FRONTMATTER_DELIM)) {
    const rest = trimmed.slice(FRONTMATTER_DELIM.length);
    const endIdx = rest.indexOf('\n' + FRONTMATTER_DELIM);
    if (endIdx !== -1) {
      const frontmatterBlock = rest.slice(0, endIdx);
      const afterFrontmatter = rest.slice(endIdx + FRONTMATTER_DELIM.length + 1);
      const lines = frontmatterBlock.split('\n');

      // Update or add id
      let hasId = false;
      let hasVersion = false;
      for (let i = 0; i < lines.length; i++) {
        const colonIdx = lines[i].indexOf(':');
        if (colonIdx === -1) continue;
        const key = lines[i].slice(0, colonIdx).trim();
        if (key === 'id') {
          lines[i] = `id: ${id}`;
          hasId = true;
        } else if (key === 'version' && version) {
          lines[i] = `version: ${escapeYamlValue(version)}`;
          hasVersion = true;
        }
      }
      if (!hasId) lines.push(`id: ${id}`);
      if (!hasVersion && version) lines.push(`version: ${escapeYamlValue(version)}`);

      return FRONTMATTER_DELIM + lines.join('\n') + '\n' + FRONTMATTER_DELIM + afterFrontmatter;
    }
  }

  // No frontmatter — prepend a new block
  const fmLines = [FRONTMATTER_DELIM, `id: ${id}`];
  if (version) fmLines.push(`version: ${escapeYamlValue(version)}`);
  fmLines.push(FRONTMATTER_DELIM, '');
  return fmLines.join('\n') + raw;
};
