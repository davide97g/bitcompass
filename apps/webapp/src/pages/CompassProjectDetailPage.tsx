import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlockWithCopy } from '@/components/ui/code-block-with-copy';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileTreeView } from '@/components/file-tree';
import { useAuth } from '@/hooks/use-auth';
import {
  useAddCompassProjectMember,
  useCompassProject,
  useCompassProjectMembers,
  useRemoveCompassProjectMember,
  useUpdateCompassProject,
} from '@/hooks/use-compass-projects';
import { useProfilesByIds, useProfilesSearch } from '@/hooks/use-profiles';
import { useRulesPaginated } from '@/hooks/use-rules';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Rule, RuleKind } from '@/types/bitcompass';
import {
  BookMarked,
  Check,
  Copy,
  Download,
  FileText,
  Globe,
  Lock,
  LogOut,
  Pencil,
  Search,
  Settings,
  Terminal,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectDownloadTotal, useRuleDownloadCounts } from '@/hooks/use-download-stats';

const getPullCommand = (ruleId: string, kind: RuleKind, useCopy = false): string => {
  const prefixMap: Record<RuleKind, string> = {
    rule: 'bitcompass rules pull ',
    documentation: 'bitcompass docs pull ',
    skill: 'bitcompass skills pull ',
    command: 'bitcompass commands pull ',
  };
  return `${prefixMap[kind]}${ruleId}${useCopy ? ' --copy' : ''}`;
};

const highlightText = (text: string, query: string): React.ReactNode => {
  const q = query.trim();
  if (!q || !text) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerQuery, lastIndex);
  while (index !== -1) {
    if (index > lastIndex) parts.push(text.slice(lastIndex, index));
    parts.push(
      <mark key={index} className="bg-primary text-primary-foreground px-0.5 font-medium">
        {text.slice(index, index + q.length)}
      </mark>
    );
    lastIndex = index + q.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
};


const LINKED_PAGE_SIZE = 20;

