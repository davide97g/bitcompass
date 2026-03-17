import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { TechTag, getTechColor } from '@/components/ui/tech-tag';
import { StatusBadge } from '@/components/ui/status-badge';
import { Users } from 'lucide-react';
import type { Project } from '@/data/mockData';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="card-interactive cursor-pointer border"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold">{project.name}</h3>
          <StatusBadge status={project.status} className="shrink-0" />
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {project.description}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {project.techStack.slice(0, 4).map((tech) => (
            <TechTag key={tech} variant={getTechColor(tech)}>
              {tech}
            </TechTag>
          ))}
          {project.techStack.length > 4 && (
            <span className="text-xs text-muted-foreground self-center">
              +{project.techStack.length - 4}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>{project.team.length} team members</span>
        </div>
      </CardContent>
    </Card>
  );
}
