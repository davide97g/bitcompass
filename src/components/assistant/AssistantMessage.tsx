import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TechTag, getTechColor } from '@/components/ui/tech-tag';
import { StatusBadge } from '@/components/ui/status-badge';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { ArrowRight } from 'lucide-react';
import type { UIMessage } from 'ai';

interface AssistantMessageProps {
  message: UIMessage;
}

interface Entity {
  type: 'project' | 'person' | 'rule' | 'automation' | 'problem';
  id: string;
  data: any;
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  const navigate = useNavigate();

  // Extract text content from message parts
  const textContent = message.parts
    .filter((p) => p.type === 'text')
    .map((p) => ('text' in p ? p.text : ''))
    .join('');

  // Extract entities from tool results
  const extractEntities = (): Entity[] => {
    const entities: Entity[] = [];
    
    // Look for tool-call parts with results
    message.parts.forEach((part) => {
      if (part.type === 'tool-call' && 'toolCallId' in part) {
        // Find corresponding tool result
        const resultPart = message.parts.find(
          (p) => p.type === 'tool-result' && 'toolCallId' in p && p.toolCallId === part.toolCallId
        );
        
        if (resultPart && 'result' in resultPart) {
          const result = resultPart.result as any;
          
          // Handle searchProjects results
          if (part.toolName === 'searchProjects' && result.results) {
            result.results.forEach((project: any) => {
              entities.push({
                type: 'project',
                id: project.id,
                data: project,
              });
            });
          }
          
          // Handle searchRules results
          if (part.toolName === 'searchRules' && result.results) {
            result.results.forEach((rule: any) => {
              entities.push({
                type: 'rule',
                id: rule.id,
                data: rule,
              });
            });
          }
          
          // Handle searchAutomations results
          if (part.toolName === 'searchAutomations' && result.results) {
            result.results.forEach((automation: any) => {
              entities.push({
                type: 'automation',
                id: automation.id,
                data: automation,
              });
            });
          }
        }
      }
    });
    
    return entities;
  };

  const entities = extractEntities();

  // Parse content for links and entities
  const renderContent = () => {
    if (entities.length === 0) {
      return (
        <div className="chat-bubble chat-bubble-assistant">
          <MarkdownContent content={textContent} variant="compact" className="text-sm" />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="chat-bubble chat-bubble-assistant">
          <MarkdownContent content={textContent} variant="compact" className="text-sm" />
        </div>
        
        {/* Entity cards */}
        <div className="space-y-2 pl-1">
          {entities.map((entity) => {
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
                    {entity.data.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {entity.data.description}
                      </p>
                    )}
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

            if (entity.type === 'rule') {
              return (
                <Card 
                  key={entity.id} 
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate(`/rules/${entity.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-sm">{entity.data.title}</p>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {entity.data.kind}
                      </span>
                    </div>
                    {entity.data.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {entity.data.description}
                      </p>
                    )}
                    {entity.data.technologies && entity.data.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {entity.data.technologies.slice(0, 3).map((tech: string) => (
                          <TechTag key={tech} variant={getTechColor(tech)}>
                            {tech}
                          </TechTag>
                        ))}
                      </div>
                    )}
                    <Button variant="ghost" size="sm" className="p-0 h-auto text-xs text-primary">
                      View {entity.data.kind} <ArrowRight className="w-3 h-3 ml-1" />
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
