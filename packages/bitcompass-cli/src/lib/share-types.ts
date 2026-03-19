import type { RuleKind } from '../types.js';

const VALID_KINDS: RuleKind[] = ['rule', 'documentation', 'skill', 'command'];

export const SHARE_KIND_CHOICES: Array<{ value: RuleKind; name: string; description: string }> = [
  {
    value: 'rule',
    name: 'Rule',
    description: 'Behaviors, documentation, or how-to for the AI (e.g. i18n guide, coding standards)',
  },
  {
    value: 'documentation',
    name: 'Documentation',
    description: 'Reference docs, how-tos, problem solutions, or knowledge base articles',
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
 * Infers RuleKind from file extension (.mdc -> rule, .md -> null since kind is ambiguous).
 * Returns null if the kind cannot be determined from the filename alone.
 */
export const inferKindFromFilename = (filePath: string): RuleKind | null => {
  const base = filePath.split(/[/\\]/).pop() ?? '';
  const lower = base.toLowerCase();
  if (lower.endsWith('.mdc')) return 'rule';
  return null;
};
