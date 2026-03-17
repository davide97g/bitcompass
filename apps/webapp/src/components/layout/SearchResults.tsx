import { User, Lightbulb, AlertCircle, FolderKanban, Workflow, BookMarked } from 'lucide-react';
import type { Person, Topic, Problem, Project, Automation } from '@/data/mockData';
import type { Rule, RuleKind } from '@/types/bitcompass';

const RULE_KIND_LABELS: Record<RuleKind, string> = {
  rule: 'Rule',
  solution: 'Solution',
  skill: 'Skill',
  command: 'Command',
};

interface SearchResultsProps {
  results: {
    people: Person[];
    topics: Topic[];
    problems: Problem[];
    projects: Project[];
    automations: Automation[];
    rules?: Rule[];
  };
  onResultClick: (type: string, id: string) => void;
  onClose: () => void;
}

export function SearchResults({ results, onResultClick, onClose: _onClose }: SearchResultsProps) {
  const sections = [
    { key: 'people', title: 'People', items: results.people, icon: User, type: 'people' },
    { key: 'topics', title: 'Topics', items: results.topics, icon: Lightbulb, type: 'topics' },
    { key: 'problems', title: 'Problems', items: results.problems, icon: AlertCircle, type: 'problems' },
    { key: 'projects', title: 'Projects', items: results.projects, icon: FolderKanban, type: 'projects' },
    { key: 'rules', title: 'Rules & solutions', items: results.rules ?? [], icon: BookMarked, type: 'rules' },
    { key: 'automations', title: 'Automations', items: results.automations, icon: Workflow, type: 'automations' },
  ];

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-scale-in">
      <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
        {sections.map((section) => {
          if (section.items.length === 0) return null;
          const Icon = section.icon;
          
          return (
            <div key={section.key} className="border-b border-border last:border-0">
              <div className="px-3 py-2 bg-muted/50">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {section.title}
                </span>
              </div>
              <ul>
                {section.items.slice(0, 3).map((item) => {
                  const isRule = 'kind' in item && typeof (item as Rule).kind === 'string';
                  const title = 'name' in item ? (item as { name: string }).name : 'title' in item ? (item as { title: string }).title : '';
                  const description = 'description' in item ? (item as { description: string }).description : 'role' in item ? (item as { role: string }).role : undefined;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onResultClick(section.type, item.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{title}</p>
                          {isRule && (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {RULE_KIND_LABELS[(item as Rule).kind]}
                            </span>
                          )}
                          {description && (
                            <p className="text-xs text-muted-foreground truncate">{description}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
