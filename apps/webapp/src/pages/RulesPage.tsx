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
import { useProfilesByIds } from '@/hooks/use-profiles';
import { useToast } from '@/hooks/use-toast';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Rule, RuleInsert, RuleKind, RuleVisibility } from '@/types/bitcompass';
import {
  BookMarked,
  Download,
  FileDown,
  Plus,
  Search,
  User,
  Link2,
  GitFork,
  Lock,
  Globe,
  FileText,
  LayoutGrid,
  List,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ruleDownloadBasename } from '@/lib/utils';
import { getTechStyle } from '@/lib/tech-styles';
import { RulesPageSkeleton, RulesListSkeleton } from '@/components/skeletons';
import { useRuleDownloadCounts } from '@/hooks/use-download-stats';
import { formatDistanceToNowStrict } from 'date-fns';

/** Special file output targets with display info. */
const SPECIAL_FILE_TARGETS: Record<string, { path: string; description: string }> = {
  'claude.md': { path: 'CLAUDE.md', description: 'Claude Code project instructions' },
  'agents.md': { path: 'AGENTS.md', description: 'OpenAI Codex instructions' },
  'cursorrules': { path: '.cursorrules', description: 'Cursor legacy rules' },
  'copilot-instructions': { path: '.github/copilot-instructions.md', description: 'GitHub Copilot instructions' },
  'windsurfrules': { path: '.windsurfrules', description: 'Windsurf rules' },
};

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
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    parts.push(
      <mark key={index} className="bg-primary text-primary-foreground px-0.5 font-medium">
        {text.slice(index, index + q.length)}
      </mark>
    );
    lastIndex = index + q.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

const getPullCommand = (ruleId: string, kind: RuleKind, useCopy = false): string => {
  const prefixMap: Record<RuleKind, string> = {
    rule: 'bitcompass rules pull ',
    documentation: 'bitcompass docs pull ',
    skill: 'bitcompass skills pull ',
    command: 'bitcompass commands pull ',
  };
  const copyFlag = useCopy ? ' --copy' : '';
  return `${prefixMap[kind]}${ruleId}${copyFlag}`;
};

