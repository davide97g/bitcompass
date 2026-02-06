import { useNavigate } from 'react-router-dom';
import { TechTag, getTechColor } from '@/components/ui/tech-tag';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface ProjectChipProps {
  project: {
    id: string;
    name: string;
    description?: string;
    techStack?: string[];
    status: string;
  };
}

export const ProjectChip = ({ project }: ProjectChipProps) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="cursor-pointer hover:bg-accent transition-colors"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-medium text-sm">{project.name}</p>
          <StatusBadge status={project.status} />
        </div>
        {project.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {project.description}
          </p>
        )}
        {project.techStack && project.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {project.techStack.slice(0, 3).map((tech) => (
              <TechTag key={tech} variant={getTechColor(tech)}>
                {tech}
              </TechTag>
            ))}
          </div>
        )}
        <Button variant="ghost" size="sm" className="p-0 h-auto text-xs text-primary">
          View project <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
};
