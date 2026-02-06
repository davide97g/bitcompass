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
import type { Rule } from '@/types/bitcompass';
import { ArrowLeft, FileDown, Pencil, Trash2, User } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { CommandBlock } from '@/components/create/CommandBlock';
import { ruleDownloadBasename } from '@/lib/utils';

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
  const [editForm, setEditForm] = useState({ title: '', description: '', body: '' });
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleStartEdit = () => {
    if (rule) {
      setEditForm({ title: rule.title, description: rule.description, body: rule.body });
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
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
      <PageHeader
        title={editing ? 'Edit rule' : rule.title}
        description={rule.kind === 'solution' ? 'Problem solution' : 'Rule'}
      />
      {(rule.author_display_name ?? rule.user_id) && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Author">
          <User className="h-4 w-4 shrink-0" />
          <span>{rule.author_display_name ?? 'Unknown author'}</span>
        </p>
      )}
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

      <CommandBlock
        commands={[`bitcompass rules pull ${id}`]}
        className="mb-6"
      />

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
                <Label>Content</Label>
                <textarea
                  className="flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
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
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
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
