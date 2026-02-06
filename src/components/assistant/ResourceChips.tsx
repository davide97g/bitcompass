import { ProjectChip } from './ProjectChip';
import { RuleChip } from './RuleChip';
import { AutomationChip } from './AutomationChip';

interface ResourceChipsProps {
  resources: Array<{
    type: 'project' | 'rule' | 'automation';
    id: string;
    data: any;
  }>;
}

export const ResourceChips = ({ resources }: ResourceChipsProps) => {
  if (resources.length === 0) return null;

  return (
    <div className="space-y-2 pl-1">
      {resources.map((resource) => {
        if (resource.type === 'project') {
          return <ProjectChip key={resource.id} project={resource.data} />;
        }
        if (resource.type === 'rule') {
          return <RuleChip key={resource.id} rule={resource.data} />;
        }
        if (resource.type === 'automation') {
          return <AutomationChip key={resource.id} automation={resource.data} />;
        }
        return null;
      })}
    </div>
  );
};
