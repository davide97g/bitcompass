import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAllUserStats } from '@/hooks/use-user-stats';
import { useAuth } from '@/hooks/use-auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Search, Users, BookMarked, Layers, Globe, Lock } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

function UserCardSkeleton() {
  return (
    <Card className="dark:border-white/10 dark:bg-white/5">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-8 rounded" />
          <Skeleton className="h-8 rounded" />
          <Skeleton className="h-8 rounded" />
          <Skeleton className="h-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: allStats = [], isLoading } = useAllUserStats();
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? allStats.filter((s) => {
        const q = search.toLowerCase();
        return (
          (s.profile.full_name?.toLowerCase().includes(q)) ||
          (s.profile.email?.toLowerCase().includes(q))
        );
      })
    : allStats;

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users" description="Team members and contributors" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Configure Supabase to use this feature.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Team members and contributors with their knowledge base stats"
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <UserCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search.trim() ? 'No users match this search.' : 'No users found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const displayName = s.profile.full_name || s.profile.email || 'Unknown';
            const initials = (s.profile.full_name || s.profile.email || '?')
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            const isMe = user?.id === s.profile.id;

            return (
              <div
                key={s.profile.id}
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/users/${s.profile.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/users/${s.profile.id}`);
                  }
                }}
                className="block cursor-pointer"
                aria-label={`View ${displayName}'s profile`}
              >
                <Card
                  className={cn(
                    'transition-all duration-300 border',
                    'dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-xl',
                    'dark:hover:-translate-y-1 dark:hover:shadow-2xl dark:hover:shadow-primary/10',
                    'hover:border-primary/30'
                  )}
                >
                  <CardContent className="p-5">
                    {/* User header */}
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-12 w-12">
                        {s.profile.avatar_url && (
                          <AvatarImage src={s.profile.avatar_url} alt={displayName} />
                        )}
                        <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-foreground truncate">
                            {displayName}
                          </span>
                          {isMe && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border bg-primary/10 text-primary border-primary/20 shrink-0">
                              You
                            </span>
                          )}
                        </div>
                        {s.profile.email && s.profile.full_name && (
                          <p className="text-xs text-muted-foreground truncate">{s.profile.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <StatBadge label="Rules" count={s.rules} color="sky" />
                      <StatBadge label="Docs" count={s.docs} color="emerald" />
                      <StatBadge label="Skills" count={s.skills} color="violet" />
                      <StatBadge label="Commands" count={s.commands} color="amber" />
                    </div>

                    {/* Bottom row: projects + visibility breakdown */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-zinc-400 pt-2 border-t border-border dark:border-white/10">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 shrink-0" />
                        <span>{s.sharedProjects} {s.sharedProjects === 1 ? 'project' : 'projects'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-green-400" />
                          {s.publicCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Lock className="h-3 w-3 text-zinc-400" />
                          {s.privateCount}
                        </span>
                      </div>
                    </div>

                    {/* Contribution bar */}
                    {s.total > 0 && (
                      <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        {s.rules > 0 && (
                          <div
                            className="bg-sky-500 transition-all"
                            style={{ width: `${(s.rules / s.total) * 100}%` }}
                            title={`${s.rules} rules`}
                          />
                        )}
                        {s.docs > 0 && (
                          <div
                            className="bg-emerald-500 transition-all"
                            style={{ width: `${(s.docs / s.total) * 100}%` }}
                            title={`${s.docs} docs`}
                          />
                        )}
                        {s.skills > 0 && (
                          <div
                            className="bg-violet-500 transition-all"
                            style={{ width: `${(s.skills / s.total) * 100}%` }}
                            title={`${s.skills} skills`}
                          />
                        )}
                        {s.commands > 0 && (
                          <div
                            className="bg-amber-500 transition-all"
                            style={{ width: `${(s.commands / s.total) * 100}%` }}
                            title={`${s.commands} commands`}
                          />
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const COLOR_MAP = {
  sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
} as const;

function StatBadge({ label, count, color }: { label: string; count: number; color: keyof typeof COLOR_MAP }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-2.5 py-1.5 rounded border text-xs font-medium',
        COLOR_MAP[color]
      )}
    >
      <span>{label}</span>
      <span className="font-bold tabular-nums">{count}</span>
    </div>
  );
}
