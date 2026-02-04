import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TechTag, getTechColor } from '@/components/ui/tech-tag';
import { StatusBadge } from '@/components/ui/status-badge';
import { type AIMessage } from '@/lib/aiResponses';
import { ArrowRight } from 'lucide-react';

interface AssistantMessageProps {
  message: AIMessage;
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  const navigate = useNavigate();

  // Parse content for links and entities
  const renderContent = () => {
    if (!message.entities || message.entities.length === 0) {
      return (
        <div className="chat-bubble chat-bubble-assistant">
          <p className="text-sm whitespace-pre-line">{message.content}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="chat-bubble chat-bubble-assistant">
          <p className="text-sm whitespace-pre-line">{message.content}</p>
        </div>
        
        {/* Entity cards */}
        <div className="space-y-2 pl-1">
          {message.entities.map((entity) => {
            if (entity.type === 'person') {
              return (
                <Card 
                  key={entity.id} 
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate(`/people/${entity.id}`)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={entity.data.avatar} alt={entity.data.name} />
                      <AvatarFallback>{entity.data.name?.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{entity.data.name}</p>
                      <p className="text-xs text-muted-foreground">{entity.data.role}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0">
                      View <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            }

            if (entity.type === 'project') {
              return (
                <Card 
                  key={entity.id} 
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate(`/projects/${entity.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-sm">{entity.data.name}</p>
                      <StatusBadge status={entity.data.status} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {entity.data.techStack?.slice(0, 3).map((tech: string) => (
                        <TechTag key={tech} variant={getTechColor(tech)}>
                          {tech}
                        </TechTag>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="p-0 h-auto text-xs text-primary">
                      View project <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            }

            if (entity.type === 'problem') {
              return (
                <Card 
                  key={entity.id} 
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate(`/problems/${entity.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-sm">{entity.data.title}</p>
                      <StatusBadge status={entity.data.status} />
                    </div>
                    <Button variant="ghost" size="sm" className="p-0 h-auto text-xs text-primary">
                      View problem <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            }

            if (entity.type === 'topic') {
              return (
                <Card 
                  key={entity.id} 
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate(`/topics/${entity.id}`)}
                >
                  <CardContent className="p-3">
                    <p className="font-medium text-sm mb-1">{entity.data.name}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {entity.data.technologies?.slice(0, 3).map((tech: string) => (
                        <TechTag key={tech} variant={getTechColor(tech)}>
                          {tech}
                        </TechTag>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="p-0 h-auto text-xs text-primary">
                      View topic <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            }

            if (entity.type === 'automation') {
              return (
                <Card 
                  key={entity.id} 
                  className="cursor-pointer hover:bg-accent transition-colors border-primary/20"
                  onClick={() => navigate(`/automations/${entity.id}`)}
                >
                  <CardContent className="p-3">
                    <p className="font-medium text-sm mb-1">{entity.data.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {entity.data.description}
                    </p>
                    {entity.data.benefits?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {entity.data.benefits.slice(0, 2).map((b: string) => (
                          <span key={b} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {b}
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
            }

            return null;
          })}
        </div>
      </div>
    );
  };

  return renderContent();
}
