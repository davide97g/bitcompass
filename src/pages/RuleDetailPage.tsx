import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import type { Rule, RuleKind } from '@/types/bitcompass';
import { ArrowLeft, FileDown, Pencil, Trash2, User, Link2 } from 'lucide-react';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { PageHeader } from '@/components/ui/page-header';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { CommandBlock } from '@/components/ui/CommandBlock';
import { ruleDownloadBasename } from '@/lib/utils';
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
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ 
    title: '', 
    description: '', 
    body: '', 
    version: '1.0.0',
    technologies: [] as string[],
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
      });
      setEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      await updateRule.mutateAsync({ id, updates: editForm });
      toast({ title: 'Updated' });
      setEditing(false);
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

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: 'Rules', href: '/rules' }, { label: rule.title }]} />
      <PageHeader
        title={editing ? `Edit ${rule.kind}` : rule.title}
        description={getKindDescription(rule.kind)}
      />
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {(rule.author_display_name ?? rule.user_id) && (
          <div className="flex items-center gap-2" aria-label="Author">
            <User className="h-4 w-4 shrink-0" />
            <span>{rule.author_display_name ?? 'Unknown author'}</span>
          </div>
        )}
        {rule.version && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Version: v{rule.version}</span>
          </div>
        )}
        {rule.technologies && rule.technologies.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {rule.technologies.map((tech) => (
              <Badge key={tech} variant="secondary" className="text-xs">
                {tech}
              </Badge>
            ))}
          </div>
        )}
      </div>
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

      <div className="space-y-3 mb-6">
        <p className="text-sm font-medium flex items-center gap-2" id="pull-to-project">
          <Link2 className="h-4 w-4" aria-hidden />
          Pull to project
        </p>
        <p className="text-xs text-muted-foreground">
          Run this in your terminal to install this {rule ? getKindDescription(rule.kind).toLowerCase() : 'rule'} into your project (symbolic link). Copy the command with the button.
        </p>
        <CommandBlock commands={rule ? [getPullCommand(id!, rule.kind, false)] : []} className="max-w-2xl" />
        <p className="text-xs text-muted-foreground">
          To copy the file instead of a symlink, use:{' '}
          <code className="bg-muted px-1.5 py-0.5 font-mono text-xs">
            {rule ? getPullCommand(id!, rule.kind, true) : ''}
          </code>
        </p>
      </div>

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
