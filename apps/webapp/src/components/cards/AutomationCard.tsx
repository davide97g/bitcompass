import { useNavigate } from 'react-router-dom';
import { Play, GitBranch, TrendingUp, Github, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getPersonsByIds } from '@/data/mockData';
import type { Automation } from '@/data/mockData';

const categoryLabels: Record<Automation['category'], string> = {
  onboarding: 'Onboarding',
  deployment: 'Deployment',
  monitoring: 'Monitoring',
  notifications: 'Notifications',
  'data-sync': 'Data sync',
  development: 'Development',
  other: 'Other',
};

interface AutomationCardProps {
  automation: Automation;
}

export function AutomationCard({ automation }: AutomationCardProps) {
  const navigate = useNavigate();

  const handleClick = () => navigate(`/automations/${automation.id}`);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <Card
      className="card-interactive cursor-pointer border overflow-hidden"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View automation: ${automation.title}`}
    >
      <AspectRatio ratio={16 / 9} className="bg-muted">
        <div className="relative w-full h-full group">
          <img
            src={automation.videoThumbnail}
            alt=""
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-ui ease-out flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground shadow-lg">
              <Play className="w-6 h-6 text-primary-foreground fill-primary-foreground ml-0.5" />
            </div>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs font-medium">
              {categoryLabels[automation.category]}
            </Badge>
          </div>
        </div>
      </AspectRatio>
      <CardContent className="p-4">
        <h3 className="font-semibold leading-tight mb-2">{automation.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {automation.description}
        </p>
        {automation.benefits && automation.benefits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {automation.benefits.slice(0, 3).map((benefit) => (
              <Badge key={benefit} variant="outline" className="text-xs font-normal py-0">
                <TrendingUp className="w-3 h-3 mr-1 shrink-0" />
                {benefit}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <GitBranch className="w-3.5 h-3.5 shrink-0" />
          <span>{automation.steps.length} steps</span>
          {automation.triggerLabel && (
            <>
              <span className="text-border">·</span>
              <span className="truncate" title={automation.triggerLabel}>
                {automation.triggerLabel}
              </span>
            </>
          )}
        </div>
        {automation.authors && automation.authors.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">By</span>
            {getPersonsByIds(automation.authors).map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/people/${person.id}`);
                }}
                className="flex items-center gap-1.5 pr-2 py-0.5 hover:bg-muted transition-colors duration-ui ease-out text-left"
                aria-label={`View ${person.name}`}
              >
                <Avatar className="w-5 h-5">
                  <AvatarImage src={person.avatar} alt={person.name} />
                  <AvatarFallback className="text-[10px]">
                    {person.name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-foreground truncate max-w-[80px]">
                  {person.name}
                </span>
              </button>
            ))}
          </div>
        )}
        {(automation.githubUrl || automation.docLink) && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
            {automation.githubUrl && (
              <a
                href={automation.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                aria-label="View on GitHub"
              >
                <Github className="w-4 h-4 shrink-0" />
                View on GitHub
              </a>
            )}
            {automation.docLink && (
              <a
                href={automation.docLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
                aria-label="View documentation"
              >
                <FileText className="w-4 h-4 shrink-0" />
                View doc
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
