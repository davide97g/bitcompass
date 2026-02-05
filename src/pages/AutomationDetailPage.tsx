import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, GitBranch, Sparkles, TrendingUp, Users, Github, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getPersonsByIds } from '@/data/mockData';
import { useEntries } from '@/hooks/use-entries';
import { cn } from '@/lib/utils';

const categoryLabels: Record<string, string> = {
  onboarding: 'Onboarding',
  deployment: 'Deployment',
  monitoring: 'Monitoring',
  notifications: 'Notifications',
  'data-sync': 'Data sync',
  development: 'Development',
  other: 'Other',
};

export default function AutomationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAutomationById } = useEntries();
  const automation = getAutomationById(id || '');

  if (!automation) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Automation not found</p>
        <Button variant="link" onClick={() => navigate('/automations')}>
          Back to Automations
        </Button>
      </div>
    );
  }

  const handleBack = () => navigate('/automations');

  return (
    <div className="max-w-4xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2"
        onClick={handleBack}
        aria-label="Back to Automations"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Automations
      </Button>

      <div className="mb-6">
        <div className="flex items-start gap-3 mb-2">
          <Badge variant="secondary" className="shrink-0">
            {categoryLabels[automation.category] ?? automation.category}
          </Badge>
          {automation.triggerLabel && (
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <GitBranch className="w-4 h-4" />
              Trigger: {automation.triggerLabel}
            </span>
          )}
        </div>
        {(automation.githubUrl || automation.docLink) && (
          <div className="flex flex-wrap items-center gap-4 mb-3">
            {automation.githubUrl && (
              <a
                href={automation.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                aria-label="View on GitHub"
              >
                <Github className="w-5 h-5 shrink-0" />
                View on GitHub
                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
              </a>
            )}
            {automation.docLink && (
              <a
                href={automation.docLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
                aria-label="View documentation"
              >
                <FileText className="w-5 h-5 shrink-0" />
                Documentation
                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
              </a>
            )}
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{automation.title}</h1>
        <p className="text-muted-foreground mt-2">{automation.description}</p>
        {automation.authors && automation.authors.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Authors</span>
            {getPersonsByIds(automation.authors).map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => navigate(`/people/${person.id}`)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted transition-colors text-left"
                aria-label={`View ${person.name}`}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={person.avatar} alt={person.name} />
                  <AvatarFallback className="text-xs">
                    {person.name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{person.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Productivity benefits */}
      {automation.benefits && automation.benefits.length > 0 && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Productivity benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {automation.benefits.map((benefit) => (
                <li key={benefit}>
                  <Badge variant="secondary" className="font-normal">
                    {benefit}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Video thumbnail / placeholder */}
      <Card className="mb-6 overflow-hidden border">
        <AspectRatio ratio={16 / 9} className="bg-muted">
          <div className="relative w-full h-full group">
            <img
              src={automation.videoThumbnail}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer transition-opacity hover:bg-black/60">
              <div
                className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center"
                role="button"
                tabIndex={0}
                aria-label="Play automation demo"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                }}
              >
                <Play className="w-8 h-8 text-primary-foreground fill-primary-foreground ml-1" />
              </div>
            </div>
          </div>
        </AspectRatio>
        <CardContent className="py-2 px-4 bg-muted/30">
          <p className="text-xs text-muted-foreground">Demo video (mock)</p>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Flow steps ({automation.steps.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {automation.steps
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((step, index) => (
                <li
                  key={step.order}
                  className={cn(
                    'flex gap-4',
                    index < automation.steps.length - 1 && 'pb-4 border-b border-border'
                  )}
                >
                  <div
                    className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center"
                    aria-hidden
                  >
                    {step.order}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground">{step.title}</h3>
                      {automation.stepsWithAI?.includes(step.order) && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
