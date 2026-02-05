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

/** Last 12 weeks: exactly 84 days for a 7×12 heatmap. */
const getHeatmapRange = (): { start: Date; end: Date } => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - HEATMAP_WEEKS * 7 + 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

/** CLI instruction for a single day. */
const cliInstructionForDay = (day: string): string => `bitcompass log ${day}`;

/** CLI instruction for a date range. */
const cliInstructionForRange = (start: string, end: string): string =>
  `bitcompass log ${start} - ${end}`;

const HEATMAP_WEEKS = 12;

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

  const { start: heatStart, end: heatEnd } = useMemo(() => getHeatmapRange(), []);
  const heatmapDays = useMemo(
    () => getDaysInRange(heatStart, heatEnd),
    [heatStart, heatEnd]
  );

  const missingDays = useMemo(() => {
    return heatmapDays.filter((day) => !hasLogForDay(repoLogs, day));
  }, [heatmapDays, repoLogs]);

  const maxCommits = useMemo(() => {
    let max = 0;
    for (const day of heatmapDays) {
      const c = commitCountForDay(repoLogs, day);
      if (c > max) max = c;
    }
    return max || 1;
  }, [heatmapDays, repoLogs]);

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
          days={heatmapDays}
          repoLogs={repoLogs}
          maxCommits={maxCommits}
        />

        {missingDays.length > 0 && (
          <MissingDaysCTA
            missingDays={missingDays}
            onCopyInstruction={onCopyInstruction}
            copiedDay={copiedDay}
          />
        )}
      </CardContent>
    </Card>
  );
}

function LogList({ logs }: { logs: ActivityLog[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No logs for this period. Use the instruction below to add one.
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

function ActivityHeatmap({
  days,
  repoLogs,
  maxCommits,
}: {
  days: string[];
  repoLogs: ActivityLog[];
  maxCommits: number;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        Activity (last {HEATMAP_WEEKS} weeks)
      </h3>
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', maxWidth: 'max-content' }}
        role="img"
        aria-label="Activity heatmap by day"
      >
        {days.map((dayStr) => {
          const count = commitCountForDay(repoLogs, dayStr);
          const hasLog = count > 0;
          const intensity = hasLog ? Math.min(1, 0.2 + (count / maxCommits) * 0.8) : 0;
          return (
            <div
              key={dayStr}
              className="h-3 w-3 rounded-sm border border-border"
              style={{
                backgroundColor: hasLog
                  ? `rgb(34 197 94 / ${intensity})`
                  : 'var(--muted)',
              }}
              title={`${dayStr}${hasLog ? `: ${count} commits` : ': no log'}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function MissingDaysCTA({
  missingDays,
  onCopyInstruction,
  copiedDay,
}: {
  missingDays: string[];
  onCopyInstruction: (day: string, rangeEnd?: string) => void;
  copiedDay: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayDays = expanded ? missingDays : missingDays.slice(0, 7);
  const hasMore = missingDays.length > 7;

  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-4">
      <h3 className="text-sm font-medium mb-2">Missing days — copy CLI instruction</h3>
      <p className="text-xs text-muted-foreground mb-3">
        For days without a log, run in your repo:{' '}
        <code className="rounded bg-muted px-1 py-0.5">bitcompass log YYYY-MM-DD</code>{' '}
        or for a range:{' '}
        <code className="rounded bg-muted px-1 py-0.5">bitcompass log YYYY-MM-DD - YYYY-MM-DD</code>
      </p>
      <ul className="space-y-1.5">
        {displayDays.map((day) => (
          <li key={day} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{day}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => onCopyInstruction(day)}
              aria-label={`Copy instruction for ${day}`}
            >
              {copiedDay === day ? (
                <Check className="h-4 w-4 text-green-600" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              Copy instruction for day
            </Button>
          </li>
        ))}
      </ul>
      {hasMore && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-2 h-auto p-0"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded
            ? 'Show less'
            : `Show ${missingDays.length - 7} more missing days`}
        </Button>
      )}
    </div>
  );
}
