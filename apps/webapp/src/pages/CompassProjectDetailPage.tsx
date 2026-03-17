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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { getTechStyle } from '@/lib/tech-styles';
import { cn, ruleDownloadBasename } from '@/lib/utils';
import type { Rule, RuleKind } from '@/types/bitcompass';
import {
  ArrowLeft,
  BookMarked,
  FileDown,
  GitFork,
  Link2,
  LogOut,
  Search,
  Settings,
  Trash2,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const getPullCommand = (ruleId: string, kind: RuleKind, useCopy = false): string => {
  const prefixMap: Record<RuleKind, string> = {
    rule: 'bitcompass rules pull ',
    solution: 'bitcompass solutions pull ',
    skill: 'bitcompass skills pull ',
    command: 'bitcompass commands pull ',
  };
  return `${prefixMap[kind]}${ruleId}${useCopy ? ' --copy' : ''}`;
};

const getKindLabel = (kind: RuleKind): string =>
  ({ rule: 'rule', solution: 'solution', skill: 'skill', command: 'command' }[kind]);

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

const LINKED_PAGE_SIZE = 20;

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
    handleRemoveMember(currentUser.id).then(() => navigate('/compass-projects'));
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
        <Button variant="link" onClick={() => navigate('/compass-projects')}>
          Back to Compass projects
        </Button>
      </div>
    );
  }

  const showTitleEdit = editingTitle;
  const showDescriptionEdit = editingDescription;

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Compass projects', href: '/compass-projects' },
          { label: project.title },
        ]}
      />
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => navigate('/compass-projects')}
        aria-label="Back to Compass projects"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Compass projects
      </Button>

      {/* Title */}
      <div>
        {showTitleEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={titleValue || project.title}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder="Project title"
              className="max-w-md"
              aria-label="Project title"
            />
            <Button size="sm" onClick={handleSaveTitle} disabled={updateProject.isPending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingTitle(true);
                setTitleValue(project.title);
              }}
              aria-label="Edit title"
            >
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        {showDescriptionEdit ? (
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Input
              id="project-description"
              value={descriptionValue !== '' ? descriptionValue : project.description}
              onChange={(e) => setDescriptionValue(e.target.value)}
              placeholder="Optional description"
              aria-label="Project description"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveDescription} disabled={updateProject.isPending}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingDescription(false);
                  setDescriptionValue('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="text-muted-foreground flex-1">
              {project.description || <span className="italic">No description</span>}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingDescription(true);
                setDescriptionValue(project.description);
              }}
              aria-label="Edit description"
            >
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Two-column layout: knowledge left, sidebar right (sticky) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT: Knowledge list */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked rules, commands, solutions & skills</CardTitle>
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
                    <TabsTrigger value="solution">Solutions</TabsTrigger>
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
                        Rules, skills, commands, and solutions scoped to this project will appear here.
                        Add them from the Rules page and set this project as scope.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => navigate('/rules')}
                      >
                        Go to Rules & solutions
                      </Button>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No matches for this search or filter.</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {linkedRules.map((rule) => {
                      const kindStyles = CARD_KIND_CLASSES[rule.kind];
                      return (
                        // Card contains buttons; cannot use <a> wrapper. Same pattern as RulesPage.
                        // biome-ignore lint/a11y/useSemanticElements: Card contains buttons; div + role="link" for keyboard nav.
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
                          aria-label={`Open ${rule.kind}: ${rule.title}`}
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
                                  {rulesSearch.trim()
                                    ? highlightText(rule.title, rulesSearch)
                                    : rule.title}
                                </span>
                              </CardTitle>
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border capitalize',
                                  rule.kind === 'rule' &&
                                  'bg-sky-500/10 text-sky-400 border-sky-500/20',
                                  rule.kind === 'solution' &&
                                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                  rule.kind === 'skill' &&
                                  'bg-violet-500/10 text-violet-400 border-violet-500/20',
                                  rule.kind === 'command' &&
                                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                )}
                              >
                                {rule.kind}
                              </span>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground dark:text-zinc-400 line-clamp-2">
                                {rulesSearch.trim()
                                  ? highlightText(
                                    rule.description || rule.body,
                                    rulesSearch
                                  )
                                  : rule.description || rule.body}
                              </p>
                              <div className="mt-3 space-y-2">
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground dark:text-zinc-400">
                                  {(rule.author_display_name ?? rule.user_id) && (
                                    <div className="flex items-center gap-1.5">
                                      <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                      <span>
                                        {rule.author_display_name ?? 'Unknown author'}
                                      </span>
                                    </div>
                                  )}
                                  {rule.version && (
                                    <span className="font-medium">v{rule.version}</span>
                                  )}
                                </div>
                                {(rule.technologies?.length ?? 0) > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {(rule.technologies ?? []).slice(0, 5).map((tech) => {
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
                                          {rulesSearch.trim()
                                            ? highlightText(tech, rulesSearch)
                                            : tech}
                                        </span>
                                      );
                                    })}
                                    {(rule.technologies?.length ?? 0) > 5 && (
                                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border bg-white/5 text-zinc-400 dark:bg-white/5 dark:text-zinc-400 dark:border-white/10">
                                        +{(rule.technologies?.length ?? 0) - 5}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* biome-ignore lint/a11y/noStaticElementInteractions: Wrapper only stops propagation so button clicks don't trigger card nav. */}
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
                                  aria-label={`Clone this ${rule.kind} (--copy)`}
                                  className={cn(
                                    'dark:border-white/10 dark:bg-white/5',
                                    copiedRuleId === rule.id
                                      ? 'bg-muted dark:bg-white/10'
                                      : ''
                                  )}
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
        </div>

        {/* RIGHT: Sidebar (Members + Dev instructions) — sticky */}
        <aside className="w-full lg:w-[340px] shrink-0 lg:sticky lg:top-6 space-y-6">
          {/* Members */}
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

          {/* Dev instructions (Pull all via CLI) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dev instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Link your project folder, then pull all shared rules, skills, commands, and solutions.
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

          {/* Shared Configuration */}
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
        </aside>
      </div>
    </div>
  );
}
