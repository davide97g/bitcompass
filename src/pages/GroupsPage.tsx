import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import {
  useRuleGroups,
  useRuleGroupItemCounts,
  useInsertRuleGroup,
  useDeleteRuleGroup,
} from '@/hooks/use-rule-groups';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { FolderTree, Plus, Trash2 } from 'lucide-react';

export default function GroupsPage() {
  const { data: groups = [], isLoading } = useRuleGroups();
  const { data: itemCounts = {} } = useRuleGroupItemCounts();
  const insertGroup = useInsertRuleGroup();
  const deleteGroup = useDeleteRuleGroup();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = groups.filter((g) => {
    if (tab === 'mine' && user && g.user_id !== user.id) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
    }
    return true;
  });

  const topLevel = filtered.filter((g) => !g.parent_id);
  const childrenOf = (id: string) => filtered.filter((g) => g.parent_id === id);

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await insertGroup.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        parent_id: parentId || null,
      });
      toast({ title: 'Group created' });
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setParentId('');
    } catch (e) {
      toast({
        title: 'Failed to create group',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteGroup.mutateAsync(deleteId);
      toast({ title: 'Group deleted' });
      setDeleteId(null);
    } catch (e) {
      toast({
        title: 'Failed to delete group',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Groups" description="Curated collections of rules" />
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const renderGroup = (g: typeof groups[0], indent = 0) => {
    const children = childrenOf(g.id);
    const isOwner = user?.id === g.user_id;
    return (
      <div key={g.id} style={{ marginLeft: indent * 24 }}>
        <Card
          className="card-interactive cursor-pointer transition-all duration-300 dark:bg-white/5 dark:backdrop-blur-xl dark:border dark:border-white/10 dark:hover:-translate-y-1 dark:hover:shadow-2xl"
          onClick={() => navigate(`/groups/${g.id}`)}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold">{g.title}</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {itemCounts[g.id] ?? 0} rules
              </span>
              {children.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {children.length} sub-groups
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {g.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{g.description}</p>
            )}
            {isOwner && (
              // biome-ignore lint/a11y/noStaticElementInteractions: stop propagation wrapper
              <div
                className="mt-2"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive h-7 text-xs"
                  onClick={() => setDeleteId(g.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        {children.map((child) => renderGroup(child, indent + 1))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Groups"
        description="Curated collections of rules you can pull/sync in bulk via CLI."
      >
        <Button
          onClick={() => setCreateOpen(true)}
          className="dark:bg-violet-500 dark:hover:bg-violet-600 dark:text-white dark:border-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          New group
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'mine' | 'all')}>
          <TabsList>
            <TabsTrigger value="mine">My Groups</TabsTrigger>
            <TabsTrigger value="all">All Groups</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="grid gap-4">
        {topLevel.map((g) => renderGroup(g))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground dark:text-zinc-400">
          <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{tab === 'mine' ? 'No groups yet. Create one to bundle related rules.' : 'No groups found.'}</p>
          {tab === 'mine' && (
            <Button className="mt-4 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/10" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New group
            </Button>
          )}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent aria-describedby="create-group-description">
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
          </DialogHeader>
          <p id="create-group-description" className="text-sm text-muted-foreground">
            Create a curated collection of rules that can be pulled in bulk via CLI.
          </p>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-title">Title</Label>
              <Input
                id="group-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Group name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Input
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-parent">Parent group (optional)</Label>
              <select
                id="group-parent"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">None (top-level)</option>
                {groups
                  .filter((g) => user && g.user_id === user.id)
                  .map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || insertGroup.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete group?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the group and all sub-groups. Rules themselves are not deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteGroup.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
