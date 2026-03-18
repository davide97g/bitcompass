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
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileDown,
  FolderTree,
  Layers,
  Pencil,
  Trash2,
  User,
  Lock,
  Globe,
  X,
  Plus,
  FileText,
  Tag,
  GitBranch,
  Terminal,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { ruleDownloadBasename, cn, bumpRuleVersionMajor } from '@/lib/utils';
import { getTechStyle } from '@/lib/tech-styles';
import { Badge } from '@/components/ui/badge';
import { RuleDetailSkeleton } from '@/components/skeletons';
import { useRuleDownloadCount } from '@/hooks/use-download-stats';
import { formatDistanceToNowStrict } from 'date-fns';

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

/** Display command for the pull snippet — hides the ugly ID. */
const getPullCommandDisplay = (kind: RuleKind): string => {
  const prefixMap: Record<RuleKind, string> = {
    rule: 'bitcompass rules pull',
    solution: 'bitcompass solutions pull',
    skill: 'bitcompass skills pull',
    command: 'bitcompass commands pull',
  };
  return `$ ${prefixMap[kind]}`;
};

/** Special file output targets with display info. */
const SPECIAL_FILE_TARGETS: Record<string, { path: string; description: string }> = {
  'claude.md': { path: 'CLAUDE.md', description: 'Claude Code project instructions' },
  'agents.md': { path: 'AGENTS.md', description: 'OpenAI Codex instructions' },
  'cursorrules': { path: '.cursorrules', description: 'Cursor legacy rules' },
  'copilot-instructions': { path: '.github/copilot-instructions.md', description: 'GitHub Copilot instructions' },
  'windsurfrules': { path: '.windsurfrules', description: 'Windsurf rules' },
};

