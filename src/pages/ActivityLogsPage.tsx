import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useActivityLogs } from '@/hooks/use-activity-logs';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { ActivityLog, ActivityLogTimeFrame } from '@/types/entities';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FileText, GitBranch, Calendar, Search, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formatPeriod = (log: ActivityLog): string => {
  const start = new Date(log.periodStart);
  const end = new Date(log.periodEnd);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
};

const formatCreatedAt = (iso: string): string => {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const repoSnippet = (log: ActivityLog): string => {
  const r = log.repoSummary;
  const parts: string[] = [];
  if (r.branch) parts.push(r.branch);
  if (r.remote_url) {
    const url = r.remote_url.replace(/^https?:\/\//, '').replace(/\.git$/, '');
    parts.push(url);
  }
  return parts.length ? parts.join(' · ') : '—';
};

/** Stable key for grouping logs by repository. */
const getRepoKey = (log: ActivityLog): string => {
  const r = log.repoSummary;
  if (r.remote_url) {
    return r.remote_url.replace(/^https?:\/\//, '').replace(/\.git$/, '').toLowerCase();
  }
  if (r.repo_path) return r.repo_path;
  return log.id;
};

/** Display name for a repo (from first log). */
const getRepoDisplayName = (log: ActivityLog): string => {
  return repoSnippet(log);
};

/** Whether the log's period includes the given day (YYYY-MM-DD). */
const logCoversDay = (log: ActivityLog, dayStr: string): boolean => {
  const dayStart = new Date(dayStr);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStr);
  dayEnd.setUTCHours(23, 59, 59, 999);
  const start = new Date(log.periodStart).getTime();
  const end = new Date(log.periodEnd).getTime();
  return start <= dayEnd.getTime() && end >= dayStart.getTime();
};

/** Commit count for a log covering this day (for heatmap intensity). Uses first matching log. */
const commitCountForDay = (logs: ActivityLog[], dayStr: string): number => {
  const log = logs.find((l) => logCoversDay(l, dayStr));
  return log?.gitAnalysis?.commit_count ?? 0;
};

/** Whether any log covers this day. */
const hasLogForDay = (logs: ActivityLog[], dayStr: string): boolean => {
  return logs.some((l) => logCoversDay(l, dayStr));
};

/** 1–50: uniform green gradient (not super light); 50–70: orange; >70: red. */
const activityColor = (count: number): string => {
  const green = { r: 34, g: 197, b: 94 };
  const orange = { r: 249, g: 115, b: 22 };
  const red = { r: 239, g: 68, b: 68 };

  if (count <= 50) {
    const t = count <= 0 ? 0 : count / 50;
    const opacity = 0.6 + t * 0.4;
    return `rgb(${green.r} ${green.g} ${green.b} / ${opacity})`;
  }
  if (count <= 70) {
    const blend = (count - 50) / 20;
    const r = Math.round(green.r + (orange.r - green.r) * blend);
    const g = Math.round(green.g + (orange.g - green.g) * blend);
    const b = Math.round(green.b + (orange.b - green.b) * blend);
    return `rgb(${r} ${g} ${b})`;
  }
  return `rgb(${red.r} ${red.g} ${red.b})`;
};

/** Generate YYYY-MM-DD for each day in range (inclusive). */
const getDaysInRange = (start: Date, end: Date): string[] => {
  const out: string[] = [];
  const cur = new Date(start);
  cur.setUTCHours(0, 0, 0, 0);
  const endTime = end.getTime();
  while (cur.getTime() <= endTime) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
};

/** Full year: from (today - 364) to today, aligned to Sunday. Returns 7×numWeeks grid and month labels. */
const getFullYearHeatmapGrid = (): {
  grid: (string | null)[][];
  monthLabels: string[];
  numWeeks: number;
} => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const rangeStart = new Date(end);
  rangeStart.setDate(rangeStart.getDate() - 364);
  rangeStart.setHours(0, 0, 0, 0);
  const firstSunday = new Date(rangeStart);
  firstSunday.setDate(firstSunday.getDate() - firstSunday.getDay());
  const numWeeks = 53;
  const grid: (string | null)[][] = [];
  for (let row = 0; row < 7; row++) {
    const weekRow: (string | null)[] = [];
    for (let col = 0; col < numWeeks; col++) {
      const d = new Date(firstSunday);
      d.setDate(d.getDate() + col * 7 + row);
      const inRange = d.getTime() >= rangeStart.getTime() && d.getTime() <= end.getTime();
      weekRow.push(inRange ? d.toISOString().slice(0, 10) : null);
    }
    grid.push(weekRow);
  }
  const monthLabels: string[] = [];
  let lastMonth = -1;
  for (let col = 0; col < numWeeks; col++) {
    const d = new Date(firstSunday);
    d.setDate(d.getDate() + col * 7);
    const month = d.getMonth();
    if (col === 0 || month !== lastMonth) {
      monthLabels.push(d.toLocaleDateString(undefined, { month: 'short' }));
      lastMonth = month;
    } else {
      monthLabels.push('');
    }
  }
  return { grid, monthLabels, numWeeks };
};

/** CLI instruction for a single day. */
const cliInstructionForDay = (day: string): string => `bitcompass log ${day}`;

/** CLI instruction for a date range. */
const cliInstructionForRange = (start: string, end: string): string =>
  `bitcompass log ${start} - ${end}`;

const CONTEXT_CHARS = 30;

/** Get snippet with match and surrounding context (before, match, after). Case-insensitive. */
const getSnippetWithMatch = (
  fullText: string,
  query: string,
  contextChars: number = CONTEXT_CHARS
): { before: string; match: string; after: string } | null => {
  const q = query.trim();
  if (!q || !fullText) return null;
  const lower = fullText.toLowerCase();
  const qLower = q.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return null;
  const match = fullText.slice(idx, idx + q.length);
  const beforeStart = Math.max(0, idx - contextChars);
  const before = fullText.slice(beforeStart, idx);
  const afterEnd = Math.min(fullText.length, idx + q.length + contextChars);
  const after = fullText.slice(idx + q.length, afterEnd);
  return {
    before: beforeStart > 0 ? '…' + before : before,
    match,
    after: afterEnd < fullText.length ? after + '…' : after,
  };
};

export interface ActivityLogSearchHit {
  log: ActivityLog;
  type: 'repo' | 'commit';
  commit?: { hash?: string; subject?: string; date?: string };
  snippet: { before: string; match: string; after: string };
}

/** Collect all search hits from logs for the given query (commit subject or repo text). */
const getSearchHits = (logs: ActivityLog[], query: string): ActivityLogSearchHit[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: ActivityLogSearchHit[] = [];
  for (const log of logs) {
    const repoText = repoSnippet(log);
    const repoMatch = getSnippetWithMatch(repoText, query);
    if (repoMatch) {
      hits.push({ log, type: 'repo', snippet: repoMatch });
    }
    const commits = log.gitAnalysis?.commits ?? [];
    for (const c of commits) {
      const subject = c.subject ?? '';
      if (!subject.toLowerCase().includes(q)) continue;
      const snippet = getSnippetWithMatch(subject, query);
      if (snippet) {
        hits.push({ log, type: 'commit', commit: c, snippet });
      }
    }
  }
  return hits;
};

interface SearchPreviewProps {
  hits: ActivityLogSearchHit[];
  getRepoDisplayName: (log: ActivityLog) => string;
}

function SearchPreview({ hits, getRepoDisplayName }: SearchPreviewProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          Search results ({hits.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3" role="list" aria-label="Search result snippets">
          {hits.map((hit, index) => {
            const repoName = getRepoDisplayName(hit.log);
            const period = formatPeriod(hit.log);
            const dateStr =
              hit.commit?.date != null
                ? new Date(hit.commit.date).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;
            return (
              <li key={`${hit.log.id}-${hit.type}-${index}`}>
                <Link
                  to={`/logs/${hit.log.id}`}
                  className="block rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`View log: ${repoName}, ${hit.snippet.before}${hit.snippet.match}${hit.snippet.after}`}
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-1.5">
                    <span className="font-medium text-foreground truncate" title={repoName}>
                      {repoName}
                    </span>
                    <span>{period}</span>
                    {dateStr != null && <span>{dateStr}</span>}
                  </div>
                  <p className="text-sm font-mono break-words">
                    {hit.snippet.before}
                    <mark className="bg-primary/20 text-foreground rounded px-0.5 font-medium">
                      {hit.snippet.match}
                    </mark>
                    {hit.snippet.after}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function ActivityLogsPage() {
  const { data: logs = [], isLoading } = useActivityLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedDay, setCopiedDay] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) => {
      const repoText = repoSnippet(log).toLowerCase();
      const repoKey = getRepoKey(log).toLowerCase();
      if (repoKey.includes(q) || repoText.includes(q)) return true;
      const commits = log.gitAnalysis?.commits ?? [];
      const matchCommit = commits.some(
        (c) => c.subject?.toLowerCase().includes(q)
      );
      if (matchCommit) return true;
      const repoPath = (log.repoSummary.repo_path ?? '').toLowerCase();
      return repoPath.includes(q);
    });
  }, [logs, searchQuery]);

  const searchHits = useMemo(
    () => getSearchHits(filteredLogs, searchQuery),
    [filteredLogs, searchQuery]
  );

  const logsByRepo = useMemo(() => {
    const map = new Map<string, ActivityLog[]>();
    for (const log of filteredLogs) {
      const key = getRepoKey(log);
      const list = map.get(key) ?? [];
      list.push(log);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
      );
    }
    return map;
  }, [filteredLogs]);

  const handleCopyInstruction = (day: string, rangeEnd?: string) => {
    const cmd = rangeEnd
      ? cliInstructionForRange(day, rangeEnd)
      : cliInstructionForDay(day);
    navigator.clipboard.writeText(cmd).then(
      () => {
        setCopiedDay(day);
        toast({ title: 'Copied', description: cmd });
        setTimeout(() => setCopiedDay(null), 2000);
      },
      () => {
        toast({ title: 'Copy failed', variant: 'destructive' });
      }
    );
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Activity logs"
          description="Your private git activity logs from CLI and MCP"
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Configure Supabase (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)
              to view activity logs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity logs"
        description="Your private git activity logs. Push from CLI (bitcompass log) or via MCP."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden
          />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" aria-hidden />
            <p className="text-muted-foreground">No activity logs yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Run{' '}
              <code className="rounded bg-muted px-1.5 py-0.5">bitcompass log</code>{' '}
              in a git repo, or use the create-activity-log MCP tool.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search by repo or commit message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search by repository or full text in commit messages"
            />
          </div>

          {searchQuery.trim() && searchHits.length > 0 ? (
            <SearchPreview hits={searchHits} getRepoDisplayName={getRepoDisplayName} />
          ) : null}

          {logsByRepo.size === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No activity logs match your search.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Array.from(logsByRepo.entries()).map(([repoKey, repoLogs]) => {
                const firstLog = repoLogs[0];
                const repoName = getRepoDisplayName(firstLog);
                return (
                  <RepoSection
                    key={repoKey}
                    repoName={repoName}
                    repoLogs={repoLogs}
                    onCopyInstruction={handleCopyInstruction}
                    copiedDay={copiedDay}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface RepoSectionProps {
  repoName: string;
  repoLogs: ActivityLog[];
  onCopyInstruction: (day: string, rangeEnd?: string) => void;
  copiedDay: string | null;
}

function RepoSection({
  repoName,
  repoLogs,
  onCopyInstruction,
  copiedDay,
}: RepoSectionProps) {
  const [timeFrameTab, setTimeFrameTab] =
    useState<ActivityLogTimeFrame>('day');

  const logsForTab = useMemo(
    () => repoLogs.filter((l) => l.timeFrame === timeFrameTab),
    [repoLogs, timeFrameTab]
  );

  const { grid: heatmapGrid, monthLabels, numWeeks } = useMemo(
    () => getFullYearHeatmapGrid(),
    []
  );

  const maxCommits = useMemo(() => {
    let max = 0;
    for (const row of heatmapGrid) {
      for (const day of row) {
        if (day) {
          const c = commitCountForDay(repoLogs, day);
          if (c > max) max = c;
        }
      }
    }
    return max || 1;
  }, [heatmapGrid, repoLogs]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitBranch className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate" title={repoName}>
            {repoName}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs
          value={timeFrameTab}
          onValueChange={(v) => setTimeFrameTab(v as ActivityLogTimeFrame)}
        >
          <TabsList className="grid w-full max-w-[240px] grid-cols-3">
            <TabsTrigger value="day" aria-label="Day logs">
              Day
            </TabsTrigger>
            <TabsTrigger value="week" aria-label="Week logs">
              Week
            </TabsTrigger>
            <TabsTrigger value="month" aria-label="Month logs">
              Month
            </TabsTrigger>
          </TabsList>
          <TabsContent value="day" className="mt-4">
            <LogList logs={logsForTab} />
          </TabsContent>
          <TabsContent value="week" className="mt-4">
            <LogList logs={logsForTab} />
          </TabsContent>
          <TabsContent value="month" className="mt-4">
            <LogList logs={logsForTab} />
          </TabsContent>
        </Tabs>

        <ActivityHeatmap
          grid={heatmapGrid}
          monthLabels={monthLabels}
          numWeeks={numWeeks}
          repoLogs={repoLogs}
          maxCommits={maxCommits}
          onCopyInstruction={onCopyInstruction}
          copiedDay={copiedDay}
        />
      </CardContent>
    </Card>
  );
}

function LogList({ logs }: { logs: ActivityLog[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No logs for this period. Click a missing day in the heatmap to copy the CLI command.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {logs.map((log) => (
        <li key={log.id}>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <Calendar className="h-4 w-4 shrink-0" aria-hidden />
              <span>{formatPeriod(log)}</span>
              <span className="text-xs">
                {log.gitAnalysis?.commit_count ?? 0} commits
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Saved {formatCreatedAt(log.createdAt)}
              </span>
              <Link
                to={`/logs/${log.id}`}
                className="text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                View details
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** GitHub-style full-year heatmap: 7 rows (Sun–Sat), 53 columns (weeks), month labels on top. */
function ActivityHeatmap({
  grid,
  monthLabels,
  numWeeks,
  repoLogs,
  maxCommits,
  onCopyInstruction,
  copiedDay,
}: {
  grid: (string | null)[][];
  monthLabels: string[];
  numWeeks: number;
  repoLogs: ActivityLog[];
  maxCommits: number;
  onCopyInstruction: (day: string, rangeEnd?: string) => void;
  copiedDay: string | null;
}) {
  const cellSize = 'w-full aspect-square min-w-[16px] min-h-[16px] rounded-[3px]';

  const renderCell = (dayStr: string | null, row: number, col: number) => {
    if (!dayStr) {
      return (
        <div
          key={`empty-${row}-${col}`}
          className={`${cellSize} bg-muted/30`}
          aria-hidden
        />
      );
    }
    const count = commitCountForDay(repoLogs, dayStr);
    const hasLog = hasLogForDay(repoLogs, dayStr);
    const isMissing = !hasLog;
    const isZeroCommits = hasLog && count === 0;

    if (isMissing) {
      const cmd = cliInstructionForDay(dayStr);
      const dayLabel = new Date(dayStr + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return (
        <Popover key={dayStr}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`${cellSize} border border-dashed border-muted-foreground/25 bg-muted/40 cursor-pointer outline-none transition-colors hover:bg-muted hover:border-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 block`}
              aria-label={`${dayStr}: no log — click to copy command`}
              title={`${dayStr} — no log (click to copy)`}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-[320px] p-3" align="start">
            <p className="text-sm font-medium mb-1">{dayLabel}</p>
            <p className="text-xs text-muted-foreground mb-3">
              No log for this day. Run in your repo:
            </p>
            <code className="block text-xs bg-muted rounded px-2 py-1.5 mb-3 break-all font-mono">
              {cmd}
            </code>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full gap-2"
              onClick={() => onCopyInstruction(dayStr)}
              aria-label={`Copy ${cmd}`}
            >
              {copiedDay === dayStr ? (
                <Check className="h-4 w-4 text-green-600" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              {copiedDay === dayStr ? 'Copied' : 'Copy instruction'}
            </Button>
          </PopoverContent>
        </Popover>
      );
    }

    if (isZeroCommits) {
      return (
        <Tooltip key={dayStr} delayDuration={200}>
          <TooltipTrigger asChild>
            <div
              className={`${cellSize} border border-transparent transition-colors cursor-default bg-amber-400/90`}
              tabIndex={0}
              role="img"
              aria-label={`${dayStr}: 0 commits`}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="font-mono text-xs">
            {dayStr} — 0 commits
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip key={dayStr} delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            className={`${cellSize} border border-transparent transition-colors cursor-default`}
            style={{
              backgroundColor: activityColor(count),
            }}
            tabIndex={0}
            role="img"
            aria-label={`${dayStr}: ${count} commits`}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="font-mono text-xs">
          {dayStr} — {count} commit{count !== 1 ? 's' : ''}
        </TooltipContent>
      </Tooltip>
    );
  };

  const gapPx = 2;
  const labelCol = 28;
  const cellMin = 16;
  const gridMinWidth = labelCol + numWeeks * cellMin + (numWeeks - 1) * gapPx;

  return (
    <div className="space-y-2 w-full overflow-x-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Activity (past year)
        </h3>
        <span className="text-xs text-muted-foreground shrink-0 ml-2">
          Click a missing day to copy CLI command
        </span>
      </div>
      <div
        className="w-full min-w-0 overflow-x-auto"
        role="img"
        aria-label="Activity heatmap by day, past year"
      >
        {/* Full-width grid: expands to fill container; min width keeps cells clickable on narrow viewports */}
        <div
          className="grid w-full gap-[2px]"
          style={{
            minWidth: gridMinWidth,
            gridTemplateColumns: `${labelCol}px repeat(${numWeeks}, minmax(${cellMin}px, 1fr))`,
            gridTemplateRows: `20px repeat(7, minmax(${cellMin}px, 1fr))`,
          }}
        >
          {/* Month row: empty corner + month labels */}
          <div className="row-start-1 col-start-1" aria-hidden />
          {monthLabels.map((label, col) => (
            <div
              key={`month-${col}`}
              className="text-xs text-muted-foreground leading-none flex items-end justify-center pb-0.5"
              style={{ gridColumn: col + 2, gridRow: 1 }}
              aria-hidden
            >
              {label}
            </div>
          ))}
          {/* Day rows: label + cells */}
          {DAY_LABELS.map((d, rowIndex) => (
            <div
              key={d}
              className="text-xs text-muted-foreground leading-none flex items-center pr-1"
              style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
              aria-hidden
            >
              {d}
            </div>
          ))}
          {grid.map((row, rowIndex) =>
            row.map((dayStr, colIndex) => (
              <div
                key={`cell-${rowIndex}-${colIndex}`}
                className="min-w-0 min-h-0 flex"
                style={{
                  gridColumn: colIndex + 2,
                  gridRow: rowIndex + 2,
                }}
              >
                {renderCell(dayStr, rowIndex, colIndex)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

