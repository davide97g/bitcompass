import { useState } from 'react';
import type React from 'react';
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
import type { Rule, RuleInsert, RuleKind } from '@/types/bitcompass';
import { BookMarked, Copy, FileDown, Plus, Search, User, Link2, Tag, GitFork } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ruleDownloadBasename } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/** Highlight all occurrences of query in text. Returns JSX with <mark> tags. */
const highlightText = (text: string, query: string): React.ReactNode => {
  const q = query.trim();
  if (!q || !text) return text;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerQuery, lastIndex);
  
  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    // Add highlighted match
    parts.push(
      <mark key={index} className="bg-primary/20 text-foreground rounded px-0.5 font-medium">
        {text.slice(index, index + q.length)}
      </mark>
    );
    lastIndex = index + q.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

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

export default function RulesPage() {
  const [kindFilter, setKindFilter] = useState<RuleKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<RuleInsert>({
    kind: 'rule',
    title: '',
    description: '',
    body: '',
    version: '1.0.0',
    technologies: [],
  });
  const { data: rulesRule = [], isLoading: loadingRules } = useRules('rule');
  const { data: rulesSolution = [], isLoading: loadingSolutions } = useRules('solution');
  const { data: rulesSkill = [], isLoading: loadingSkills } = useRules('skill');
  const { data: rulesCommand = [], isLoading: loadingCommands } = useRules('command');
  const insertRule = useInsertRule();
  const { toast } = useToast();

  const rules =
    kindFilter === 'rule'
      ? rulesRule
      : kindFilter === 'solution'
        ? rulesSolution
        : kindFilter === 'skill'
          ? rulesSkill
          : kindFilter === 'command'
            ? rulesCommand
            : [...rulesRule, ...rulesSolution, ...rulesSkill, ...rulesCommand];
  const filtered = search.trim()
    ? rules.filter(
        (r) => {
          const q = search.toLowerCase();
          return (
            r.title.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            r.body.toLowerCase().includes(q) ||
            (r.technologies && r.technologies.some((tech) => tech.toLowerCase().includes(q)))
          );
        }
      )
    : rules;

  const handleCopyPullCommand = async (rule: Rule, useCopy = false) => {
    const cmd = getPullCommand(rule.id, rule.kind, useCopy);
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedId(rule.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: 'Command copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    if (!newRule.title.trim() || !newRule.body.trim()) {
      toast({ title: 'Title and content required', variant: 'destructive' });
      return;
    }
    try {
      await insertRule.mutateAsync(newRule);
      toast({ title: 'Created' });
      setCreateOpen(false);
      setNewRule({ kind: 'rule', title: '', description: '', body: '', version: '1.0.0', technologies: [] });
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
        <Tabs value={kindFilter} onValueChange={(v) => setKindFilter(v as RuleKind | 'all')}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="rule">Rules</TabsTrigger>
            <TabsTrigger value="solution">Solutions</TabsTrigger>
            <TabsTrigger value="skill">Skills</TabsTrigger>
            <TabsTrigger value="command">Commands</TabsTrigger>
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
              <DialogTitle>New shared entity</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Kind</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={newRule.kind}
                  onChange={(e) => setNewRule((p) => ({ ...p, kind: e.target.value as RuleKind }))}
                >
                  <option value="rule">Rule</option>
                  <option value="solution">Solution</option>
                  <option value="skill">Skill</option>
                  <option value="command">Command</option>
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
                <Label>Version</Label>
                <Input
                  value={newRule.version || '1.0.0'}
                  onChange={(e) => setNewRule((p) => ({ ...p, version: e.target.value }))}
                  placeholder="1.0.0"
                />
              </div>
              <div className="space-y-2">
                <Label>Technologies (comma-separated)</Label>
                <Input
                  value={newRule.technologies?.join(', ') || ''}
                  onChange={(e) =>
                    setNewRule((p) => ({
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
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={newRule.body}
                  onChange={(e) => setNewRule((p) => ({ ...p, body: e.target.value }))}
                  placeholder="Content"
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

      {(loadingRules || loadingSolutions || loadingSkills || loadingCommands) && kindFilter !== 'all' ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookMarked className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No shared entities yet.</p>
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
                    {search.trim() ? highlightText(rule.title, search) : rule.title}
                  </Link>
                </CardTitle>
                <span className="text-xs text-muted-foreground capitalize">{rule.kind}</span>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {search.trim()
                    ? highlightText(rule.description || rule.body, search)
                    : rule.description || rule.body}
                </p>
                
                {/* Metadata section */}
                <div className="mt-3 space-y-2">
                  {/* Author and Version */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {(rule.author_display_name ?? rule.user_id) && (
                      <div className="flex items-center gap-1.5" aria-label="Author">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span>{rule.author_display_name ?? 'Unknown author'}</span>
                      </div>
                    )}
                    {rule.version && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">v{rule.version}</span>
                      </div>
                    )}
                  </div>

                  {/* Technologies and Tags */}
                  {(rule.technologies && rule.technologies.length > 0) && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {rule.technologies.slice(0, 5).map((tech) => (
                        <Badge key={tech} variant="secondary" className="text-xs">
                          {search.trim() ? highlightText(tech, search) : tech}
                        </Badge>
                      ))}
                      {rule.technologies.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{rule.technologies.length - 5}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/rules/${rule.id}`}>View</Link>
                  </Button>
                  
                  {/* Main action: Use this rule (symlink) */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => void handleCopyPullCommand(rule, false)}
                    aria-label={`Use this ${rule.kind} (symlink)`}
                    title={getPullCommand(rule.id, rule.kind, false)}
                    className="gap-1.5"
                  >
                    <Link2 className="h-4 w-4" />
                    Use this rule
                  </Button>
                  
                  {/* Secondary action: Clone with --copy flag */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCopyPullCommand(rule, true)}
                    aria-label={`Clone this ${rule.kind} (--copy flag)`}
                    title={getPullCommand(rule.id, rule.kind, true)}
                    className={copiedId === rule.id ? 'bg-muted' : ''}
                  >
                    <GitFork className="h-4 w-4" />
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
