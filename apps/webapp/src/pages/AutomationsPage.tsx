import { useState } from 'react';
import { useEntries } from '@/hooks/use-entries';
import { PageHeader } from '@/components/ui/page-header';
import { AutomationCard } from '@/components/cards/AutomationCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Automation } from '@/data/mockData';

type CategoryFilter = 'all' | Automation['category'];

const categoryOptions: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'deployment', label: 'Deployment' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'data-sync', label: 'Data sync' },
  { value: 'development', label: 'Development' },
  { value: 'other', label: 'Other' },
];

export default function AutomationsPage() {
  const { automations } = useEntries();
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const filteredAutomations = automations.filter((automation) => {
    if (filter === 'all') return true;
    return automation.category === filter;
  });

  const counts: Record<CategoryFilter, number> = {
    all: automations.length,
    onboarding: automations.filter((a) => a.category === 'onboarding').length,
    deployment: automations.filter((a) => a.category === 'deployment').length,
    monitoring: automations.filter((a) => a.category === 'monitoring').length,
    notifications: automations.filter((a) => a.category === 'notifications').length,
    'data-sync': automations.filter((a) => a.category === 'data-sync').length,
    development: automations.filter((a) => a.category === 'development').length,
    other: automations.filter((a) => a.category === 'other').length,
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Automations"
        description="Workflow automations and their steps"
      />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categoryOptions.map((option) => (
          <Button
            key={option.value}
            variant="outline"
            size="sm"
            onClick={() => setFilter(option.value)}
            className={cn(
              'whitespace-nowrap',
              filter === option.value &&
                'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
            )}
          >
            {option.label}
            <span
              className={cn(
                'ml-2 text-xs px-1.5 py-0.5',
                filter === option.value ? 'bg-primary-foreground/20' : 'bg-muted'
              )}
            >
              {counts[option.value]}
            </span>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
        {filteredAutomations.map((automation) => (
          <AutomationCard key={automation.id} automation={automation} />
        ))}
      </div>

      {filteredAutomations.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No automations found in this category
        </div>
      )}
    </div>
  );
}
