import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivityLogs } from '@/hooks/use-activity-logs';
import { getRepoKey } from '@/pages/ActivityLogsPage';
import type { ActivityLog } from '@/types/entities';
import { ArrowLeft, GitBranch, GitCommit } from 'lucide-react';
import { useMemo } from 'react';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ActivityLogDayDetailSkeleton } from '@/components/skeletons';

/** Whether a commit date falls on the given day (YYYY-MM-DD). */
const commitFallsOnDay = (commitDate: string | undefined, dayStr: string): boolean => {
  if (!commitDate) return false;
  try {
    const commit = new Date(commitDate);
    // Normalize both dates to UTC and compare date strings (YYYY-MM-DD)
    const commitDateStr = commit.toISOString().slice(0, 10);
    // dayStr is already in YYYY-MM-DD format, so compare directly
    return commitDateStr === dayStr;
  } catch {
    return false;
  }
};

/** Get display name for a repo from a log. */
const getRepoDisplayName = (log: ActivityLog): string => {
  const r = log.repoSummary;
  const parts: string[] = [];
  if (r.branch) parts.push(r.branch);
  if (r.remote_url) {
    const url = r.remote_url.replace(/^https?:\/\//, '').replace(/\.git$/, '');
    parts.push(url);
  }
  return parts.length ? parts.join(' · ') : '—';
};

export default function ActivityLogDayDetailPage() {
  const { date } = useParams<{ date: string }>();
  const [searchParams] = useSearchParams();
  const repoKey = searchParams.get('repo');
  const navigate = useNavigate();
  const { data: logs = [], isLoading } = useActivityLogs();

  const dayData = useMemo(() => {
    if (!date || !repoKey) return null;

    // Filter logs for this repo
    const repoLogs = logs.filter((log) => getRepoKey(log) === repoKey);
    if (repoLogs.length === 0) return null;

    // Collect all commits from logs that cover this day
    const dayCommits: Array<{
      hash?: string;
      subject?: string;
      date?: string;
      logId: string;
      logPeriod: string;
    }> = [];

    for (const log of repoLogs) {
      // Check if log covers this day
      const dayStart = new Date(date);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setUTCHours(23, 59, 59, 999);
      const logStart = new Date(log.periodStart).getTime();
      const logEnd = new Date(log.periodEnd).getTime();

      if (logStart <= dayEnd.getTime() && logEnd >= dayStart.getTime()) {
        // Log covers this day, filter commits for this specific day
        const commits = log.gitAnalysis?.commits ?? [];
        for (const commit of commits) {
          if (commitFallsOnDay(commit.date, date)) {
            dayCommits.push({
              ...commit,
              logId: log.id,
              logPeriod: `${new Date(log.periodStart).toLocaleDateString()} – ${new Date(log.periodEnd).toLocaleDateString()}`,
            });
          }
        }
      }
    }

    // Sort commits by date (most recent first)
    dayCommits.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const firstLog = repoLogs[0];
    return {
      repoName: getRepoDisplayName(firstLog),
      repoSummary: firstLog.repoSummary,
      commits: dayCommits,
      date,
    };
  }, [logs, date, repoKey]);

  if (isLoading) {
    return <ActivityLogDayDetailSkeleton />;
  }

  if (!date || !repoKey) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Invalid date or repository</p>
        <Button variant="link" onClick={() => navigate('/logs')}>
          Back to Activity logs
        </Button>
      </div>
    );
  }

  if (!dayData) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No data found for this day</p>
        <Button variant="link" onClick={() => navigate('/logs')}>
          Back to Activity logs
        </Button>
      </div>
    );
  }

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-full mx-auto space-y-6">
      <PageBreadcrumb items={[{ label: 'Activity logs', href: '/logs' }, { label: `Day ${formattedDate}` }]} />
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => navigate('/logs')}
        aria-label="Back to Activity logs"
      >
        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
        Back to Activity logs
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Activity for {formattedDate}</h1>
        <p className="flex items-center gap-2 mt-1 text-sm text-muted-foreground" aria-label="Repository">
          <GitBranch className="h-4 w-4 shrink-0" aria-hidden />
          {dayData.repoName}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitCommit className="h-4 w-4" aria-hidden />
              Commits ({dayData.commits.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0">
            {dayData.commits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No commits found for this day.
              </p>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 min-h-0 max-h-[600px]">
                <ul className="space-y-3">
                  {dayData.commits.map((commit, index) => (
                    <li
                      key={`${commit.logId}-${commit.hash}-${index}`}
                      className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {commit.hash && (
                          <code className="text-xs bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
                            {commit.hash}
                          </code>
                        )}
                        {commit.date && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(commit.date).toLocaleString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      {commit.subject && (
                        <p className="text-sm font-mono break-words">{commit.subject}</p>
                      )}
                      <Link
                        to={`/logs/${commit.logId}`}
                        className="text-xs text-primary hover:underline focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        View log: {commit.logPeriod}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4" aria-hidden />
              Repository summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              {dayData.repoSummary.branch != null && (
                <>
                  <dt className="font-medium text-muted-foreground">Branch</dt>
                  <dd className="font-mono">{dayData.repoSummary.branch}</dd>
                </>
              )}
              {dayData.repoSummary.remote_url != null && (
                <>
                  <dt className="font-medium text-muted-foreground">Remote</dt>
                  <dd className="font-mono break-all">{dayData.repoSummary.remote_url}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
