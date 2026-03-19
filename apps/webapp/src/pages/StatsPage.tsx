import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Download, TrendingUp, Package, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import {
  useDownloadOverview,
  useDownloadTrends,
  useTopDownloaded,
  useKindBreakdown,
  useSourceBreakdown,
  useEditorDistribution,
  useProjectDownloadStats,
  useTopContributors,
} from '@/hooks/use-download-stats';
import { useRules } from '@/hooks/use-rules';
import { useProfilesByIds } from '@/hooks/use-profiles';
import { useCompassProjects } from '@/hooks/use-compass-projects';
import type { RuleKind } from '@/types/bitcompass';

const KIND_COLORS: Record<RuleKind, string> = {
  rule: '#0ea5e9',
  documentation: '#10b981',
  skill: '#8b5cf6',
  command: '#f59e0b',
};

const SOURCE_COLORS: Record<string, string> = {
  cli: '#0ea5e9',
  mcp: '#8b5cf6',
  sync: '#10b981',
};

const EDITOR_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export default function StatsPage() {
  const [trendPeriod, setTrendPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [topPeriod, setTopPeriod] = useState<'7d' | '30d' | 'all'>('7d');

  const { data: overview, isLoading: overviewLoading } = useDownloadOverview();
  const { data: trends = [] } = useDownloadTrends(trendPeriod);
  const { data: topDownloaded = [] } = useTopDownloaded(topPeriod, 10);
  const { data: kindBreakdown = [] } = useKindBreakdown();
  const { data: sourceBreakdown = [] } = useSourceBreakdown();
  const { data: editorDist = [] } = useEditorDistribution();
  const { data: projectStats = [] } = useProjectDownloadStats();
  const { data: topContributors = [] } = useTopContributors(10);

  // Fetch rule details for top downloaded
  const { data: allRules = [] } = useRules();
  const ruleMap = new Map(allRules.map((r) => [r.id, r]));

  // Fetch profiles for top contributors
  const contributorIds = topContributors.map((c) => c.user_id);
  const { data: contributorProfiles = [] } = useProfilesByIds(contributorIds);
  const profileMap = new Map(contributorProfiles.map((p) => [p.id, p]));

  // Fetch projects for project stats
  const { data: compassProjects = [] } = useCompassProjects();
  const projectMap = new Map(compassProjects.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <PageHeader title="Stats" description="Download tracking and usage analytics" />

      {/* 5a. Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <OverviewCard
          label="Total Downloads"
          value={overview?.total}
          loading={overviewLoading}
          icon={<Download className="h-4 w-4 text-muted-foreground" />}
        />
        <OverviewCard
          label="Downloads This Week"
          value={overview?.last7d}
          loading={overviewLoading}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <OverviewCard
          label="Unique Entities Pulled"
          value={overview?.uniqueEntities}
          loading={overviewLoading}
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
        />
        <OverviewCard
          label="Active Pullers"
          value={overview?.uniqueUsers}
          loading={overviewLoading}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* 5b. Download Trends */}
      <Card className="dark:border-white/10 dark:bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Download Trends</CardTitle>
          <Tabs value={trendPeriod} onValueChange={(v) => setTrendPeriod(v as typeof trendPeriod)}>
            <TabsList className="h-8">
              <TabsTrigger value="7d" className="text-xs px-2">7d</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-2">30d</TabsTrigger>
              <TabsTrigger value="90d" className="text-xs px-2">90d</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {trends.length > 0 ? (
            <ChartContainer
              config={{ count: { label: 'Downloads', color: '#0ea5e9' } }}
              className="h-[250px] w-full"
            >
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(5)}
                  className="text-xs"
                  stroke="currentColor"
                  strokeOpacity={0.3}
                />
                <YAxis
                  allowDecimals={false}
                  className="text-xs"
                  stroke="currentColor"
                  strokeOpacity={0.3}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0ea5e9"
                  fill="url(#fillCount)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              No download data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5c. Trending Entities */}
      <Card className="dark:border-white/10 dark:bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Trending Entities</CardTitle>
          <Tabs value={topPeriod} onValueChange={(v) => setTopPeriod(v as typeof topPeriod)}>
            <TabsList className="h-8">
              <TabsTrigger value="7d" className="text-xs px-2">7d</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-2">30d</TabsTrigger>
              <TabsTrigger value="all" className="text-xs px-2">All time</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {topDownloaded.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Bar chart */}
              <ChartContainer
                config={{ count: { label: 'Downloads', color: '#0ea5e9' } }}
                className="h-[300px]"
              >
                <BarChart
                  data={topDownloaded.map((item) => ({
                    name: ruleMap.get(item.rule_id)?.title?.slice(0, 20) ?? item.rule_id.slice(0, 8),
                    count: item.count,
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" allowDecimals={false} stroke="currentColor" strokeOpacity={0.3} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    className="text-xs"
                    stroke="currentColor"
                    strokeOpacity={0.3}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>

              {/* Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead className="text-right">Pulls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDownloaded.map((item, idx) => {
                    const rule = ruleMap.get(item.rule_id);
                    return (
                      <TableRow key={item.rule_id}>
                        <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          {rule ? (
                            <Link to={`/skills/${rule.id}`} className="hover:underline text-foreground">
                              {rule.title}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">{item.rule_id.slice(0, 8)}...</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rule && (
                            <KindBadge kind={rule.kind} />
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{item.count}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              No download data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5d. Kind Breakdown + Source Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Kind breakdown */}
        <Card className="dark:border-white/10 dark:bg-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Entity Kind</CardTitle>
          </CardHeader>
          <CardContent>
            {kindBreakdown.length > 0 ? (
              <>
                <ChartContainer
                  config={{
                    rule: { label: 'Rules', color: KIND_COLORS.rule },
                    documentation: { label: 'Docs', color: KIND_COLORS.documentation },
                    skill: { label: 'Skills', color: KIND_COLORS.skill },
                    command: { label: 'Commands', color: KIND_COLORS.command },
                  }}
                  className="aspect-square max-h-[200px] mx-auto"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={kindBreakdown.map((s) => ({
                        name: s.kind,
                        value: s.count,
                        fill: KIND_COLORS[s.kind] ?? '#6b7280',
                      }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="50%"
                      outerRadius="80%"
                      paddingAngle={2}
                      strokeWidth={0}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs">
                  {kindBreakdown.map((s) => (
                    <LegendDot
                      key={s.kind}
                      color={KIND_COLORS[s.kind] ?? '#6b7280'}
                      label={`${s.kind} (${s.count})`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source breakdown */}
        <Card className="dark:border-white/10 dark:bg-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Source</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceBreakdown.length > 0 ? (
              <>
                <ChartContainer
                  config={{
                    cli: { label: 'CLI', color: SOURCE_COLORS.cli },
                    mcp: { label: 'MCP', color: SOURCE_COLORS.mcp },
                    sync: { label: 'Sync', color: SOURCE_COLORS.sync },
                  }}
                  className="aspect-square max-h-[200px] mx-auto"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={sourceBreakdown.map((s) => ({
                        name: s.source,
                        value: s.count,
                        fill: SOURCE_COLORS[s.source] ?? '#6b7280',
                      }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="50%"
                      outerRadius="80%"
                      paddingAngle={2}
                      strokeWidth={0}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs">
                  {sourceBreakdown.map((s) => (
                    <LegendDot
                      key={s.source}
                      color={SOURCE_COLORS[s.source] ?? '#6b7280'}
                      label={`${s.source} (${s.count})`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5e. Editor Distribution */}
      <Card className="dark:border-white/10 dark:bg-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Editor Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {editorDist.length > 0 ? (
            <>
              <ChartContainer
                config={Object.fromEntries(
                  editorDist.map((e, i) => [e.editor, { label: e.editor, color: EDITOR_COLORS[i % EDITOR_COLORS.length] }])
                )}
                className="aspect-square max-h-[200px] mx-auto"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={editorDist.map((e, i) => ({
                      name: e.editor,
                      value: e.count,
                      fill: EDITOR_COLORS[i % EDITOR_COLORS.length],
                    }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="50%"
                    outerRadius="80%"
                    paddingAngle={2}
                    strokeWidth={0}
                  />
                </PieChart>
              </ChartContainer>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs">
                {editorDist.map((e, i) => (
                  <LegendDot
                    key={e.editor}
                    color={EDITOR_COLORS[i % EDITOR_COLORS.length]}
                    label={`${e.editor} (${e.count})`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              No data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5f. Project Adoption */}
      {projectStats.length > 0 && (
        <Card className="dark:border-white/10 dark:bg-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Project Adoption</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ count: { label: 'Downloads', color: '#8b5cf6' } }}
              className="h-[250px] w-full"
            >
              <BarChart
                data={projectStats.map((ps) => ({
                  name: projectMap.get(ps.compass_project_id)?.title?.slice(0, 25) ?? ps.compass_project_id.slice(0, 8),
                  count: ps.count,
                  id: ps.compass_project_id,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" allowDecimals={false} stroke="currentColor" strokeOpacity={0.3} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  className="text-xs"
                  stroke="currentColor"
                  strokeOpacity={0.3}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* 5g. Top Contributors Leaderboard */}
      {topContributors.length > 0 && (
        <Card className="dark:border-white/10 dark:bg-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Contributor</TableHead>
                  <TableHead className="text-right">Downloads Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topContributors.map((c, idx) => {
                  const profile = profileMap.get(c.user_id);
                  const name = profile?.full_name || profile?.email || c.user_id.slice(0, 8);
                  const initials = (name)
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <TableRow key={c.user_id}>
                      <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <Link to={`/users/${c.user_id}`} className="flex items-center gap-2 hover:underline">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-foreground">{name}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{c.downloads}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OverviewCard({
  label,
  value,
  loading,
  icon,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Card className="dark:border-white/10 dark:bg-white/5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <span className="text-2xl font-bold tabular-nums">{value ?? 0}</span>
        )}
      </CardContent>
    </Card>
  );
}

function KindBadge({ kind }: { kind: RuleKind }) {
  const styles: Record<RuleKind, string> = {
    rule: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    documentation: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    skill: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    command: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border capitalize', styles[kind])}>
      {kind}
    </span>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
