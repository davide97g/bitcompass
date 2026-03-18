import { useMemo, useState, useCallback } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useProjectRulesAll } from '@/hooks/use-rules';
import { useFileTree } from './use-file-tree';
import { FileTreeSidebar } from './FileTreeSidebar';
import { FileTreePreview } from './FileTreePreview';
import type { Rule } from '@/types/bitcompass';
import type { FileTree } from './file-tree-constants';

interface FileTreeViewProps {
  projectId: string;
  projectConfig: Record<string, unknown> | null | undefined;
}

/** Look up a Rule by ruleId across all folders and special files. */
function findRuleById(
  tree: FileTree,
  rules: Rule[],
  ruleId: string | null,
): Rule | null {
  if (!ruleId) return null;
  return rules.find((r) => r.id === ruleId) ?? null;
}

/** Get all folder names that contain items, for initial expansion. */
function getInitialExpanded(tree: FileTree): Set<string> {
  return new Set(tree.folders.filter((f) => f.files.length > 0).map((f) => f.name));
}

export function FileTreeView({ projectId, projectConfig }: FileTreeViewProps) {
  const { data, isLoading } = useProjectRulesAll(projectId);
  const rules = data?.data ?? [];
  const total = data?.total ?? 0;

  const tree = useFileTree(rules, projectConfig);

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string> | null>(null);

  // Once tree loads, initialize expanded folders to all non-empty folders
  const expanded = useMemo(() => {
    if (expandedFolders !== null) return expandedFolders;
    return getInitialExpanded(tree);
  }, [expandedFolders, tree]);

  const handleToggleFolder = useCallback((name: string) => {
    setExpandedFolders((prev) => {
      // If never explicitly set, start from all-expanded
      const base = prev !== null ? prev : getInitialExpanded(tree);
      const next = new Set(base);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, [tree]);

  const handleSelectFile = useCallback((id: string) => {
    setSelectedFileId((prev) => (prev === id ? null : id));
  }, []);

  const selectedRule = findRuleById(tree, rules, selectedFileId);

  const truncated = total > rules.length;

  return (
    <div className="bg-black/20 dark:bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-xl overflow-hidden min-h-[500px]">
      <ResizablePanelGroup direction="horizontal" className="h-full min-h-[500px]">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
          <FileTreeSidebar
            tree={tree}
            selectedFileId={selectedFileId}
            expandedFolders={expanded}
            onToggleFolder={handleToggleFolder}
            onSelectFile={handleSelectFile}
            isLoading={isLoading}
            truncated={truncated}
            total={total}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
          <FileTreePreview rule={selectedRule} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
