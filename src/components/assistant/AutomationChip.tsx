import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface AutomationChipProps {
  automation: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    benefits?: string[];
  };
}

export const AutomationChip = ({ automation }: AutomationChipProps) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="cursor-pointer hover:bg-accent transition-colors border-primary/20"
      onClick={() => navigate(`/automations/${automation.id}`)}
    >
      <CardContent className="p-3">
        <p className="font-medium text-sm mb-1">{automation.title}</p>
        {automation.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {automation.description}
          </p>
        )}
        {automation.benefits && automation.benefits.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {automation.benefits.slice(0, 2).map((benefit) => (
              <span key={benefit} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {benefit}
              </span>
            ))}
          </div>
        )}
        <Button variant="default" size="sm" className="w-full gap-1">
          Use this automation <ArrowRight className="w-3 h-3" />
        </Button>
      </CardContent>
    </Card>
  );
};
