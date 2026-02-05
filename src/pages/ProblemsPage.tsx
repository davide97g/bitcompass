import { useState } from 'react';
import { useEntries } from '@/hooks/use-entries';
import { PageHeader } from '@/components/ui/page-header';
import { ProblemCard } from '@/components/cards/ProblemCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'open' | 'in-progress' | 'solved';

export default function ProblemsPage() {
  const { problems } = useEntries();
  const [filter, setFilter] = useState<StatusFilter>('all');

  const filteredProblems = problems.filter((problem) => {
    if (filter === 'all') return true;
    return problem.status === filter;
  });

  const counts = {
    all: problems.length,
    open: problems.filter(p => p.status === 'open').length,
    'in-progress': problems.filter(p => p.status === 'in-progress').length,
    solved: problems.filter(p => p.status === 'solved').length,
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        title="Problems" 
        description="Track and solve engineering challenges"
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'open', 'in-progress', 'solved'] as StatusFilter[]).map((status) => (
          <Button
            key={status}
            variant="outline"
            size="sm"
            onClick={() => setFilter(status)}
            className={cn(
              'capitalize',
              filter === status && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
            )}
          >
            {status === 'all' ? 'All' : status.replace('-', ' ')}
            <span className={cn(
              'ml-2 text-xs px-1.5 py-0.5 rounded-full',
              filter === status ? 'bg-primary-foreground/20' : 'bg-muted'
            )}>
              {counts[status]}
            </span>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 stagger-children">
        {filteredProblems.map((problem) => (
          <ProblemCard key={problem.id} problem={problem} />
        ))}
      </div>

      {filteredProblems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No problems found with this filter
        </div>
      )}
    </div>
  );
}
