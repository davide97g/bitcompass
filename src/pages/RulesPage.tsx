import { useEffect, useState } from 'react';
import type React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { useRulesPaginated, useInsertRule } from '@/hooks/use-rules';
import { useCompassProjects } from '@/hooks/use-compass-projects';
import { useToast } from '@/hooks/use-toast';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Rule, RuleInsert, RuleKind } from '@/types/bitcompass';
import { BookMarked, FileDown, Plus, Search, User, Link2, GitFork } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ruleDownloadBasename } from '@/lib/utils';
import { getTechStyle } from '@/lib/tech-styles';
import { RulesPageSkeleton } from '@/components/skeletons';

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
      <mark key={index} className="bg-primary text-primary-foreground px-0.5 font-medium">
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

const getKindLabel = (kind: RuleKind): string => {
  const labels: Record<RuleKind, string> = {
    rule: 'rule',
    solution: 'solution',
    skill: 'skill',
    command: 'command',
  };
  return labels[kind];
};

/** Card style by kind: glassmorphic + type tint (border + hover shadow) */
const CARD_KIND_CLASSES: Record<RuleKind, { card: string; cta: string }> = {
  rule: {
    card: 'dark:border-l-sky-500/30 dark:hover:shadow-sky-500/10',
    cta: 'bg-sky-700 hover:bg-sky-600 text-white dark:bg-sky-700 dark:hover:bg-sky-600',
  },
  solution: {
    card: 'dark:border-l-emerald-500/30 dark:hover:shadow-emerald-500/10',
    cta: 'bg-emerald-700 hover:bg-emerald-600 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600',
  },
  skill: {
    card: 'dark:border-l-violet-500/30 dark:hover:shadow-violet-500/10',
    cta: 'bg-violet-700 hover:bg-violet-600 text-white dark:bg-violet-700 dark:hover:bg-violet-600',
  },
  command: {
    card: 'dark:border-l-amber-500/30 dark:hover:shadow-amber-500/10',
    cta: 'bg-amber-700 hover:bg-amber-600 text-white dark:bg-amber-700 dark:hover:bg-amber-600',
  },
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

const KIND_PARAM = 'kind';
const Q_PARAM = 'q';
const PAGE_PARAM = 'page';
const PROJECT_PARAM = 'project';

const VALID_KINDS: Array<RuleKind | 'all'> = ['all', 'rule', 'solution', 'skill', 'command'];
const RULES_PAGE_SIZE = 20;

export default function RulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const kindFromUrl = searchParams.get(KIND_PARAM);
  const qFromUrl = searchParams.get(Q_PARAM) ?? '';
  const pageFromUrl = searchParams.get(PAGE_PARAM);
  const projectFromUrl = searchParams.get(PROJECT_PARAM);
  const [kindFilter, setKindFilter] = useState<RuleKind | 'all'>(() =>
    kindFromUrl && VALID_KINDS.includes(kindFromUrl as RuleKind | 'all') ? (kindFromUrl as RuleKind | 'all') : 'all'
  );
  const [search, setSearch] = useState(() => qFromUrl);
  const [projectFilter, setProjectFilter] = useState<string | null>(() => projectFromUrl || null);
  const page = Math.max(1, parseInt(pageFromUrl ?? '1', 10) || 1);
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

  const { data: compassProjects = [] } = useCompassProjects();
  const projectIdToTitle = Object.fromEntries(compassProjects.map((p) => [p.id, p.title]));

  const { data: paginatedResult, isLoading: loadingPaginated } = useRulesPaginated({
    kind: kindFilter,
    page,
    search,
    pageSize: RULES_PAGE_SIZE,
    projectId: projectFilter ?? undefined,
  });
  const rules = paginatedResult?.data ?? [];
  const total = paginatedResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / RULES_PAGE_SIZE));
  const insertRule = useInsertRule();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Sync URL -> state when user navigates (e.g. back/forward)
  useEffect(() => {
    const k = searchParams.get(KIND_PARAM);
    const q = searchParams.get(Q_PARAM) ?? '';
    const proj = searchParams.get(PROJECT_PARAM);
    if (k && VALID_KINDS.includes(k as RuleKind | 'all')) setKindFilter(k as RuleKind | 'all');
    setSearch(q);
    setProjectFilter(proj || null);
  }, [searchParams]);

  const updateUrl = (
    kind: RuleKind | 'all',
    q: string,
    pageNum: number = 1,
    projectId: string | null = null
  ) => {
    const next = new URLSearchParams(searchParams);
    if (kind === 'all') next.delete(KIND_PARAM);
    else next.set(KIND_PARAM, kind);
    if (q.trim() === '') next.delete(Q_PARAM);
    else next.set(Q_PARAM, q.trim());
    if (pageNum <= 1) next.delete(PAGE_PARAM);
    else next.set(PAGE_PARAM, String(pageNum));
    if (!projectId) next.delete(PROJECT_PARAM);
    else next.set(PROJECT_PARAM, projectId);
    setSearchParams(next, { replace: true });
  };

  const handleKindChange = (v: string) => {
    const value = v as RuleKind | 'all';
    setKindFilter(value);
    updateUrl(value, search, 1, projectFilter);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    updateUrl(kindFilter, value, 1, projectFilter);
  };

  const handleProjectFilterChange = (projectId: string | null) => {
    setProjectFilter(projectId);
    updateUrl(kindFilter, search, 1, projectId);
  };

  const handlePageChange = (pageNum: number) => {
    updateUrl(kindFilter, search, pageNum, projectFilter);
  };

  const filtered = rules;

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
      setNewRule({
        kind: 'rule',
        title: '',
        description: '',
        body: '',
        version: '1.0.0',
        technologies: [],
        project_id: undefined,
      });
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
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={kindFilter} onValueChange={handleKindChange}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="rule">Rules</TabsTrigger>
            <TabsTrigger value="solution">Solutions</TabsTrigger>
            <TabsTrigger value="skill">Skills</TabsTrigger>
            <TabsTrigger value="command">Commands</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Label htmlFor="rules-project-filter" className="text-muted-foreground text-sm whitespace-nowrap">
            Project
          </Label>
          <select
            id="rules-project-filter"
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm min-w-[140px]"
            value={projectFilter ?? ''}
            onChange={(e) => handleProjectFilterChange(e.target.value || null)}
            aria-label="Filter by Compass project"
          >
            <option value="">All / Global (default)</option>
            {compassProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
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
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
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
                <Label>Compass project (optional)</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={newRule.project_id ?? ''}
                  onChange={(e) =>
                    setNewRule((p) => ({ ...p, project_id: e.target.value || undefined }))
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
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

      {loadingPaginated ? (
        <RulesPageSkeleton />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookMarked className="h-12 w-12 text-muted-foreground mb-4" />
            {total === 0 ? (
              <>
                <h3 className="font-semibold mb-1">No rules yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  Publish your first rule from this app, or from the CLI or MCP in your editor.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add one
                  </Button>
                  <span className="text-sm text-muted-foreground">or</span>
                  <Link to="/cli" className="text-sm text-primary underline underline-offset-2 hover:no-underline">
                    CLI docs
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link to="/mcp" className="text-sm text-primary underline underline-offset-2 hover:no-underline">
                    MCP docs
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">No matches for this filter or search.</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different search term or clear the filter.</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((rule) => {
            const kindStyles = CARD_KIND_CLASSES[rule.kind];
            return (
            // Card is clickable; inner CTAs stop propagation so they don't trigger navigation. Using div + role="link" because <a> cannot wrap <button> (invalid HTML).
            // biome-ignore lint/a11y/useSemanticElements: Card contains buttons; cannot use <a> wrapper.
            <div
              key={rule.id}
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/rules/${rule.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/rules/${rule.id}`);
                }
              }}
              className="block cursor-pointer"
              aria-label={`Open rule: ${rule.title}`}
            >
              <Card
                className={cn(
                  'card-interactive transition-all duration-300 border-l-4',
                  'dark:bg-white/5 dark:backdrop-blur-xl dark:border dark:border-white/10',
                  'dark:hover:-translate-y-1 dark:hover:shadow-2xl',
                  kindStyles.card
                )}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-display font-bold">
                    <span className="hover:underline text-foreground">
                      {search.trim() ? highlightText(rule.title, search) : rule.title}
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border capitalize',
                        rule.kind === 'rule' && 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                        rule.kind === 'solution' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                        rule.kind === 'skill' && 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                        rule.kind === 'command' && 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      )}
                    >
                      {rule.kind}
                    </span>
                    {rule.project_id && (
                      // biome-ignore lint/a11y: Wrapper stops propagation so project link doesn't trigger card navigation.
                      <span
                        className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border bg-white/5 text-zinc-400 dark:bg-white/5 dark:text-zinc-400 dark:border-white/10 border-border"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/compass-projects/${rule.project_id}`);
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="hover:underline bg-transparent border-0 p-0 text-inherit font-inherit cursor-pointer"
                        >
                          {projectIdToTitle[rule.project_id] ?? 'Project'}
                        </button>
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground dark:text-zinc-400 line-clamp-2">
                    {search.trim()
                      ? highlightText(rule.description || rule.body, search)
                      : rule.description || rule.body}
                  </p>

                  {/* Metadata section */}
                  <div className="mt-3 space-y-2">
                    {/* Author and Version */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground dark:text-zinc-400">
                      {(rule.author_display_name ?? rule.user_id) && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span>{rule.author_display_name ?? 'Unknown author'}</span>
                        </div>
                      )}
                      {rule.version && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">v{rule.version}</span>
                        </div>
                      )}
                    </div>

                    {/* Technologies: neon-style badges */}
                    {(rule.technologies && rule.technologies.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {rule.technologies.slice(0, 5).map((tech) => {
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
                              {search.trim() ? highlightText(tech, search) : tech}
                            </span>
                          );
                        })}
                        {rule.technologies.length > 5 && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border bg-white/5 text-zinc-400 dark:bg-white/5 dark:text-zinc-400 dark:border-white/10">
                            +{rule.technologies.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions - stop propagation so card link does not fire */}
                  {/* biome-ignore lint/a11y: Wrapper stops propagation so button clicks don't trigger card navigation. */}
                  <div
                    className="mt-4 flex flex-wrap items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {/* Main CTA: darker by kind */}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void handleCopyPullCommand(rule, false);
                      }}
                      aria-label={`Use this ${rule.kind} (symlink)`}
                      title={getPullCommand(rule.id, rule.kind, false)}
                      className={cn('gap-1.5 border-0', kindStyles.cta)}
                    >
                      <Link2 className="h-4 w-4" />
                      Use this {getKindLabel(rule.kind)}
                    </Button>

                    {/* Secondary action: Clone with --copy flag */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void handleCopyPullCommand(rule, true);
                      }}
                      aria-label={`Clone this ${rule.kind} (--copy flag)`}
                      title={getPullCommand(rule.id, rule.kind, true)}
                      className={cn('dark:border-white/10 dark:bg-white/5', copiedId === rule.id ? 'bg-muted dark:bg-white/10' : '')}
                    >
                      <GitFork className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        downloadRule(rule, 'markdown');
                      }}
                      aria-label="Download as Markdown"
                      className="dark:text-zinc-400"
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
          })}
        </div>
      )}

      {!loadingPaginated && filtered.length > 0 && totalPages > 1 && (
        <Pagination aria-label="Rules pagination">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) handlePageChange(page - 1);
                }}
                aria-disabled={page <= 1}
                className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            {(() => {
              const pages: number[] = [1];
              if (page - 1 > 1) pages.push(page - 1);
              if (page > 1 && page !== totalPages) pages.push(page);
              if (page + 1 < totalPages) pages.push(page + 1);
              if (totalPages > 1) pages.push(totalPages);
              const unique = [...new Set(pages)].sort((a, b) => a - b);
              return unique.map((n, idx) => (
                <PaginationItem key={n}>
                  {idx > 0 && unique[idx - 1] !== n - 1 && (
                    <PaginationEllipsis aria-hidden />
                  )}
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(n);
                    }}
                    isActive={n === page}
                  >
                    {n}
                  </PaginationLink>
                </PaginationItem>
              ));
            })()}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) handlePageChange(page + 1);
                }}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
