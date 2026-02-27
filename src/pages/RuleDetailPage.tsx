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
import { useToast } from '@/hooks/use-toast';
import type { Rule, RuleKind } from '@/types/bitcompass';
import { ArrowLeft, FileDown, Layers, Pencil, Trash2, User, Link2 } from 'lucide-react';
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
import { ruleDownloadBasename, cn } from '@/lib/utils';
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
  const { data: compassProjects = [] } = useCompassProjects();
  const projectIdToTitle = Object.fromEntries(compassProjects.map((p) => [p.id, p.title]));
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    body: '',
    version: '1.0.0',
    technologies: [] as string[],
    project_id: undefined as string | null | undefined,
  });
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleStartEdit = () => {
    if (rule) {
      setEditForm({
        title: rule.title,
        description: rule.description,
        body: rule.body,
        version: rule.version || '1.0.0',
        technologies: rule.technologies || [],
        project_id: rule.project_id ?? undefined,
      });
      setEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      await updateRule.mutateAsync({
        id,
        updates: {
          title: editForm.title,
          description: editForm.description,
          body: editForm.body,
          version: editForm.version,
          technologies: editForm.technologies,
          project_id: editForm.project_id ?? undefined,
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
            {(rule.author_display_name ?? rule.user_id) && (
              <div className="flex items-center gap-1.5 text-muted-foreground dark:text-zinc-400">
                <User className="h-4 w-4 shrink-0" aria-hidden />
                <span>Author: {rule.author_display_name ?? 'Unknown author'}</span>
              </div>
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

          {/* Pull to project: explanatory text + command + copy (grouped) */}
          <div className="space-y-2 pt-2 border-t border-border dark:border-white/10">
            <p className="text-sm font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4" aria-hidden />
              Pull to project
            </p>
            <p className="text-xs text-muted-foreground dark:text-zinc-400">
              Run this in your terminal to install this {getKindDescription(rule.kind).toLowerCase()} into your project (symbolic link). Copy the command with the button.
            </p>
            <CommandBlock commands={[getPullCommand(id, rule.kind, false)]} className="max-w-2xl" />
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
                <Label>Version</Label>
                <Input
                  value={editForm.version}
                  onChange={(e) => setEditForm((p) => ({ ...p, version: e.target.value }))}
                  placeholder="1.0.0"
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
