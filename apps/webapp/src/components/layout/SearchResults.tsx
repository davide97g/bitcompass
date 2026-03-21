import { BookMarked } from 'lucide-react';
import type { Rule, RuleKind } from '@/types/bitcompass';

const RULE_KIND_LABELS: Record<RuleKind, string> = {
  rule: 'Rule',
  documentation: 'Documentation',
  skill: 'Skill',
  command: 'Command',
};

interface SearchResultsProps {
  results: { rules: Rule[] };
  onResultClick: (type: string, id: string) => void;
  onClose: () => void;
}

export function SearchResults({ results, onResultClick, onClose: _onClose }: SearchResultsProps) {
  if (results.rules.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-scale-in">
      <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
        <div className="px-3 py-2 bg-muted/50">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Skills &amp; Rules
          </span>
        </div>
        <ul>
          {results.rules.slice(0, 8).map((rule) => (
            <li key={rule.id}>
              <button
                type="button"
                onClick={() => onResultClick('rules', rule.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
              >
                <BookMarked className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{rule.title}</p>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {RULE_KIND_LABELS[rule.kind]}
                  </span>
                  {rule.description && (
                    <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
