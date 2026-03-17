import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getTechStyle } from '@/lib/tech-styles';
import { cn } from '@/lib/utils';
import type { CompassProject } from '@/types/bitcompass';
import { Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export type ProjectStatus = 'Active' | 'Planning';

interface CompassProjectCardProps {
  project: CompassProject;
  memberCount: number;
  onDelete: (id: string) => void;
  status?: ProjectStatus;
  technologies?: string[];
}

export function CompassProjectCard({
  project,
  memberCount,
  onDelete,
  status = 'Active',
  technologies = [],
}: CompassProjectCardProps) {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(project.id);
  };

  return (
    <Card
      className={cn(
        'border transition-all duration-300',
        'dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-xl',
        'dark:hover:-translate-y-1 dark:hover:shadow-2xl dark:hover:shadow-violet-500/10'
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Link
              to={`/compass-projects/${project.id}`}
              className="font-display text-lg font-bold text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring rounded transition-colors"
              tabIndex={0}
              aria-label={`Open project ${project.title}`}
            >
              {project.title}
            </Link>
            <span
              role="status"
              className="inline-flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border bg-muted/80 text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-zinc-400"
              aria-label={`Status: ${status}`}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                )}
              />
              {status}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground dark:text-zinc-400 hover:text-destructive h-8 w-8"
            onClick={handleDeleteClick}
            aria-label={`Delete project ${project.title}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground dark:text-zinc-400 line-clamp-2 mb-3 font-sans">
          {project.description || 'No description'}
        </p>
        {technologies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {technologies.slice(0, 5).map((tech) => {
              const style = getTechStyle(tech);
              return (
                <span
                  key={tech}
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border',
                    style.bg,
                    style.text,
                    style.border
                  )}
                >
                  {tech}
                </span>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground dark:text-zinc-400 mb-3">
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
        </div>
        <Link
          to={`/compass-projects/${project.id}`}
          className="inline-flex items-center text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded transition-colors"
          tabIndex={0}
          aria-label={`Manage project ${project.title}`}
        >
          Manage project
        </Link>
      </CardContent>
    </Card>
  );
}
