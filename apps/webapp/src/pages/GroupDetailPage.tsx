import { useMemo, useState } from 'react';
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
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { CommandBlock } from '@/components/ui/CommandBlock';
import {
  useRuleGroup,
  useRuleGroups,
  useRuleGroupRules,
  useUpdateRuleGroup,
  useDeleteRuleGroup,
  useAddRuleToGroup,
  useRemoveRuleFromGroup,
  useRuleGroupItems,
} from '@/hooks/use-rule-groups';
import { useRulesSearch } from '@/hooks/use-rules';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getTechStyle } from '@/lib/tech-styles';
import type { RuleKind } from '@/types/bitcompass';
import {
  ArrowLeft,
  FolderTree,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

const CARD_KIND_CLASSES: Record<RuleKind, string> = {
  rule: 'dark:border-l-sky-500/30',
  solution: 'dark:border-l-emerald-500/30',
  skill: 'dark:border-l-violet-500/30',
  command: 'dark:border-l-amber-500/30',
};

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: group, isLoading } = useRuleGroup(id);
  const { data: allGroups = [] } = useRuleGroups();
  const { data: rules = [], isLoading: rulesLoading } = useRuleGroupRules(id);
  const { data: items = [] } = useRuleGroupItems(id);
  const updateGroup = useUpdateRuleGroup();
  const deleteGroup = useDeleteRuleGroup();
  const addRule = useAddRuleToGroup();
  const removeRule = useRemoveRuleFromGroup();

  const isOwner = Boolean(user && group && user.id === group.user_id);
  const parentGroup = group?.parent_id ? allGroups.find((g) => g.id === group.parent_id) : null;
  const childGroups = allGroups.filter((g) => g.parent_id === id);
  const ruleIdsInGroup = useMemo(() => new Set(items.map((i) => i.rule_id)), [items]);

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: searchResults = [], isLoading: searchLoading } = useRulesSearch(searchQuery);
  const filteredResults = searchResults.filter((r) => !ruleIdsInGroup.has(r.id));

  const handleSaveTitle = async () => {
    if (!id || !titleValue.trim()) return;
    try {
      await updateGroup.mutateAsync({ id, updates: { title: titleValue.trim() } });
      toast({ title: 'Title updated' });
      setEditingTitle(false);
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleSaveDescription = async () => {
    if (!id) return;
    try {
      await updateGroup.mutateAsync({ id, updates: { description: descriptionValue } });
      toast({ title: 'Description updated' });
      setEditingDescription(false);
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteGroup.mutateAsync(id);
      toast({ title: 'Group deleted' });
      navigate('/groups');
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
    setDeleteOpen(false);
  };

  const handleAddRule = async (ruleId: string) => {
    if (!id) return;
    try {
      await addRule.mutateAsync({ groupId: id, ruleId });
      toast({ title: 'Rule added to group' });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleRemoveRule = async (ruleId: string) => {
    if (!id) return;
    try {
      await removeRule.mutateAsync({ groupId: id, ruleId });
      toast({ title: 'Rule removed from group' });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="max-w-4xl mx-auto text-muted-foreground">Loading...</div>;
  }

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Group not found</p>
        <Button variant="link" onClick={() => navigate('/groups')}>Back to Groups</Button>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Groups', href: '/groups' },
    ...(parentGroup ? [{ label: parentGroup.title, href: `/groups/${parentGroup.id}` }] : []),
    { label: group.title },
  ];

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={breadcrumbItems} />
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => navigate('/groups')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Groups
      </Button>

      {/* Title */}
      <div>
        {editingTitle && isOwner ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={titleValue || group.title}
              onChange={(e) => setTitleValue(e.target.value)}
              className="max-w-md"
            />
            <Button size="sm" onClick={handleSaveTitle} disabled={updateGroup.isPending}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{group.title}</h1>
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEditingTitle(true); setTitleValue(group.title); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        {editingDescription && isOwner ? (
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={descriptionValue !== '' ? descriptionValue : group.description}
              onChange={(e) => setDescriptionValue(e.target.value)}
              placeholder="Optional description"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveDescription} disabled={updateGroup.isPending}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditingDescription(false); setDescriptionValue(''); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="text-muted-foreground flex-1">
              {group.description || <span className="italic">No description</span>}
            </p>
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEditingDescription(true); setDescriptionValue(group.description); }}
              >
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {/* CLI pull command */}
      <Card className="dark:bg-white/5 dark:border-white/10">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium">Pull all rules in this group via CLI</p>
          <CommandBlock commands={[`bitcompass group pull ${group.id}`]} />
          <p className="text-xs text-muted-foreground">
            Sync: <code className="bg-muted dark:bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs">bitcompass group sync {group.id}</code>
          </p>
        </CardContent>
      </Card>

      {isOwner && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete group
        </Button>
      )}

      {/* Sub-groups */}
      {childGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Sub-groups ({childGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {childGroups.map((child) => (
                <Link
                  key={child.id}
                  to={`/groups/${child.id}`}
                  className="block p-3 rounded-md border dark:border-white/10 hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">{child.title}</span>
                  {child.description && (
                    <p className="text-sm text-muted-foreground mt-1">{child.description}</p>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules in group */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rules in this group ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick search & add */}
          {isOwner && (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search rules to add..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  className="pl-9"
                />
              </div>
              {searchOpen && searchQuery.trim().length >= 2 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 border rounded-md bg-background dark:bg-zinc-900 dark:border-white/10 max-h-64 overflow-y-auto shadow-lg">
                  {searchLoading && (
                    <div className="p-3 text-sm text-muted-foreground">Searching...</div>
                  )}
                  {!searchLoading && filteredResults.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">No results found</div>
                  )}
                  {filteredResults.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 p-3 hover:bg-muted/50 border-b last:border-b-0 dark:border-white/10"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-sm block truncate">{r.title}</span>
                        <span className="text-xs text-muted-foreground capitalize">{r.kind}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddRule(r.id)}
                        disabled={addRule.isPending}
                        className="shrink-0"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                  <div className="p-2 border-t dark:border-white/10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {rulesLoading ? (
            <div className="text-muted-foreground py-8 text-center">Loading...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No rules in this group yet.</p>
              {isOwner && <p className="text-xs mt-1">Use the search above to add rules.</p>}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rules.map((rule) => (
                // biome-ignore lint/a11y/noStaticElementInteractions: Card contains buttons
                <div
                  key={rule.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/skills/${rule.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/skills/${rule.id}`);
                    }
                  }}
                  className="block cursor-pointer"
                >
                  <Card
                    className={cn(
                      'card-interactive transition-all duration-300 border-l-4',
                      'dark:bg-white/5 dark:backdrop-blur-xl dark:border dark:border-white/10',
                      'dark:hover:-translate-y-1 dark:hover:shadow-2xl',
                      CARD_KIND_CLASSES[rule.kind]
                    )}
                  >
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <CardTitle className="text-base font-bold">{rule.title}</CardTitle>
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border capitalize',
                          rule.kind === 'rule' && 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                          rule.kind === 'solution' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                          rule.kind === 'skill' && 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                          rule.kind === 'command' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                        )}
                      >
                        {rule.kind}
                      </span>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {rule.description || rule.body}
                      </p>
                      {(rule.technologies?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {(rule.technologies ?? []).slice(0, 5).map((tech) => {
                            const style = getTechStyle(tech);
                            return (
                              <span
                                key={tech}
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border',
                                  style.bg, style.text, style.border
                                )}
                              >
                                {tech}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {isOwner && (
                        // biome-ignore lint/a11y/noStaticElementInteractions: stop propagation wrapper
                        <div
                          className="mt-3"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-7 text-xs"
                            onClick={() => handleRemoveRule(rule.id)}
                            disabled={removeRule.isPending}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Remove from group
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the group and all sub-groups. Rules themselves are not deleted.
            </AlertDialogDescription>
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
