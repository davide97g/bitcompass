import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { TechTag, getTechColor } from '@/components/ui/tech-tag';
import { Monitor, Server, Brain, Shield, Database } from 'lucide-react';
import type { Topic } from '@/data/mockData';

interface TopicCardProps {
  topic: Topic;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Monitor,
  Server,
  Brain,
  Shield,
  Database,
};

export function TopicCard({ topic }: TopicCardProps) {
  const navigate = useNavigate();
  const Icon = iconMap[topic.icon] || Monitor;
  
  return (
    <Card 
      className="card-interactive cursor-pointer border"
      onClick={() => navigate(`/topics/${topic.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold mb-1">{topic.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {topic.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topic.technologies.slice(0, 4).map((tech) => (
                <TechTag key={tech} variant={getTechColor(tech)}>
                  {tech}
                </TechTag>
              ))}
              {topic.technologies.length > 4 && (
                <span className="text-xs text-muted-foreground self-center">
                  +{topic.technologies.length - 4}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
