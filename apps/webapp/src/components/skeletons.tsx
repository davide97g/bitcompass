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
