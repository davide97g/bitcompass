import { useNavigate } from 'react-router-dom';
import { TechTag, getTechColor } from '@/components/ui/tech-tag';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { RuleKind } from '@/types/bitcompass';

interface RuleChipProps {
  rule: {
    id: string;
    title: string;
    description?: string;
    kind: RuleKind;
    technologies?: string[];
  };
}

export const RuleChip = ({ rule }: RuleChipProps) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="cursor-pointer hover:bg-accent transition-colors"
      onClick={() => navigate(`/rules/${rule.id}`)}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-medium text-sm">{rule.title}</p>
          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
            {rule.kind}
          </span>
        </div>
        {rule.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {rule.description}
          </p>
        )}
        {rule.technologies && rule.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {rule.technologies.slice(0, 3).map((tech) => (
              <TechTag key={tech} variant={getTechColor(tech)}>
                {tech}
              </TechTag>
            ))}
          </div>
        )}
        <Button variant="ghost" size="sm" className="p-0 h-auto text-xs text-primary">
          View {rule.kind} <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
};
