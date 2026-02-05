import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, GitBranch, GitCommit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivityLog } from '@/hooks/use-activity-logs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

export default function ActivityLogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: log, isLoading } = useActivityLog(id);
  const [repoOpen, setRepoOpen] = useState(true);
  const [gitOpen, setGitOpen] = useState(true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  if (!log) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Log not found</p>
        <Button variant="link" onClick={() => navigate('/logs')}>
          Back to Activity logs
        </Button>
      </div>
    );
  }

  const formatPeriod = (): string => {
    const start = new Date(log.periodStart);
    const end = new Date(log.periodEnd);
    const fmt = (d: Date) =>
      d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  const repo = log.repoSummary;
  const git = log.gitAnalysis;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
        <h1 className="text-2xl font-bold capitalize">{log.timeFrame} activity log</h1>
        <p className="flex items-center gap-2 mt-1 text-sm text-muted-foreground" aria-label="Period">
          <Calendar className="h-4 w-4 shrink-0" aria-hidden />
          {formatPeriod()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Saved {new Date(log.createdAt).toLocaleString()}
        </p>
      </div>

      <Collapsible open={repoOpen} onOpenChange={setRepoOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 rounded-t-lg">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4" aria-hidden />
                Repository summary
              </CardTitle>
              <span className="text-sm text-muted-foreground" aria-hidden>
                {repoOpen ? 'Collapse' : 'Expand'}
              </span>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <dl className="grid gap-2 text-sm">
                {repo.branch != null && (
                  <>
                    <dt className="font-medium text-muted-foreground">Branch</dt>
                    <dd className="font-mono">{repo.branch}</dd>
                  </>
                )}
                {repo.remote_url != null && (
                  <>
                    <dt className="font-medium text-muted-foreground">Remote</dt>
                    <dd className="font-mono break-all">{repo.remote_url}</dd>
                  </>
                )}
                {repo.repo_path != null && (
                  <>
                    <dt className="font-medium text-muted-foreground">Path</dt>
                    <dd className="font-mono text-muted-foreground break-all">{repo.repo_path}</dd>
                  </>
                )}
                {!repo.branch && !repo.remote_url && !repo.repo_path && (
                  <dd className="text-muted-foreground">No repo summary</dd>
                )}
              </dl>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={gitOpen} onOpenChange={setGitOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 rounded-t-lg">
              <CardTitle className="text-base flex items-center gap-2">
                <GitCommit className="h-4 w-4" aria-hidden />
                Git analysis
              </CardTitle>
              <span className="text-sm text-muted-foreground" aria-hidden>
                {gitOpen ? 'Collapse' : 'Expand'}
              </span>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div className="flex gap-6 text-sm">
                <span>
                  <span className="text-muted-foreground">Commits: </span>
                  <strong>{git.commit_count ?? 0}</strong>
                </span>
                {git.files_changed && (
                  <span>
                    <span className="text-muted-foreground">Insertions: </span>
                    <strong>{git.files_changed.insertions ?? 0}</strong>
                  </span>
                )}
                {git.files_changed && (
                  <span>
                    <span className="text-muted-foreground">Deletions: </span>
                    <strong>{git.files_changed.deletions ?? 0}</strong>
                  </span>
                )}
              </div>
              {Array.isArray(git.commits) && git.commits.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent commits</h3>
                  <ul className="space-y-1.5 font-mono text-sm">
                    {git.commits.slice(0, 20).map((c, i) => (
                      <li key={i} className="flex gap-2 flex-wrap">
                        <span className="text-muted-foreground">{c.hash}</span>
                        <span className="break-all">{c.subject}</span>
                        {c.date && (
                          <span className="text-muted-foreground text-xs">
                            {new Date(c.date).toLocaleString()}
                          </span>
                        )}
                      </li>
                    ))}
                    {git.commits.length > 20 && (
                      <li className="text-muted-foreground text-xs">
                        … and {git.commits.length - 20} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
