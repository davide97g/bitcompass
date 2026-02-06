import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/** Skeleton for a single rule/solution card in the grid. */
export const RuleCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-16 rounded" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-12" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-8" />
      </div>
    </CardContent>
  </Card>
);

/** Grid of rule card skeletons for RulesPage loading state. */
export const RulesPageSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading rules">
    {Array.from({ length: 6 }).map((_, i) => (
      <RuleCardSkeleton key={i} />
    ))}
  </div>
);

/** Skeleton for the rule detail page (title, metadata, body). */
export const RuleDetailSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading rule">
    <div className="space-y-2">
      <Skeleton className="h-8 w-3/4 max-w-md" />
      <Skeleton className="h-4 w-24" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
    <div className="flex flex-wrap gap-2">
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-24 rounded-full" />
    </div>
  </div>
);

/** Skeleton for activity logs list (search bar + repo cards). */
export const ActivityLogListSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading activity logs">
    <Skeleton className="h-10 w-full max-w-md" />
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 gap-y-2">
              {Array.from({ length: 35 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-4 rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/** Skeleton for a single activity log detail page. */
export const ActivityLogDetailSkeleton = () => (
  <div className="max-w-4xl mx-auto space-y-6" aria-busy="true" aria-label="Loading activity log">
    <div className="space-y-2">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-48" />
    </div>
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
    <div className="space-y-4">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

/** Skeleton for activity log day detail page. */
export const ActivityLogDayDetailSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading day detail">
    <Skeleton className="h-6 w-48" />
    <Card>
      <CardContent className="pt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  </div>
);