const getKindLabel = (kind: RuleKind): string => {
  const labels: Record<RuleKind, string> = {
    rule: 'rule',
    documentation: 'doc',
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
  documentation: {
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

/** Kind badge colors (shared between grid + list views) */
const KIND_BADGE_CLASSES: Record<RuleKind, string> = {
  rule: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  documentation: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
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

const KIND_PARAM = 'kind';
const Q_PARAM = 'q';
const PAGE_PARAM = 'page';
const PROJECT_PARAM = 'project';
const VIS_PARAM = 'vis';
const VIEW_PARAM = 'view';

const VALID_KINDS: Array<RuleKind | 'all'> = ['all', 'rule', 'documentation', 'skill', 'command'];
const VALID_VISIBILITY: Array<RuleVisibility | 'all'> = ['all', 'private', 'public'];
const RULES_PAGE_SIZE = 20;

/** Kind filter tabs — skill listed first per user request. */
const KIND_TABS: Array<{ value: RuleKind | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'skill', label: 'Skills' },
  { value: 'rule', label: 'Rules' },
  { value: 'documentation', label: 'Docs' },
  { value: 'command', label: 'Commands' },
];

export default function RulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const kindFromUrl = searchParams.get(KIND_PARAM);
  const qFromUrl = searchParams.get(Q_PARAM) ?? '';
  const pageFromUrl = searchParams.get(PAGE_PARAM);
  const projectFromUrl = searchParams.get(PROJECT_PARAM);
  const visFromUrl = searchParams.get(VIS_PARAM);
  const viewFromUrl = searchParams.get(VIEW_PARAM);
  const [kindFilter, setKindFilter] = useState<RuleKind | 'all'>(() =>
    kindFromUrl && VALID_KINDS.includes(kindFromUrl as RuleKind | 'all') ? (kindFromUrl as RuleKind | 'all') : 'all'
  );
  const [search, setSearch] = useState(() => qFromUrl);
  const [projectFilter, setProjectFilter] = useState<string | null>(() => projectFromUrl || null);
  const [visibilityFilter, setVisibilityFilter] = useState<RuleVisibility | 'all'>(() =>
    visFromUrl && VALID_VISIBILITY.includes(visFromUrl as RuleVisibility | 'all') ? (visFromUrl as RuleVisibility | 'all') : 'all'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    viewFromUrl === 'grid' ? 'grid' : 'list'
  );
  const page = Math.max(1, parseInt(pageFromUrl ?? '1', 10) || 1);
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [setupCopied, setSetupCopied] = useState(false);
  const [newRule, setNewRule] = useState<RuleInsert>({
    kind: 'rule',
    title: '',
    description: '',
    body: '',
    version: '1.0.0',
    technologies: [],
    visibility: 'private',
  });

  const { data: compassProjects = [] } = useCompassProjects();
  const projectIdToTitle = Object.fromEntries(compassProjects.map((p) => [p.id, p.title]));

  const { data: paginatedResult, isLoading: loadingPaginated } = useRulesPaginated({
    kind: kindFilter,
    page,
    search,
    pageSize: RULES_PAGE_SIZE,
    projectId: projectFilter ?? undefined,
    visibility: visibilityFilter === 'all' ? undefined : visibilityFilter,
  });
  const rules = paginatedResult?.data ?? [];
  const total = paginatedResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / RULES_PAGE_SIZE));

  // Batch-fetch profiles for rules missing author_display_name
  const missingAuthorIds = [...new Set(
    rules.filter((r) => !r.author_display_name).map((r) => r.user_id)
  )];
  const { data: authorProfiles = [] } = useProfilesByIds(missingAuthorIds);
  const profileNameById = Object.fromEntries(
    authorProfiles.map((p) => [p.id, p.full_name || p.email || null])
  );
  const getAuthorName = (rule: Rule): string =>
    rule.author_display_name || profileNameById[rule.user_id] || 'Unknown author';

  const ruleIds = rules.map((r) => r.id);
  const { data: downloadCounts = {} } = useRuleDownloadCounts(ruleIds);

  const insertRule = useInsertRule();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Sync URL -> state when user navigates (e.g. back/forward)
  useEffect(() => {
    const k = searchParams.get(KIND_PARAM);
    const q = searchParams.get(Q_PARAM) ?? '';
    const proj = searchParams.get(PROJECT_PARAM);
    const vis = searchParams.get(VIS_PARAM);
    const view = searchParams.get(VIEW_PARAM);
    if (k && VALID_KINDS.includes(k as RuleKind | 'all')) setKindFilter(k as RuleKind | 'all');
    setSearch(q);
    setProjectFilter(proj || null);
    if (vis && VALID_VISIBILITY.includes(vis as RuleVisibility | 'all')) setVisibilityFilter(vis as RuleVisibility | 'all');
    else setVisibilityFilter('all');
    if (view === 'grid') setViewMode('grid');
    else setViewMode('list');
  }, [searchParams]);

  const updateUrl = (
    kind: RuleKind | 'all',
    q: string,
    pageNum: number = 1,
    projectId: string | null = null,
    vis: RuleVisibility | 'all' = visibilityFilter,
    view: 'grid' | 'list' = viewMode
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
    if (vis === 'all') next.delete(VIS_PARAM);
    else next.set(VIS_PARAM, vis);
    if (view === 'list') next.delete(VIEW_PARAM);
    else next.set(VIEW_PARAM, view);
    setSearchParams(next, { replace: true });
  };

  const handleKindChange = (v: RuleKind | 'all') => {
    setKindFilter(v);
    updateUrl(v, search, 1, projectFilter, visibilityFilter);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    updateUrl(kindFilter, value, 1, projectFilter, visibilityFilter);
  };

  const handleProjectFilterChange = (projectId: string | null) => {
    setProjectFilter(projectId);
    updateUrl(kindFilter, search, 1, projectId, visibilityFilter);
  };

  const handleVisibilityChange = (v: RuleVisibility | 'all') => {
    setVisibilityFilter(v);
    updateUrl(kindFilter, search, 1, projectFilter, v);
  };

  const handleViewModeChange = (v: 'grid' | 'list') => {
    setViewMode(v);
    updateUrl(kindFilter, search, page, projectFilter, visibilityFilter, v);
  };

  const handlePageChange = (pageNum: number) => {
    updateUrl(kindFilter, search, pageNum, projectFilter, visibilityFilter);
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

  const handleCopySetup = async () => {
    try {
      await navigator.clipboard.writeText('bitcompass setup');
      setSetupCopied(true);
      setTimeout(() => setSetupCopied(false), 2000);
      toast({ title: 'Copied to clipboard' });
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
        visibility: 'private',
      });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <div className="py-12 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Skills & Rules</h1>
          <p className="text-muted-foreground mt-2">
            Configure Supabase (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) to use this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* ── Hero Section ── */}
      <div className="relative -mx-6 -mt-6 overflow-hidden border-b border-border dark:border-white/10">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 dark:bg-gradient-to-b dark:from-violet-950/20 dark:to-transparent bg-gradient-to-b from-blue-50 to-transparent pointer-events-none" />
        <div className="relative px-6 pt-10 pb-8">
          <div className="max-w-4xl">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Skills & Rules
            </h1>
            <p className="mt-3 text-base text-muted-foreground dark:text-zinc-400 max-w-2xl leading-relaxed">
              Reusable capabilities for AI agents. Install them with a single command to enhance your
              agents with access to procedural knowledge.
            </p>
          </div>

          {/* Try it now snippet */}
          <div className="mt-6 flex items-start gap-8 flex-wrap">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-zinc-500 mb-2 block">
                Try it now
              </span>
              <button
                type="button"
                onClick={() => void handleCopySetup()}
                className={cn(
                  'group flex items-center gap-3 rounded-lg border px-4 py-2.5',
                  'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10',
                  'hover:border-zinc-300 dark:hover:border-white/20',
                  'transition-all duration-200 cursor-pointer'
                )}
              >
                <Terminal className="h-4 w-4 text-muted-foreground dark:text-zinc-500 shrink-0" />
                <code className="text-sm font-mono text-foreground dark:text-zinc-200">
                  $ bitcompass setup
                </code>
                <span className="ml-4 shrink-0 text-muted-foreground dark:text-zinc-500 group-hover:text-foreground dark:group-hover:text-zinc-300 transition-colors">
                  {setupCopied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filters ── */}
      <div className="pt-6 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search skills, rules, docs, commands…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-11 h-11 text-sm bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 focus:border-primary dark:focus:border-primary"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Visibility filter pills */}
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] p-0.5">
            {(
              [
                { value: 'all' as const, label: 'All', icon: null },
                { value: 'public' as const, label: 'Public', icon: Globe },
                { value: 'private' as const, label: 'Private', icon: Lock },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleVisibilityChange(value)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
                  visibilityFilter === value
                    ? 'bg-white dark:bg-white/10 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-border dark:bg-white/10" />

          {/* Kind filter pills */}
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] p-0.5">
            {KIND_TABS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleKindChange(value)}
                className={cn(
                  'inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
                  kindFilter === value
                    ? 'bg-white dark:bg-white/10 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-border dark:bg-white/10" />

          {/* Project dropdown */}
          <select
            className="h-8 rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] px-2.5 text-xs font-medium text-muted-foreground min-w-[130px] cursor-pointer hover:text-foreground transition-colors"
            value={projectFilter ?? ''}
            onChange={(e) => handleProjectFilterChange(e.target.value || null)}
            aria-label="Filter by Compass project"
          >
            <option value="">All projects</option>
            {compassProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] p-0.5">
            <button
              type="button"
              onClick={() => handleViewModeChange('grid')}
              className={cn(
                'inline-flex items-center p-1.5 rounded-md transition-all duration-150',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-white/10 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('list')}
              className={cn(
                'inline-flex items-center p-1.5 rounded-md transition-all duration-150',
                viewMode === 'list'
                  ? 'bg-white dark:bg-white/10 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Add button */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
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
                    <option value="documentation">Documentation</option>
                    <option value="skill">Skill</option>
                    <option value="command">Command</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={newRule.visibility ?? 'private'}
                    onChange={(e) =>
                      setNewRule((p) => ({ ...p, visibility: e.target.value as RuleVisibility }))
                    }
                  >
                    <option value="private">Private (only you)</option>
                    <option value="public">Public (everyone)</option>
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
                  <Label>Special file target (optional)</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={newRule.special_file_target ?? ''}
                    onChange={(e) =>
                      setNewRule((p) => ({ ...p, special_file_target: e.target.value || null }))
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

        {/* Result count */}
        {!loadingPaginated && (
          <div className="text-xs text-muted-foreground dark:text-zinc-500">
            {total} result{total !== 1 ? 's' : ''}
            {search.trim() && ` for "${search.trim()}"`}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="pt-4">
        {loadingPaginated ? (
          viewMode === 'list' ? <RulesListSkeleton /> : <RulesPageSkeleton />
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BookMarked className="h-12 w-12 text-muted-foreground mb-4" />
              {total === 0 ? (
                <>
                  <h3 className="font-semibold mb-1">No items yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    Publish your first skill or rule from this app, or from the CLI or MCP in your editor.
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
        ) : viewMode === 'list' ? (
          /* ── List View ── */
          <div className="rounded-lg border border-zinc-200 dark:border-white/10 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px_120px_90px_120px_60px_90px] gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-zinc-500 bg-zinc-50 dark:bg-white/[0.03] border-b border-zinc-200 dark:border-white/10">
              <span>Title</span>
              <span>Type</span>
              <span>Command</span>
              <span>Visibility</span>
              <span>Project</span>
              <span>Pulls</span>
              <span>Updated</span>
            </div>
            {/* Rows */}
            {filtered.map((rule, idx) => (
              // biome-ignore lint/a11y/useSemanticElements: Row contains buttons; cannot use <a> wrapper.
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
                className={cn(
                  'grid grid-cols-[1fr_80px_120px_90px_120px_60px_90px] gap-4 px-4 py-3 items-center cursor-pointer',
                  'hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors duration-150',
                  idx < filtered.length - 1 && 'border-b border-zinc-100 dark:border-white/5'
                )}
                aria-label={`Open: ${rule.title}`}
              >
                {/* Title + special file badge */}
                <span className="font-medium text-sm text-foreground truncate inline-flex items-center gap-2">
                  <span className="truncate">{search.trim() ? highlightText(rule.title, search) : rule.title}</span>
                  {rule.special_file_target && SPECIAL_FILE_TARGETS[rule.special_file_target] && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold rounded border bg-orange-500/10 text-orange-400 border-orange-500/20 uppercase tracking-wider">
                      <FileText className="h-2.5 w-2.5" />
                      {SPECIAL_FILE_TARGETS[rule.special_file_target].path}
                    </span>
                  )}
                </span>

                {/* Type badge */}
                <span>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded border capitalize',
                      KIND_BADGE_CLASSES[rule.kind]
                    )}
                  >
                    {rule.kind}
                  </span>
                </span>

                {/* Copy command */}
                {/* biome-ignore lint/a11y: Wrapper stops propagation so button clicks don't trigger row navigation. */}
                <span
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleCopyPullCommand(rule, false);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all duration-150',
                      'bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10',
                      'hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-100 dark:hover:bg-white/10',
                      'text-muted-foreground hover:text-foreground cursor-pointer'
                    )}
                    title={getPullCommand(rule.id, rule.kind, false)}
                  >
                    {copiedId === rule.id ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    pull
                  </button>
                </span>

                {/* Visibility */}
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  {rule.visibility === 'public' ? (
                    <Globe className="h-3 w-3 text-emerald-500/70" />
                  ) : (
                    <Lock className="h-3 w-3 text-zinc-400" />
                  )}
                  <span className="capitalize">{rule.visibility}</span>
                </span>

                {/* Project */}
                <span className="text-xs text-muted-foreground truncate">
                  {rule.project_id ? (projectIdToTitle[rule.project_id] ?? '—') : '—'}
                </span>

                {/* Pulls */}
                <span className="text-xs text-muted-foreground tabular-nums inline-flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {downloadCounts[rule.id] ?? 0}
                </span>

                {/* Updated */}
                <span className="text-xs text-muted-foreground dark:text-zinc-500 truncate" title={rule.updated_at}>
                  {formatDistanceToNowStrict(new Date(rule.updated_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          /* ── Grid View ── */
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((rule) => {
              const kindStyles = CARD_KIND_CLASSES[rule.kind];
              return (
              // biome-ignore lint/a11y/useSemanticElements: Card contains buttons; cannot use <a> wrapper.
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
                          KIND_BADGE_CLASSES[rule.kind]
                        )}
                      >
                        {rule.kind}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border',
                          rule.visibility === 'public'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        )}
                      >
                        {rule.visibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        {rule.visibility}
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
                      {rule.special_file_target && SPECIAL_FILE_TARGETS[rule.special_file_target] && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border bg-orange-500/10 text-orange-400 border-orange-500/20 cursor-help"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                <FileText className="h-3 w-3" />
                                {SPECIAL_FILE_TARGETS[rule.special_file_target].path}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{SPECIAL_FILE_TARGETS[rule.special_file_target].description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Outputs to <code className="font-mono">{SPECIAL_FILE_TARGETS[rule.special_file_target].path}</code>
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/users/${rule.user_id}`);
                            }}
                            className="hover:underline bg-transparent border-0 p-0 text-inherit font-inherit cursor-pointer"
                          >
                            {getAuthorName(rule)}
                          </button>
                        </div>
                        {rule.version && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">v{rule.version}</span>
                          </div>
                        )}
                        {(downloadCounts[rule.id] ?? 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            <span className="tabular-nums">{downloadCounts[rule.id]}</span>
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

                    {/* Actions */}
                    {/* biome-ignore lint/a11y: Wrapper stops propagation so button clicks don't trigger card navigation. */}
                    <div
                      className="mt-4 flex flex-wrap items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
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
      </div>

      {/* ── Pagination ── */}
      {!loadingPaginated && filtered.length > 0 && totalPages > 1 && (
        <div className="pt-6">
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
        </div>
      )}
    </div>
  );
}
