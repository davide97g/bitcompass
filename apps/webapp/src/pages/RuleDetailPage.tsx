import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRule, useUpdateRule, useDeleteRule } from '@/hooks/use-rules';
import { useCompassProjects } from '@/hooks/use-compass-projects';
import {
  useRuleGroupsForRule,
  useRuleGroups,
  useAddRuleToGroup,
  useRemoveRuleFromGroup,
} from '@/hooks/use-rule-groups';
import { useAuth } from '@/hooks/use-auth';
import { useProfilesByIds } from '@/hooks/use-profiles';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import type { Rule, RuleKind, RuleVisibility } from '@/types/bitcompass';
import { ArrowLeft, FileDown, FolderTree, Layers, Pencil, Trash2, User, Link2, Lock, Globe, X, Plus, FileText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { PageHeader } from '@/components/ui/page-header';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { CommandBlock } from '@/components/ui/CommandBlock';
import { ruleDownloadBasename, cn, bumpRuleVersionMajor } from '@/lib/utils';
import { getTechStyle } from '@/lib/tech-styles';
import { Badge } from '@/components/ui/badge';
import { RuleDetailSkeleton } from '@/components/skeletons';

const getPullCommand = (ruleId: string, kind: RuleKind, useCopy = false): string => {
  const prefixMap: Record<RuleKind, string> = {
    rule: 'bitcompass rules pull ',
    solution: 'bitcompass solutions pull ',
    skill: 'bitcompass skills pull ',
    command: 'bitcompass commands pull ',
  };
  const copyFlag = useCopy ? ' --copy' : '';
  return `${prefixMap[kind]}${ruleId}${copyFlag}`;
};

const getKindDescription = (kind: RuleKind): string => {
  const descriptions: Record<RuleKind, string> = {
    rule: 'Rule',
    solution: 'Problem solution',
    skill: 'Skill',
    command: 'Command',
  };
  return descriptions[kind];
};

/** Special file output targets with display info. */
const SPECIAL_FILE_TARGETS: Record<string, { path: string; description: string }> = {
  'claude.md': { path: 'CLAUDE.md', description: 'Claude Code project instructions' },
  'agents.md': { path: 'AGENTS.md', description: 'OpenAI Codex instructions' },
  'cursorrules': { path: '.cursorrules', description: 'Cursor legacy rules' },
  'copilot-instructions': { path: '.github/copilot-instructions.md', description: 'GitHub Copilot instructions' },
  'windsurfrules': { path: '.windsurfrules', description: 'Windsurf rules' },
};

/** Card/recap accent by kind (align with list cards) */
const RECAP_KIND_BORDER: Record<RuleKind, string> = {
  rule: 'dark:border-l-sky-500/40',
  solution: 'dark:border-l-emerald-500/40',
  skill: 'dark:border-l-violet-500/40',
  command: 'dark:border-l-amber-500/40',
};

const downloadRule = (rule: Rule, format: 'json' | 'markdown'): void => {
  const basename = ruleDownloadBasename(rule.title, rule.id);
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(rule, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${basename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const text = `# ${rule.title}\n\n${rule.description}\n\n${rule.body}\n`;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${basename}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

export default function RuleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: rule, isLoading, error } = useRule(id);
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: compassProjects = [] } = useCompassProjects();
  const { data: ruleGroups = [] } = useRuleGroupsForRule(id);
  const { data: allGroups = [] } = useRuleGroups();
  const addToGroup = useAddRuleToGroup();
  const removeFromGroup = useRemoveRuleFromGroup();
  const isOwner = Boolean(user && rule && user.id === rule.user_id);
  const assignedGroupIds = new Set(ruleGroups.map((g) => g.id));
  const availableGroups = allGroups.filter((g) => !assignedGroupIds.has(g.id));
  const authorUserId = rule?.user_id ? [rule.user_id] : [];
  const { data: authorProfiles = [] } = useProfilesByIds(authorUserId);
  const authorName = rule?.author_display_name
    || authorProfiles[0]?.full_name
    || authorProfiles[0]?.email
    || 'Unknown author';
  const projectIdToTitle = Object.fromEntries(compassProjects.map((p) => [p.id, p.title]));
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    body: '',
    version: '1.0.0',
    technologies: [] as string[],
    project_id: undefined as string | null | undefined,
    special_file_target: null as string | null,
  });
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleStartEdit = () => {
    if (rule) {
      setEditForm({
        title: rule.title,
        description: rule.description,
        body: rule.body,
        version: bumpRuleVersionMajor(rule.version),
        technologies: rule.technologies || [],
        project_id: rule.project_id ?? undefined,
        special_file_target: rule.special_file_target ?? null,
      });
      setEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!id || !rule) return;
    try {
      const newVersion = bumpRuleVersionMajor(rule.version);
      await updateRule.mutateAsync({
        id,
        updates: {
          title: editForm.title,
          description: editForm.description,
          body: editForm.body,
          version: newVersion,
          technologies: editForm.technologies,
          project_id: editForm.project_id ?? undefined,
          special_file_target: editForm.special_file_target,
        },
      });
      toast({ title: 'Updated' });
      setEditing(false);
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleProjectChange = async (projectId: string | null) => {
    if (!id) return;
    try {
      await updateRule.mutateAsync({
        id,
        updates: { project_id: projectId },
      });
      toast({
        title: projectId ? 'Linked to project' : 'Unlinked (global)',
      });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleVisibilityToggle = async (checked: boolean) => {
    if (!id || !rule) return;
    const newVisibility: RuleVisibility = checked ? 'public' : 'private';
    try {
      await updateRule.mutateAsync({
        id,
        updates: { visibility: newVisibility },
      });
      toast({ title: `Visibility changed to ${newVisibility}` });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteRule.mutateAsync(id);
      toast({ title: 'Deleted' });
      navigate('/rules');
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
    setDeleteOpen(false);
  };

  if (isLoading || !id) {
    return (
      <div className="space-y-6">
        <RuleDetailSkeleton />
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/rules">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rules
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Rule not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!id) return null;

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: 'Rules', href: '/rules' }, { label: rule.title }]} />
      <PageHeader
        title={editing ? `Edit ${rule.kind}` : rule.title}
        description={getKindDescription(rule.kind)}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/rules">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          {!editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleStartEdit} aria-label="Edit">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => downloadRule(rule, 'markdown')} aria-label="Download Markdown">
                <FileDown className="mr-2 h-4 w-4" />
                Download MD
              </Button>
              <Button variant="ghost" size="sm" onClick={() => downloadRule(rule, 'json')} aria-label="Download JSON">
                Download JSON
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-destructive" aria-label="Delete">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => void handleSaveEdit()} disabled={updateRule.isPending}>
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      {/* ReCAP: Type, Version, Author, Tech stack, Project, Pull to project — grouped and always on top */}
      <Card
        id="pull-to-project"
        className={cn(
          'border-l-4 dark:border-l-4 border-border dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-sm',
          RECAP_KIND_BORDER[rule.kind]
        )}
      >
        <CardContent className="p-5 space-y-4">
          {/* Metadata row: Type, Version, Author, Tech stack */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-muted-foreground dark:text-zinc-400 font-medium">
              Type: <span className="text-foreground">{getKindDescription(rule.kind)}</span>
            </span>
            {rule.version && (
              <span className="text-muted-foreground dark:text-zinc-400">
                Version: <span className="font-medium text-foreground">v{rule.version}</span>
              </span>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground dark:text-zinc-400">
              <User className="h-4 w-4 shrink-0" aria-hidden />
              <span>Author:{' '}
                <Link to={`/users/${rule.user_id}`} className="text-foreground hover:underline">
                  {authorName}
                </Link>
              </span>
            </div>
            {isOwner ? (
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <Lock className={cn('h-3.5 w-3.5', rule.visibility === 'private' ? 'text-zinc-400' : 'text-zinc-600')} />
                <Switch
                  checked={rule.visibility === 'public'}
                  onCheckedChange={(checked) => void handleVisibilityToggle(checked)}
                  disabled={updateRule.isPending}
                  aria-label="Toggle visibility"
                />
                <Globe className={cn('h-3.5 w-3.5', rule.visibility === 'public' ? 'text-green-400' : 'text-zinc-600')} />
                <span className="text-xs text-muted-foreground">
                  {rule.visibility === 'public' ? 'Public' : 'Private'}
                </span>
              </label>
            ) : (
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border',
                rule.visibility === 'public'
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
              )}>
                {rule.visibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {rule.visibility === 'public' ? 'Public' : 'Private'}
              </span>
            )}
            {rule.special_file_target && SPECIAL_FILE_TARGETS[rule.special_file_target] && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border bg-orange-500/10 text-orange-400 border-orange-500/20 cursor-help">
                      <FileText className="h-3 w-3" />
                      {SPECIAL_FILE_TARGETS[rule.special_file_target].path}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{SPECIAL_FILE_TARGETS[rule.special_file_target].description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      When pulled, this rule writes directly to <code className="font-mono">{SPECIAL_FILE_TARGETS[rule.special_file_target].path}</code> in your project root
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {rule.technologies && rule.technologies.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {rule.technologies.map((tech) => {
                  const style = getTechStyle(tech);
                  return (
                    <span
                      key={tech}
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border',
                        style.bg,
                        style.text,
                        style.border
                      )}
                    >
                      {tech}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Project */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground dark:text-zinc-400 flex items-center gap-1.5">
              <Layers className="h-4 w-4 shrink-0" aria-hidden />
              Project:
            </span>
            <Badge variant="outline" className="text-xs font-normal">
              {rule.project_id ? (
                <Link to={`/compass-projects/${rule.project_id}`} className="hover:underline">
                  {projectIdToTitle[rule.project_id] ?? 'Project'}
                </Link>
              ) : (
                <span>Global (open to everyone)</span>
              )}
            </Badge>
            {!editing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" aria-label="Change project">
                    Change project
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => handleProjectChange(null)}>
                    Global (default – open to everyone)
                  </DropdownMenuItem>
                  {compassProjects.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => handleProjectChange(p.id)}
                    >
                      {p.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Groups */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground dark:text-zinc-400 flex items-center gap-1.5">
              <FolderTree className="h-4 w-4 shrink-0" aria-hidden />
              Groups:
            </span>
            {ruleGroups.length === 0 && (
              <span className="text-sm text-muted-foreground">None</span>
            )}
            {ruleGroups.map((g) => (
              <Badge key={g.id} variant="outline" className="text-xs font-normal gap-1">
                <Link to={`/groups/${g.id}`} className="hover:underline">
                  {g.title}
                </Link>
                {isOwner && (
                  <button
                    type="button"
                    className="ml-1 hover:text-destructive"
                    onClick={() => {
                      if (id) void removeFromGroup.mutateAsync({ groupId: g.id, ruleId: id });
                    }}
                    aria-label={`Remove from ${g.title}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
            {isOwner && !editing && availableGroups.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add to group
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                  {availableGroups.map((g) => (
                    <DropdownMenuItem
                      key={g.id}
                      onClick={() => {
                        if (id) void addToGroup.mutateAsync({ groupId: g.id, ruleId: id });
                      }}
                    >
                      {g.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Pull to project: explanatory text + command + copy (grouped) */}
          <div className="space-y-2 pt-2 border-t border-border dark:border-white/10">
            <p className="text-sm font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4" aria-hidden />
              Pull to project
            </p>
            <p className="text-xs text-muted-foreground dark:text-zinc-400">
              Run this in your terminal to install this {getKindDescription(rule.kind).toLowerCase()} into your project{rule.special_file_target && SPECIAL_FILE_TARGETS[rule.special_file_target] ? `. Output: ${SPECIAL_FILE_TARGETS[rule.special_file_target].path}` : ' (symbolic link)'}. Copy the command with the button.
            </p>
            <CommandBlock commands={[getPullCommand(id, rule.kind, false)]} />
            <p className="text-xs text-muted-foreground dark:text-zinc-400">
              To copy the file instead of a symlink, use:{' '}
              <code className="bg-muted dark:bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs">
                {getPullCommand(id, rule.kind, true)}
              </code>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Version (auto-bumped on save)</Label>
                <Input
                  value={editForm.version}
                  readOnly
                  className="bg-muted"
                  placeholder="1.0.0"
                  aria-label="Version, automatically set on save"
                />
              </div>
              <div className="space-y-2">
                <Label>Compass project (optional)</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={editForm.project_id ?? ''}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, project_id: e.target.value || undefined }))
                  }
                  aria-label="Scope to Compass project"
                >
                  <option value="">Global (default – open to everyone)</option>
                  {compassProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Technologies (comma-separated)</Label>
                <Input
                  value={editForm.technologies.join(', ')}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      technologies: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                    }))
                  }
                  placeholder="React, TypeScript, Tailwind"
                />
              </div>
              <div className="space-y-2">
                <Label>Special file target (optional)</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={editForm.special_file_target ?? ''}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, special_file_target: e.target.value || null }))
                  }
                  aria-label="Map to a special output file"
                >
                  <option value="">None (default)</option>
                  {Object.entries(SPECIAL_FILE_TARGETS).map(([key, target]) => (
                    <option key={key} value={key}>
                      {target.path} – {target.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <textarea
                  className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editForm.body}
                  onChange={(e) => setEditForm((p) => ({ ...p, body: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <div>
              {rule.description && <p className="text-muted-foreground mb-4">{rule.description}</p>}
              <MarkdownContent content={rule.body} />
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {rule.kind}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
