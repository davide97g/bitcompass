import type { RuleKind } from '../types.js';

const VALID_KINDS: RuleKind[] = ['rule', 'solution', 'skill', 'command'];

export const SHARE_KIND_CHOICES: Array<{ value: RuleKind; name: string; description: string }> = [
  {
    value: 'rule',
    name: 'Rule',
    description: 'Behaviors, documentation, or how-to for the AI (e.g. i18n guide, coding standards)',
  },
  {
    value: 'solution',
    name: 'Solution',
    description: 'How we fixed or implemented a specific problem',
  },
  {
    value: 'skill',
    name: 'Skill',
    description: 'How the AI should behave in a domain (e.g. front-end design, back-end implementation)',
  },
  {
    value: 'command',
    name: 'Command (workflow)',
    description: 'A workflow or command (e.g. release checklist)',
  },
];

export const isValidRuleKind = (s: string): s is RuleKind =>
  VALID_KINDS.includes(s as RuleKind);

/**
 * Infers RuleKind from filename prefix (rule-*.mdc, solution-*.md, skill-*.md, command-*.md).
 * Returns null if the basename does not match a known prefix.
 */
export const inferKindFromFilename = (filePath: string): RuleKind | null => {
  const base = filePath.split(/[/\\]/).pop() ?? '';
  const lower = base.toLowerCase();
  if (lower.startsWith('rule-') && (lower.endsWith('.mdc') || lower.endsWith('.md'))) return 'rule';
  if (lower.startsWith('solution-') && (lower.endsWith('.md') || lower.endsWith('.mdc'))) return 'solution';
  if (lower.startsWith('skill-') && (lower.endsWith('.md') || lower.endsWith('.mdc'))) return 'skill';
  if (lower.startsWith('command-') && (lower.endsWith('.md') || lower.endsWith('.mdc'))) return 'command';
  return null;
};
