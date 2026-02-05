import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useActivityLogs } from '@/hooks/use-activity-logs';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { ActivityLog } from '@/types/entities';
import { FileText, GitBranch, Calendar } from 'lucide-react';

const formatPeriod = (log: ActivityLog): string => {
  const start = new Date(log.periodStart);
  const end = new Date(log.periodEnd);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

export default function ActivityLogsPage() {
  const { data: logs = [], isLoading } = useActivityLogs();

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader title="Activity logs" description="Your private git activity logs from CLI and MCP" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Configure Supabase (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) to view activity logs.
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
              Run <code className="rounded bg-muted px-1.5 py-0.5">bitcompass log</code> in a git repo, or use the
              create-activity-log MCP tool.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-base capitalize">{log.timeFrame}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {log.gitAnalysis?.commit_count ?? 0} commits
                </span>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="flex items-center gap-2 text-sm text-muted-foreground" title="Repository">
                  <GitBranch className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{repoSnippet(log)}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground" title="Period">
                  <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                  {formatPeriod(log)}
                </p>
                <p className="text-xs text-muted-foreground">Saved {formatCreatedAt(log.createdAt)}</p>
                <Link
                  to={`/logs/${log.id}`}
                  className="inline-flex text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  View details
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