/** Kind badge colors */
const KIND_BADGE_CLASSES: Record<RuleKind, string> = {
  rule: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  solution: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  skill: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  command: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
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
  const [pullCopied, setPullCopied] = useState(false);
  const { data: downloadCount } = useRuleDownloadCount(id);

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
      navigate('/skills');
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
    setDeleteOpen(false);
  };

  const handleCopyPull = async () => {
    if (!id || !rule) return;
    try {
      await navigator.clipboard.writeText(getPullCommand(id, rule.kind, false));
      setPullCopied(true);
      setTimeout(() => setPullCopied(false), 2000);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
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
          <Link to="/skills">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Skills
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
    <div className="space-y-0">
      {/* ── Header zone ── */}
      <div className="relative -mx-6 -mt-6 border-b border-border dark:border-white/10">
        <div className="absolute inset-0 dark:bg-gradient-to-b dark:from-violet-950/20 dark:to-transparent bg-gradient-to-b from-blue-50 to-transparent pointer-events-none" />
        <div className="relative px-6 pt-6 pb-8">
          {/* Breadcrumb */}
          <PageBreadcrumb items={[{ label: 'Skills & Rules', href: '/skills' }, { label: rule.title }]} />

          {/* Title + actions row */}
          <div className="mt-4 flex items-start justify-between gap-4">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {editing ? `Editing: ${rule.title}` : rule.title}
            </h1>
            <div className="flex items-center gap-1.5 shrink-0">
              {!editing ? (
                <>
                  {isOwner && (
                    <Button variant="ghost" size="sm" onClick={handleStartEdit} className="h-8 w-8 p-0" aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Download">
                        <FileDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => downloadRule(rule, 'markdown')}>
                        Download .md
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadRule(rule, 'json')}>
                        Download .json
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {isOwner && (
                    <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="h-8 w-8 p-0 text-destructive hover:text-destructive" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
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
          </div>

          {/* Metadata chips row — icons only, no labels */}
          <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm">
            {/* Kind badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border capitalize',
                KIND_BADGE_CLASSES[rule.kind]
              )}
            >
              <Tag className="h-3 w-3" />
              {rule.kind}
            </span>

            {/* Visibility */}
            {isOwner ? (
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none px-2 py-1 rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03]">
                <Lock className={cn('h-3 w-3', rule.visibility === 'private' ? 'text-zinc-400' : 'text-zinc-600 dark:text-zinc-600')} />
                <Switch
                  checked={rule.visibility === 'public'}
                  onCheckedChange={(checked) => void handleVisibilityToggle(checked)}
                  disabled={updateRule.isPending}
                  aria-label="Toggle visibility"
                  className="scale-75"
                />
                <Globe className={cn('h-3 w-3', rule.visibility === 'public' ? 'text-green-400' : 'text-zinc-600 dark:text-zinc-600')} />
              </label>
            ) : (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border',
                  rule.visibility === 'public'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                )}
              >
                {rule.visibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {rule.visibility}
              </span>
            )}

            {/* Version */}
            {rule.version && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] text-muted-foreground">
                      <GitBranch className="h-3 w-3" />
                      v{rule.version}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Version</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Author chip — clickable */}
            <Link
              to={`/users/${rule.user_id}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-zinc-300 dark:hover:border-white/20 transition-colors"
            >
              <User className="h-3 w-3" />
              {authorName}
            </Link>

            {/* Project chip — clickable */}
            {rule.project_id ? (
              <Link
                to={`/compass-projects/${rule.project_id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-zinc-300 dark:hover:border-white/20 transition-colors"
              >
                <Layers className="h-3 w-3" />
                {projectIdToTitle[rule.project_id] ?? 'Project'}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] text-muted-foreground">
                <Layers className="h-3 w-3" />
                Global
              </span>
            )}

            {/* Special file target */}
            {rule.special_file_target && SPECIAL_FILE_TARGETS[rule.special_file_target] && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border bg-orange-500/10 text-orange-400 border-orange-500/20 cursor-help">
                      <FileText className="h-3 w-3" />
                      {SPECIAL_FILE_TARGETS[rule.special_file_target].path}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{SPECIAL_FILE_TARGETS[rule.special_file_target].description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Downloads */}
            {downloadCount != null && downloadCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] text-muted-foreground tabular-nums">
                      <Download className="h-3 w-3" />
                      {downloadCount}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Total pulls</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Tech badges */}
            {rule.technologies && rule.technologies.length > 0 && (
              <>
                <div className="h-4 w-px bg-border dark:bg-white/10" />
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
              </>
            )}
          </div>

          {/* Pull command snippet */}
          {!editing && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => void handleCopyPull()}
                className={cn(
                  'group flex items-center gap-3 rounded-lg border px-4 py-2.5',
                  'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10',
                  'hover:border-zinc-300 dark:hover:border-white/20',
                  'transition-all duration-200 cursor-pointer'
                )}
              >
                <Terminal className="h-4 w-4 text-muted-foreground dark:text-zinc-500 shrink-0" />
                <code className="text-sm font-mono text-foreground dark:text-zinc-200">
                  {getPullCommandDisplay(rule.kind)}
                </code>
                <span className="ml-2 shrink-0 text-muted-foreground dark:text-zinc-500 group-hover:text-foreground dark:group-hover:text-zinc-300 transition-colors">
                  {pullCopied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </span>
              </button>
              <p className="mt-1.5 text-[11px] text-muted-foreground dark:text-zinc-500">
                Clicking copies the full command with ID. Add <code className="font-mono bg-zinc-100 dark:bg-white/5 px-1 rounded">--copy</code> for a standalone file instead of symlink.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content: two-column layout ── */}
      <div className="pt-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Left: body content */}
        <div>
          {editing ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
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
              </CardContent>
            </Card>
          ) : (
            <div>
              {rule.description && (
                <p className="text-muted-foreground dark:text-zinc-400 mb-6 text-base leading-relaxed">{rule.description}</p>
              )}
              <Card className="dark:bg-white/[0.02] dark:border-white/10">
                <CardContent className="pt-6">
                  <MarkdownContent content={rule.body} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right sidebar — metadata panels */}
        {!editing && (
          <div className="space-y-5">
            {/* Downloads */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-zinc-500 block mb-1">
                Pulls
              </span>
              <span className="text-2xl font-extrabold tabular-nums text-foreground">
                {downloadCount != null ? downloadCount.toLocaleString() : '—'}
              </span>
            </div>

            {/* Project */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-zinc-500 block mb-1.5">
                Project
              </span>
              <div className="flex items-center gap-2">
                {rule.project_id ? (
                  <Link
                    to={`/compass-projects/${rule.project_id}`}
                    className="text-sm text-foreground hover:underline"
                  >
                    {projectIdToTitle[rule.project_id] ?? 'Project'}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">Global</span>
                )}
                {isOwner && !editing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        (change)
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => handleProjectChange(null)}>
                        Global
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
            </div>

            {/* Groups */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-zinc-500 block mb-1.5">
                Groups
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
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
                        className="ml-0.5 hover:text-destructive"
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
                {isOwner && availableGroups.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1">
                        <Plus className="h-3 w-3" />
                        Add
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
            </div>

            {/* Special file target */}
            {rule.special_file_target && SPECIAL_FILE_TARGETS[rule.special_file_target] && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-zinc-500 block mb-1.5">
                  Output file
                </span>
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-orange-400" />
                  <code className="text-sm font-mono text-foreground">
                    {SPECIAL_FILE_TARGETS[rule.special_file_target].path}
                  </code>
                </div>
                <p className="text-[11px] text-muted-foreground dark:text-zinc-500 mt-0.5">
                  {SPECIAL_FILE_TARGETS[rule.special_file_target].description}
                </p>
              </div>
            )}

            {/* Author */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-zinc-500 block mb-1.5">
                Author
              </span>
              <Link
                to={`/users/${rule.user_id}`}
                className="text-sm text-foreground hover:underline"
              >
                {authorName}
              </Link>
            </div>

            {/* Last updated */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-zinc-500 block mb-1.5">
                Last updated
              </span>
              <span className="text-sm text-foreground" title={rule.updated_at}>
                {formatDistanceToNowStrict(new Date(rule.updated_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        )}
      </div>

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
