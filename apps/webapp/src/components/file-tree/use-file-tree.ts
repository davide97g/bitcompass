import { useMemo } from 'react';
import { ruleDownloadBasename } from '@/lib/utils';
import type { Rule, RuleKind } from '@/types/bitcompass';
import {
  EDITOR_BASE_PATHS,
  KIND_SUBFOLDERS,
  SPECIAL_FILE_TARGETS,
  parseProjectEditor,
  type EditorProvider,
  type FileTree,
  type TreeFile,
  type TreeFolder,
} from './file-tree-constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KINDS: RuleKind[] = ['rule', 'skill', 'command', 'documentation'];

function extensionForKind(kind: RuleKind): string {
  return kind === 'rule' ? '.mdc' : '.md';
}

/**
 * Build a filename for a rule, handling collisions by appending a short id
 * suffix when two rules would otherwise share the same filename.
 */
function buildFilenames(rules: Rule[], kind: RuleKind): TreeFile[] {
  const ext = extensionForKind(kind);

  // First pass: compute base names
  const entries = rules.map((r) => ({
    rule: r,
    base: ruleDownloadBasename(r.title, r.id),
  }));

  // Detect collisions
  const counts = new Map<string, number>();
  for (const e of entries) {
    counts.set(e.base, (counts.get(e.base) ?? 0) + 1);
  }

  // Second pass: disambiguate
  return entries.map(({ rule, base }) => {
    const needsSuffix = (counts.get(base) ?? 0) > 1;
    const filename = needsSuffix ? `${base}-${rule.id.slice(0, 6)}${ext}` : `${base}${ext}`;
    return {
      ruleId: rule.id,
      filename,
      title: rule.title,
      kind,
    };
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFileTree(
  rules: Rule[],
  projectConfig: Record<string, unknown> | null | undefined,
): FileTree {
  const editor: EditorProvider = parseProjectEditor(projectConfig);

  return useMemo(() => {
    const editorBase = EDITOR_BASE_PATHS[editor];

    // Partition rules by kind, separating special-file-target rules
    const kindBuckets: Record<RuleKind, Rule[]> = {
      rule: [],
      skill: [],
      command: [],
      documentation: [],
    };
    const specialRules: Rule[] = [];

    for (const r of rules) {
      if (
        r.special_file_target &&
        typeof r.special_file_target === 'string' &&
        r.special_file_target in SPECIAL_FILE_TARGETS
      ) {
        specialRules.push(r);
      } else if (kindBuckets[r.kind]) {
        kindBuckets[r.kind].push(r);
      }
    }

    // Build folders (only include non-empty ones)
    const folders: TreeFolder[] = KINDS.filter((k) => kindBuckets[k].length > 0).map((kind) => ({
      name: KIND_SUBFOLDERS[kind],
      kind,
      files: buildFilenames(kindBuckets[kind], kind),
    }));

    // Build special files list
    const specialFiles: TreeFile[] = specialRules.map((r) => {
      const target = SPECIAL_FILE_TARGETS[r.special_file_target!];
      return {
        ruleId: r.id,
        filename: target.path,
        title: r.title,
        kind: r.kind,
      };
    });

    const totalFiles = folders.reduce((sum, f) => sum + f.files.length, 0);

    return {
      editorBase,
      editor,
      folders,
      specialFiles,
      stats: {
        totalFiles,
        totalFolders: folders.length,
        totalSpecialFiles: specialFiles.length,
      },
    };
  }, [rules, editor]);
}
