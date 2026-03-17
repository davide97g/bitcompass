import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { TechTag, getTechColor } from '@/components/ui/tech-tag';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Problem } from '@/data/mockData';

interface ProblemCardProps {
  problem: Problem;
}

export function ProblemCard({ problem }: ProblemCardProps) {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="card-interactive cursor-pointer border"
      onClick={() => navigate(`/problems/${problem.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold leading-tight">{problem.title}</h3>
          <StatusBadge status={problem.status} className="shrink-0" />
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
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
