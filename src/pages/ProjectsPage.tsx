import { useState } from 'react';
import { useEntries } from '@/hooks/use-entries';
import { PageHeader } from '@/components/ui/page-header';
import { ProjectCard } from '@/components/cards/ProjectCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'completed' | 'planning' | 'on-hold';

export default function ProjectsPage() {
  const { projects } = useEntries();
  const [filter, setFilter] = useState<StatusFilter>('all');

  const filteredProjects = projects.filter((project) => {
    if (filter === 'all') return true;
    return project.status === filter;
  });

  const counts = {
    all: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    planning: projects.filter(p => p.status === 'planning').length,
    'on-hold': projects.filter(p => p.status === 'on-hold').length,
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        title="Projects" 
        description="Company projects and initiatives"
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'active', 'planning', 'completed', 'on-hold'] as StatusFilter[]).map((status) => (
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
        {filteredProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No projects found with this filter
        </div>
      )}
    </div>
  );
}