const KIND_BADGE_CLASSES: Record<RuleKind, string> = {
  rule: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  documentation: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  skill: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  command: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const SPECIAL_FILE_TARGETS: Record<string, { path: string; description: string }> = {
  'claude.md': { path: 'CLAUDE.md', description: 'Claude Code project instructions' },
  'agents.md': { path: 'AGENTS.md', description: 'OpenAI Codex instructions' },
  'cursorrules': { path: '.cursorrules', description: 'Cursor legacy rules' },
  'copilot-instructions': { path: '.github/copilot-instructions.md', description: 'GitHub Copilot instructions' },
  'windsurfrules': { path: '.windsurfrules', description: 'Windsurf rules' },
};

export default function CompassProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { data: project, isLoading: projectLoading } = useCompassProject(id);
  const { data: members = [], isLoading: membersLoading } = useCompassProjectMembers(id);
  const updateProject = useUpdateCompassProject();
  const addMember = useAddCompassProjectMember();
  const removeMember = useRemoveCompassProjectMember();
  const { toast } = useToast();

  const memberIds = useMemo(() => members.map((m) => m.user_id), [members]);
  const { data: profiles = [] } = useProfilesByIds(memberIds);
  const profileMap = useMemo(() => {
    const m: Record<string, (typeof profiles)[0]> = {};
    profiles.forEach((p) => {
      m[p.id] = p;
    });
    return m;
  }, [profiles]);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [rulesSearch, setRulesSearch] = useState('');
  const [rulesKindFilter, setRulesKindFilter] = useState<RuleKind | 'all'>('all');
  const [rulesPage, setRulesPage] = useState(1);
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);
  const [setupCopied, setSetupCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'content' | 'members' | 'setup'>('files');
  const { data: projectDownloads } = useProjectDownloadTotal(id);

  const { data: searchResults = [], isLoading: searchLoading } = useProfilesSearch(searchQuery);
  const existingIds = new Set(memberIds);
  const addableProfiles = searchResults.filter((p) => !existingIds.has(p.id));

  const { data: rulesPaginated, isLoading: rulesLoading } = useRulesPaginated({
    kind: rulesKindFilter,
    page: rulesPage,
    search: rulesSearch,
    pageSize: LINKED_PAGE_SIZE,
    projectId: id ?? null,
  });
  const linkedRules = rulesPaginated?.data ?? [];
  const linkedTotal = rulesPaginated?.total ?? 0;
  const linkedTotalPages = Math.max(1, Math.ceil(linkedTotal / LINKED_PAGE_SIZE));
  const linkedRuleIds = useMemo(() => linkedRules.map((r) => r.id), [linkedRules]);
  const { data: linkedDownloadCounts = {} } = useRuleDownloadCounts(linkedRuleIds);

  const handleSaveTitle = async () => {
    if (!id || !titleValue.trim()) return;
    try {
      await updateProject.mutateAsync({ id, updates: { title: titleValue.trim() } });
      toast({ title: 'Title updated' });
      setEditingTitle(false);
    } catch (e) {
      toast({
        title: 'Failed to update title',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const handleSaveDescription = async () => {
    if (!id) return;
    try {
      await updateProject.mutateAsync({ id, updates: { description: descriptionValue } });
      toast({ title: 'Description updated' });
      setEditingDescription(false);
    } catch (e) {
      toast({
        title: 'Failed to update description',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!id) return;
    try {
      await addMember.mutateAsync({ projectId: id, userId });
      toast({ title: 'Member added' });
      setSearchQuery('');
    } catch (e) {
      toast({
        title: 'Failed to add member',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    try {
      await removeMember.mutateAsync({ projectId: id, userId });
      toast({ title: 'Member removed' });
    } catch (e) {
      toast({
        title: 'Failed to remove member',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const handleLeaveProject = () => {
    if (!id || !currentUser?.id) return;
    handleRemoveMember(currentUser.id).then(() => navigate('/projects'));
  };

  const handleCopySetup = async () => {
    try {
      await navigator.clipboard.writeText('bitcompass project pull');
      setSetupCopied(true);
      setTimeout(() => setSetupCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleCopyPullCommand = async (rule: Rule, useCopy = false) => {
    const cmd = getPullCommand(rule.id, rule.kind, useCopy);
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedRuleId(rule.id);
      setTimeout(() => setCopiedRuleId(null), 2000);
      toast({ title: 'Command copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  if (projectLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="link" onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const showTitleEdit = editingTitle;
  const showDescriptionEdit = editingDescription;

  return (
    <div className="space-y-0">
      {/* ── Breadcrumb + back ── */}
      <div className="flex items-center gap-2 pb-4">
        <PageBreadcrumb
          items={[
            { label: 'Projects', href: '/projects' },
            { label: project.title },
          ]}
        />
      </div>

      {/* ── Hero Section ── */}
      <div className="relative -mx-6 overflow-hidden border-b border-border dark:border-white/10">
        <div className="absolute inset-0 dark:bg-gradient-to-b dark:from-violet-950/20 dark:to-transparent bg-gradient-to-b from-blue-50 to-transparent pointer-events-none" />
        <div className="relative px-6 pt-10 pb-8">
          <div className="max-w-4xl">
            {/* ── Title ── */}
            {showTitleEdit ? (
              <div className="flex flex-col gap-1">
                <input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveTitle();
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  placeholder="Project title"
                  aria-label="Project title"
                  // biome-ignore lint/a11y/noAutofocus: intentional focus when edit is triggered
                  autoFocus
                  className={cn(
                    'font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground',
                    'bg-transparent border-0 border-b-2 border-violet-500/50 focus:border-violet-400',
                    'outline-none w-full pb-1 transition-colors duration-150',
                    'placeholder:text-muted-foreground/30'
                  )}
                />
                <span className="text-[11px] text-muted-foreground/40 dark:text-zinc-600 tracking-wide select-none">
                  ↵ save &nbsp;·&nbsp; esc cancel
                </span>
              </div>
            ) : (
              // biome-ignore lint/a11y/useSemanticElements: group div needed for hover affordance
              <div
                className="group/title inline-flex items-center gap-3 flex-wrap cursor-text"
                onClick={() => { setEditingTitle(true); setTitleValue(project.title); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { setEditingTitle(true); setTitleValue(project.title); } }}
                role="button"
                tabIndex={0}
                aria-label="Edit project title"
              >
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  {project.title}
                </h1>
                {projectDownloads != null && projectDownloads > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border bg-white/5 text-muted-foreground border-white/10"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Download className="h-3 w-3" />
                    {projectDownloads} pull{projectDownloads === 1 ? '' : 's'}
                  </span>
                )}
                <Pencil className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover/title:opacity-100 transition-opacity duration-200 shrink-0" />
              </div>
            )}

            {/* ── Description ── */}
            {showDescriptionEdit ? (
              <div className="mt-4 flex flex-col gap-1 max-w-2xl">
                <input
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveDescription();
                    if (e.key === 'Escape') { setEditingDescription(false); setDescriptionValue(''); }
                  }}
                  placeholder="Add a description…"
                  aria-label="Project description"
                  // biome-ignore lint/a11y/noAutofocus: intentional focus when edit is triggered
                  autoFocus
                  className={cn(
                    'text-base text-muted-foreground dark:text-zinc-400 leading-relaxed',
                    'bg-transparent border-0 border-b border-violet-500/40 focus:border-violet-400/70',
                    'outline-none w-full pb-1 transition-colors duration-150',
                    'placeholder:text-muted-foreground/25'
                  )}
                />
                <span className="text-[11px] text-muted-foreground/40 dark:text-zinc-600 tracking-wide select-none">
                  ↵ save &nbsp;·&nbsp; esc cancel
                </span>
              </div>
            ) : (
              // biome-ignore lint/a11y/useSemanticElements: group div needed for hover affordance
              <div
                className="group/desc mt-3 flex items-center gap-2 max-w-2xl cursor-text"
                onClick={() => { setEditingDescription(true); setDescriptionValue(project.description ?? ''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { setEditingDescription(true); setDescriptionValue(project.description ?? ''); } }}
                role="button"
                tabIndex={0}
                aria-label="Edit project description"
              >
                <p className="text-base text-muted-foreground dark:text-zinc-400 leading-relaxed flex-1">
                  {project.description || <span className="italic opacity-50">Add a description…</span>}
                </p>
                <Pencil className="h-3 w-3 text-zinc-600 opacity-0 group-hover/desc:opacity-100 transition-opacity duration-200 shrink-0" />
              </div>
            )}
          </div>

          {/* Quick-start snippet */}
          <div className="mt-6">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-zinc-500 mb-2 block">
              Quick start
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
                $ bitcompass project pull
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

      {/* ── Tabs ── */}
      <div className="pt-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>

        {/* ── Files tab ── */}
        <TabsContent value="files" className="mt-4">
          <FileTreeView projectId={id!} projectConfig={project?.config ?? null} />
        </TabsContent>

        {/* ── Content tab (linked rules/skills/commands/docs) ── */}
        <TabsContent value="content" className="mt-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-base">Linked rules, commands, docs & skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search…"
                    value={rulesSearch}
                    onChange={(e) => {
                      setRulesSearch(e.target.value);
                      setRulesPage(1);
                    }}
                    className="pl-9"
                    aria-label="Search linked items"
                  />
                </div>
                <Tabs
                  value={rulesKindFilter}
                  onValueChange={(v) => {
                    setRulesKindFilter(v as RuleKind | 'all');
                    setRulesPage(1);
                  }}
                >
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="rule">Rules</TabsTrigger>
                    <TabsTrigger value="documentation">Docs</TabsTrigger>
                    <TabsTrigger value="skill">Skills</TabsTrigger>
                    <TabsTrigger value="command">Commands</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {rulesLoading ? (
                <div className="text-muted-foreground py-8 text-center">Loading…</div>
              ) : linkedRules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookMarked className="h-12 w-12 text-muted-foreground mb-4" />
                  {linkedTotal === 0 ? (
                    <>
                      <h3 className="font-semibold mb-1">No linked items yet</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Rules, skills, commands, and documentation scoped to this project will appear here.
                        Add them from the Rules page and set this project as scope.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => navigate('/skills')}
                      >
                        Go to Rules & docs
                      </Button>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No matches for this search or filter.</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-zinc-200 dark:border-white/10 overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_90px_120px_90px_60px_90px] gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-zinc-500 bg-zinc-50 dark:bg-white/[0.03] border-b border-zinc-200 dark:border-white/10">
                      <span>Title</span>
                      <span>Type</span>
                      <span>Command</span>
                      <span>Visibility</span>
                      <span>Pulls</span>
                      <span>Updated</span>
                    </div>
                    {/* Rows */}
                    {linkedRules.map((rule, idx) => (
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
                          'grid grid-cols-[1fr_90px_120px_90px_60px_90px] gap-4 px-4 py-3 items-center cursor-pointer',
                          'hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors duration-150',
                          idx < linkedRules.length - 1 && 'border-b border-zinc-100 dark:border-white/5'
                        )}
                        aria-label={`Open ${rule.kind}: ${rule.title}`}
                      >
                        {/* Title */}
                        <span className="font-medium text-sm text-foreground truncate inline-flex items-center gap-2">
                          <span className="truncate">
                            {rulesSearch.trim() ? highlightText(rule.title, rulesSearch) : rule.title}
                          </span>
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
                            {rule.kind === 'documentation' ? 'Doc' : rule.kind}
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
                            {copiedRuleId === rule.id ? (
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

                        {/* Pulls */}
                        <span className="text-xs text-muted-foreground tabular-nums inline-flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {linkedDownloadCounts[rule.id] ?? 0}
                        </span>

                        {/* Updated */}
                        <span className="text-xs text-muted-foreground dark:text-zinc-500 truncate" title={rule.updated_at}>
                          {formatDistanceToNowStrict(new Date(rule.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>

                  {linkedTotalPages > 1 && (
                    <Pagination aria-label="Linked items pagination">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (rulesPage > 1) setRulesPage((p) => p - 1);
                            }}
                            aria-disabled={rulesPage <= 1}
                            className={
                              rulesPage <= 1 ? 'pointer-events-none opacity-50' : ''
                            }
                          />
                        </PaginationItem>
                        {(() => {
                          const pages: number[] = [1];
                          if (rulesPage - 1 > 1) pages.push(rulesPage - 1);
                          if (rulesPage > 1 && rulesPage !== linkedTotalPages)
                            pages.push(rulesPage);
                          if (rulesPage + 1 < linkedTotalPages) pages.push(rulesPage + 1);
                          if (linkedTotalPages > 1) pages.push(linkedTotalPages);
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
                                  setRulesPage(n);
                                }}
                                isActive={n === rulesPage}
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
                              if (rulesPage < linkedTotalPages)
                                setRulesPage((p) => p + 1);
                            }}
                            aria-disabled={rulesPage >= linkedTotalPages}
                            className={
                              rulesPage >= linkedTotalPages
                                ? 'pointer-events-none opacity-50'
                                : ''
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Members tab ── */}
        <TabsContent value="members" className="mt-4">
          <div className="max-w-xl space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5" />
                Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add member: search */}
              <div className="space-y-2">
                <Label htmlFor="member-search">Add member</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="member-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by email or name"
                    className="pl-9"
                    aria-label="Search users to add as member"
                  />
                </div>
                {searchQuery.trim() && (
                  <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                    {searchLoading && <div className="p-2 text-sm text-muted-foreground">Searching…</div>}
                    {!searchLoading && addableProfiles.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground">
                        No users found or already members
                      </div>
                    )}
                    {addableProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between gap-2 p-2 hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-sm truncate block">
                            {profile.full_name || profile.email || profile.id}
                          </span>
                          {profile.email && profile.full_name && (
                            <span className="text-muted-foreground text-xs block truncate">{profile.email}</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddMember(profile.id)}
                          disabled={addMember.isPending}
                          aria-label={`Add ${profile.full_name || profile.email} as member`}
                          className="shrink-0"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Member list */}
              <div className="space-y-1">
                {membersLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
                {!membersLoading && members.length === 0 && (
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                )}
                <ul className="divide-y rounded-md border">
                  {members.map((member) => {
                    const profile = profileMap[member.user_id];
                    const isCurrentUser = member.user_id === currentUser?.id;
                    const displayName =
                      profile?.full_name || profile?.email || member.user_id.slice(0, 8);
                    return (
                      <li
                        key={member.user_id}
                        className="flex items-center justify-between gap-2 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-sm block truncate">{displayName}</span>
                          {profile?.email && (
                            <span className="text-muted-foreground text-xs block truncate">{profile.email}</span>
                          )}
                          {isCurrentUser && (
                            <span className="text-muted-foreground text-xs">(you)</span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8 p-0"
                          onClick={() =>
                            isCurrentUser ? handleLeaveProject() : handleRemoveMember(member.user_id)
                          }
                          disabled={removeMember.isPending}
                          aria-label={
                            isCurrentUser
                              ? 'Leave project'
                              : `Remove ${displayName} from project`
                          }
                        >
                          {isCurrentUser ? (
                            <LogOut className="w-4 h-4" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        {/* ── Setup tab (dev instructions + shared config) ── */}
        <TabsContent value="setup" className="mt-4">
          <div className="max-w-xl space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dev instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Link your project folder, then pull all shared rules, skills, commands, and documentation.
              </p>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">
                  1. Run init and choose &ldquo;{project.title}&rdquo;
                </Label>
                <CodeBlockWithCopy code="bitcompass init" ariaLabel="Copy bitcompass init command" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">
                  2. Pull all linked content
                </Label>
                <CodeBlockWithCopy
                  code="bitcompass project pull"
                  ariaLabel="Copy bitcompass project pull command"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">
                  Upgrading? Update your file layout
                </Label>
                <CodeBlockWithCopy
                  code="bitcompass migrate"
                  ariaLabel="Copy bitcompass migrate command"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="w-5 h-5" />
                Shared Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.config && Object.keys(project.config).length > 0 ? (
                <>
                  <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1.5">
                    {project.config.editor && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Primary editor</span>
                        <span className="font-medium">{String(project.config.editor)}</span>
                      </div>
                    )}
                    {Array.isArray(project.config.editors) && project.config.editors.length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Editors</span>
                        <span className="font-medium">{(project.config.editors as string[]).join(', ')}</span>
                      </div>
                    )}
                    {project.config.outputPath && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Output path</span>
                        <code className="font-mono text-xs bg-background px-1.5 py-0.5 rounded">{String(project.config.outputPath)}</code>
                      </div>
                    )}
                    {project.config.defaultSharing && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Default sharing</span>
                        <span className="font-medium">{String(project.config.defaultSharing)}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      Pull this config to your local project
                    </Label>
                    <CodeBlockWithCopy
                      code="bitcompass config pull"
                      ariaLabel="Copy bitcompass config pull command"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    To update, run <code className="font-mono bg-muted px-1 py-0.5 rounded">bitcompass config push</code> from your local project.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    No shared configuration yet. Push your local config to share editor settings with your team.
                  </p>
                  <CodeBlockWithCopy
                    code="bitcompass config push"
                    ariaLabel="Copy bitcompass config push command"
                  />
                </>
              )}
            </CardContent>
          </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
