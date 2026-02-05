import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRules, useInsertRule } from '@/hooks/use-rules';
import { useToast } from '@/hooks/use-toast';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Rule, RuleInsert } from '@/types/bitcompass';
import { BookMarked, FileDown, Plus, Search, User } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

const downloadRule = (rule: Rule, format: 'json' | 'markdown'): void => {
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(rule, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rule-${rule.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const text = `# ${rule.title}\n\n${rule.description}\n\n${rule.body}\n`;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rule-${rule.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

export default function RulesPage() {
  const [kindFilter, setKindFilter] = useState<'rule' | 'solution' | 'all'>('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newRule, setNewRule] = useState<RuleInsert>({
    kind: 'rule',
    title: '',
    description: '',
    body: '',
  });
  const { data: rulesRule = [], isLoading: loadingRules } = useRules('rule');
  const { data: rulesSolution = [], isLoading: loadingSolutions } = useRules('solution');
  const insertRule = useInsertRule();
  const { toast } = useToast();

  const rules =
    kindFilter === 'rule' ? rulesRule : kindFilter === 'solution' ? rulesSolution : [...rulesRule, ...rulesSolution];
  const filtered = search.trim()
    ? rules.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.description.toLowerCase().includes(search.toLowerCase()) ||
          r.body.toLowerCase().includes(search.toLowerCase())
      )
    : rules;

  const handleCreate = async () => {
    if (!newRule.title.trim() || !newRule.body.trim()) {
      toast({ title: 'Title and content required', variant: 'destructive' });
      return;
    }
    try {
      await insertRule.mutateAsync(newRule);
      toast({ title: 'Created' });
      setCreateOpen(false);
      setNewRule({ kind: 'rule', title: '', description: '', body: '' });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader title="Rules & solutions" description="BitCompass rules and problem solutions" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Configure Supabase (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) to use Rules & solutions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rules & solutions"
        description="Manage rules and problem solutions. Same data as CLI and MCP."
      />
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={kindFilter} onValueChange={(v) => setKindFilter(v as 'rule' | 'solution' | 'all')}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="rule">Rules</TabsTrigger>
            <TabsTrigger value="solution">Solutions</TabsTrigger>
          </TabsList>
        </Tabs>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New rule or solution</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Kind</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={newRule.kind}
                  onChange={(e) => setNewRule((p) => ({ ...p, kind: e.target.value as 'rule' | 'solution' }))}
                >
                  <option value="rule">Rule</option>
                  <option value="solution">Solution</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newRule.title}
                  onChange={(e) => setNewRule((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newRule.description}
                  onChange={(e) => setNewRule((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <textarea
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={newRule.body}
                  onChange={(e) => setNewRule((p) => ({ ...p, body: e.target.value }))}
                  placeholder="Rule or solution text"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleCreate()} disabled={insertRule.isPending}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(loadingRules || loadingSolutions) && kindFilter !== 'all' ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookMarked className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No rules or solutions yet.</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add one
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-base">
                  <Link to={`/rules/${rule.id}`} className="hover:underline">
                    {rule.title}
                  </Link>
                </CardTitle>
                <span className="text-xs text-muted-foreground capitalize">{rule.kind}</span>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{rule.description || rule.body}</p>
                {(rule.author_display_name ?? rule.user_id) && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Author">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span>{rule.author_display_name ?? 'Unknown author'}</span>
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/rules/${rule.id}`}>View</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadRule(rule, 'markdown')}
                    aria-label="Download as Markdown"
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
