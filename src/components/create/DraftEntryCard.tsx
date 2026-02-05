import { Card, CardContent } from '@/components/ui/card';
import { TechTag, getTechColor } from '@/components/ui/tech-tag';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import type { Problem, Project, Automation } from '@/data/mockData';
import type { EntryType } from '@/lib/createEntryMappers';

const categoryLabels: Record<Automation['category'], string> = {
  onboarding: 'Onboarding',
  deployment: 'Deployment',
  monitoring: 'Monitoring',
  notifications: 'Notifications',
  'data-sync': 'Data sync',
  development: 'Development',
  other: 'Other',
};

interface DraftEntryCardProps {
  type: EntryType;
  entry: Problem | Project | Automation;
  className?: string;
}

export function DraftEntryCard({ type, entry, className }: DraftEntryCardProps) {
  if (type === 'problem') {
    const problem = entry as Problem;
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold leading-tight">{problem.title}</h3>
            <StatusBadge status={problem.status} className="shrink-0" />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {problem.description}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {problem.technologies.slice(0, 4).map((tech) => (
              <TechTag key={tech} variant={getTechColor(tech)}>
                {tech}
              </TechTag>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === 'project') {
    const project = entry as Project;
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold">{project.name}</h3>
            <StatusBadge status={project.status} className="shrink-0" />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {project.description}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {project.techStack.slice(0, 4).map((tech) => (
              <TechTag key={tech} variant={getTechColor(tech)}>
                {tech}
              </TechTag>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const automation = entry as Automation;
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold">{automation.title}</h3>
          <Badge variant="secondary" className="text-xs">
            {categoryLabels[automation.category]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {automation.description}
        </p>
        <p className="text-xs text-muted-foreground">
          {automation.steps.length} step{automation.steps.length !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  );
}
