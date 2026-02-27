import { Card, CardContent } from '@/components/ui/card';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { PageHeader } from '@/components/ui/page-header';

const TERMS = [
  {
    term: 'Rule',
    definition:
      'A reusable guideline or standard (e.g. coding style, when to use a tool) that can be pulled into a project. Rules are typically stored in .cursor/rules/ or similar and guide AI or tooling behavior.',
  },
  {
    term: 'Solution',
    definition:
      'A step-by-step or narrative answer to a specific problem (e.g. "How to fix X"). Solutions can be pulled like rules and are often used to document fixes or procedures.',
  },
  {
    term: 'Skill',
    definition:
      'An extended capability or workflow for an agent (e.g. "Figma design-to-code"). Skills are installable into an agent environment and extend what the agent can do.',
  },
  {
    term: 'Command',
    definition:
      'An executable shortcut or script registered in BitCompass. Commands can be discovered and pulled into a project for reuse.',
  },
] as const;

export default function GlossaryPage() {
  return (
    <div className="space-y-8">
      <PageBreadcrumb items={[{ href: '/glossary', label: 'Glossary' }]} />
      <PageHeader
        title="Glossary"
        description="Shared terminology for rules, solutions, skills, and commands in BitCompass."
      />

      <section className="space-y-4">
        {TERMS.map(({ term, definition }) => (
          <Card key={term} className="card-interactive">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-2">{term}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{definition}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
