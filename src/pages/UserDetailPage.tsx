import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
import { useRulesPaginated } from '@/hooks/use-rules';
import { useCompassProjects } from '@/hooks/use-compass-projects';
import { useProfile } from '@/hooks/use-profiles';
import { useAuth } from '@/hooks/use-auth';
import { useUserStats } from '@/hooks/use-user-stats';
import { useToast } from '@/hooks/use-toast';
import type { Rule, RuleKind, RuleVisibility } from '@/types/bitcompass';
import { BookMarked, FileDown, Search, User, Link2, GitFork, Lock, Globe, ArrowLeft, Layers } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Cell, Pie, PieChart } from 'recharts';
import { ruleDownloadBasename } from '@/lib/utils';
import { getTechStyle } from '@/lib/tech-styles';
import { RulesPageSkeleton } from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

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

const VALID_KINDS: Array<RuleKind | 'all'> = ['all', 'rule', 'solution', 'skill', 'command'];
const RULES_PAGE_SIZE = 20;

export default function UserDetailPage() {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwnProfile = Boolean(user && userId && user.id === userId);

  const { data: profile, isLoading: profileLoading } = useProfile(userId);

  const [kindFilter, setKindFilter] = useState<RuleKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: stats } = useUserStats(userId);

  const { data: compassProjects = [] } = useCompassProjects();
  const projectIdToTitle = Object.fromEntries(compassProjects.map((p) => [p.id, p.title]));

  // For own profile, show all rules. For other users, only show public.
  const { data: paginatedResult, isLoading: loadingRules } = useRulesPaginated({
    kind: kindFilter,
    page,
    search,
    pageSize: RULES_PAGE_SIZE,
    userId: userId,
    visibility: isOwnProfile ? undefined : 'public',
  });
  const rules = paginatedResult?.data ?? [];
  const total = paginatedResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / RULES_PAGE_SIZE));

  const displayName = profile?.full_name || profile?.email || 'Unknown user';
  const initials = (profile?.full_name || profile?.email || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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

  if (!userId) return null;

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: 'Users', href: '/users' }, { label: displayName }]} />

      {/* User profile header */}
      {profileLoading ? (
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {profile?.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={displayName} />
            )}
            <AvatarFallback className="text-lg font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-foreground">
              {displayName}
            </h1>
            {profile?.email && profile.full_name && (
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            )}
            {isOwnProfile && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border bg-primary/10 text-primary border-primary/20 mt-1">
                You
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats & distribution chart */}
      {stats && stats.total > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Summary stats */}
          <Card className="dark:border-white/10 dark:bg-white/5">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Contribution overview</h2>
              <div className="grid grid-cols-2 gap-2">
                <StatBadge label="Rules" count={stats.rules} color="sky" />
                <StatBadge label="Solutions" count={stats.solutions} color="emerald" />
                <StatBadge label="Skills" count={stats.skills} color="violet" />
                <StatBadge label="Commands" count={stats.commands} color="amber" />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border dark:border-white/10">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  <span>{stats.sharedProjects} {stats.sharedProjects === 1 ? 'project' : 'projects'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3 text-green-400" />
                    {stats.publicCount} public
                  </span>
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-zinc-400" />
                    {stats.privateCount} private
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{stats.total}</span> total contributions
              </div>
            </CardContent>
          </Card>

          {/* Distribution chart */}
          <Card className="dark:border-white/10 dark:bg-white/5">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Distribution by kind</h2>
              <ChartContainer
                config={{
                  rules: { label: 'Rules', color: '#0ea5e9' },
                  solutions: { label: 'Solutions', color: '#10b981' },
                  skills: { label: 'Skills', color: '#8b5cf6' },
                  commands: { label: 'Commands', color: '#f59e0b' },
                }}
                className="aspect-square max-h-[200px] mx-auto"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={[
                      { name: 'Rules', value: stats.rules, fill: '#0ea5e9' },
                      { name: 'Solutions', value: stats.solutions, fill: '#10b981' },
                      { name: 'Skills', value: stats.skills, fill: '#8b5cf6' },
                      { name: 'Commands', value: stats.commands, fill: '#f59e0b' },
                    ].filter((d) => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="50%"
                    outerRadius="80%"
                    paddingAngle={2}
                    strokeWidth={0}
                  />
                </PieChart>
              </ChartContainer>
              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs">
                {stats.rules > 0 && <LegendDot color="bg-sky-500" label="Rules" />}
                {stats.solutions > 0 && <LegendDot color="bg-emerald-500" label="Solutions" />}
                {stats.skills > 0 && <LegendDot color="bg-violet-500" label="Skills" />}
                {stats.commands > 0 && <LegendDot color="bg-amber-500" label="Commands" />}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Knowledge base section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Linked rules, commands, solutions &amp; skills
        </h2>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Tabs value={kindFilter} onValueChange={(v) => { setKindFilter(v as RuleKind | 'all'); setPage(1); }}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="rule">Rules</TabsTrigger>
              <TabsTrigger value="solution">Solutions</TabsTrigger>
              <TabsTrigger value="skill">Skills</TabsTrigger>
              <TabsTrigger value="command">Commands</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loadingRules ? (
          <RulesPageSkeleton />
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BookMarked className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search.trim()
                  ? 'No matches for this search.'
                  : isOwnProfile
                    ? "You haven't created any rules yet."
                    : 'This user has no public rules.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rules.map((rule) => {
              const kindStyles = CARD_KIND_CLASSES[rule.kind];
              return (
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
                        <span className="hover:underline text-foreground">{rule.title}</span>
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
                        {rule.description || rule.body}
                      </p>

                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground dark:text-zinc-400">
                          {rule.version && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">v{rule.version}</span>
                            </div>
                          )}
                        </div>

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
                                  {tech}
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

        {!loadingRules && rules.length > 0 && totalPages > 1 && (
          <Pagination aria-label="User rules pagination">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
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
                        setPage(n);
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
                    if (page < totalPages) setPage(page + 1);
                  }}
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}

const STAT_COLOR_MAP = {
  sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
} as const;

function StatBadge({ label, count, color }: { label: string; count: number; color: keyof typeof STAT_COLOR_MAP }) {
  return (
    <div className={cn('flex items-center justify-between px-2.5 py-1.5 rounded border text-xs font-medium', STAT_COLOR_MAP[color])}>
      <span>{label}</span>
      <span className="font-bold tabular-nums">{count}</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <span className={cn('h-2 w-2 rounded-full shrink-0', color)} />
      {label}
    </span>
  );
}
