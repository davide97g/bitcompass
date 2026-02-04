import { people, projects, problems, topics, automations, searchAll } from '@/data/mockData';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  entities?: {
    type: 'person' | 'project' | 'problem' | 'topic' | 'automation';
    id: string;
    data: any;
  }[];
}

// Simple keyword matching for simulated AI responses
export function generateAIResponse(query: string): AIMessage {
  const q = query.toLowerCase();
  const searchResults = searchAll(query);

  // Check for specific patterns

  // Find / suggest automation (hardcoded use case for quick action)
  const automationKeywords = [
    'automation', 'automations', 'workflow', 'find automation', 'suggest automation',
    'e2e', 'e2e test', 'playwright', 'cypress', 'sonarqube', 'translation', 'i18n',
    'test data', 'form fill', 'daily recap', 'code quality', 'autofix',
  ];
  const wantsAutomation = automationKeywords.some((kw) => q.includes(kw));
  if (wantsAutomation) {
    // Map intent to a suggested automation (dev-focused)
    let suggested: (typeof automations)[0] | undefined;
    if (q.includes('e2e') || q.includes('test') || q.includes('playwright') || q.includes('cypress')) {
      suggested = automations.find((a) => a.id === 'auto8'); // E2E Assistant
    } else if (q.includes('sonar') || q.includes('quality') || q.includes('autofix') || q.includes('code smell')) {
      suggested = automations.find((a) => a.id === 'auto10'); // SonarQube Issue Autofix
    } else if (q.includes('translation') || q.includes('i18n') || q.includes('locale')) {
      suggested = automations.find((a) => a.id === 'auto7'); // Automatic Translations
    } else if (q.includes('form') || q.includes('test data') || q.includes('fill')) {
      suggested = automations.find((a) => a.id === 'auto9'); // Autocomplete Test Data Forms
    } else if (q.includes('recap') || q.includes('daily') || q.includes('summary')) {
      suggested = automations.find((a) => a.id === 'auto11'); // Daily Recap Summary
    } else {
      suggested = automations.find((a) => a.category === 'development'); // First dev automation as default
    }
    if (suggested) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Here's an automation that might help:\n\n${suggested.title}\n${suggested.description}\n\nUse the quick action below to open it.`,
        timestamp: new Date(),
        entities: [{ type: 'automation', id: suggested.id, data: suggested }],
      };
    }
  }

  // Who knows X?
  if (q.includes('who') && (q.includes('know') || q.includes('expert') || q.includes('skill'))) {
    const skillMatch = findTechInQuery(q);
    if (skillMatch) {
      const matchedPeople = people.filter(p => 
        p.skills.some(s => s.toLowerCase().includes(skillMatch)) ||
        p.expertise.some(e => e.toLowerCase().includes(skillMatch))
      );
      
      if (matchedPeople.length > 0) {
        return {
          id: Date.now().toString(),
          role: 'assistant',
          content: `I found ${matchedPeople.length} ${matchedPeople.length === 1 ? 'person' : 'people'} with ${skillMatch} expertise:`,
          timestamp: new Date(),
          entities: matchedPeople.map(p => ({
            type: 'person',
            id: p.id,
            data: p,
          })),
        };
      }
    }
  }

  // Projects using X?
  if (q.includes('project') && (q.includes('use') || q.includes('using') || q.includes('with'))) {
    const techMatch = findTechInQuery(q);
    if (techMatch) {
      const matchedProjects = projects.filter(p =>
        p.techStack.some(t => t.toLowerCase().includes(techMatch))
      );
      
      if (matchedProjects.length > 0) {
        return {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Found ${matchedProjects.length} ${matchedProjects.length === 1 ? 'project' : 'projects'} using ${techMatch}:`,
          timestamp: new Date(),
          entities: matchedProjects.map(p => ({
            type: 'project',
            id: p.id,
            data: p,
          })),
        };
      }
    }
  }

  // Show open/solved problems
  if (q.includes('problem') || q.includes('issue') || q.includes('challenge')) {
    if (q.includes('open') || q.includes('unsolved')) {
      const openProblems = problems.filter(p => p.status === 'open');
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `There are ${openProblems.length} open ${openProblems.length === 1 ? 'problem' : 'problems'}:`,
        timestamp: new Date(),
        entities: openProblems.map(p => ({
          type: 'problem',
          id: p.id,
          data: p,
        })),
      };
    }
    
    if (q.includes('solved') || q.includes('solution')) {
      const solvedProblems = problems.filter(p => p.status === 'solved');
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `We have ${solvedProblems.length} solved ${solvedProblems.length === 1 ? 'problem' : 'problems'}:`,
        timestamp: new Date(),
        entities: solvedProblems.map(p => ({
          type: 'problem',
          id: p.id,
          data: p,
        })),
      };
    }

    // Check for tech-specific problems
    const techMatch = findTechInQuery(q);
    if (techMatch) {
      const techProblems = problems.filter(p =>
        p.technologies.some(t => t.toLowerCase().includes(techMatch)) ||
        p.title.toLowerCase().includes(techMatch) ||
        p.description.toLowerCase().includes(techMatch)
      );
      
      if (techProblems.length > 0) {
        return {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Found ${techProblems.length} ${techProblems.length === 1 ? 'problem' : 'problems'} related to ${techMatch}:`,
          timestamp: new Date(),
          entities: techProblems.map(p => ({
            type: 'problem',
            id: p.id,
            data: p,
          })),
        };
      }
    }
  }

  // Who worked on X project?
  if (q.includes('who') && q.includes('work')) {
    for (const project of projects) {
      if (q.includes(project.name.toLowerCase())) {
        const team = people.filter(p => project.team.includes(p.id));
        return {
          id: Date.now().toString(),
          role: 'assistant',
          content: `The ${project.name} project has ${team.length} team ${team.length === 1 ? 'member' : 'members'}:`,
          timestamp: new Date(),
          entities: team.map(p => ({
            type: 'person',
            id: p.id,
            data: p,
          })),
        };
      }
    }
  }

  // General search fallback
  if (searchResults.hasResults) {
    const entities: AIMessage['entities'] = [];
    let responseText = "Here's what I found:\n\n";

    if (searchResults.people.length > 0) {
      responseText += `👥 ${searchResults.people.length} ${searchResults.people.length === 1 ? 'person' : 'people'}`;
      searchResults.people.slice(0, 2).forEach(p => {
        entities.push({ type: 'person', id: p.id, data: p });
      });
    }

    if (searchResults.projects.length > 0) {
      if (entities.length > 0) responseText += '\n';
      responseText += `📁 ${searchResults.projects.length} ${searchResults.projects.length === 1 ? 'project' : 'projects'}`;
      searchResults.projects.slice(0, 2).forEach(p => {
        entities.push({ type: 'project', id: p.id, data: p });
      });
    }

    if (searchResults.problems.length > 0) {
      if (entities.length > 0) responseText += '\n';
      responseText += `⚠️ ${searchResults.problems.length} ${searchResults.problems.length === 1 ? 'problem' : 'problems'}`;
      searchResults.problems.slice(0, 2).forEach(p => {
        entities.push({ type: 'problem', id: p.id, data: p });
      });
    }

    if (searchResults.topics.length > 0) {
      if (entities.length > 0) responseText += '\n';
      responseText += `💡 ${searchResults.topics.length} ${searchResults.topics.length === 1 ? 'topic' : 'topics'}`;
      searchResults.topics.slice(0, 2).forEach(t => {
        entities.push({ type: 'topic', id: t.id, data: t });
      });
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: responseText,
      timestamp: new Date(),
      entities,
    };
  }

  // No results fallback
  return {
    id: Date.now().toString(),
    role: 'assistant',
    content: "I couldn't find specific information matching your query. Try asking about:\n\n• People with specific skills (e.g., \"Who knows Kubernetes?\")\n• Projects using certain technologies (e.g., \"Which projects use React?\")\n• Open or solved problems\n• Specific topics or areas of expertise",
    timestamp: new Date(),
  };
}

// Helper to extract technology names from query
function findTechInQuery(query: string): string | null {
  const techKeywords = [
    'react', 'typescript', 'javascript', 'graphql', 'node', 'nodejs', 'node.js',
    'python', 'kubernetes', 'k8s', 'docker', 'aws', 'postgresql', 'postgres',
    'redis', 'terraform', 'tensorflow', 'pytorch', 'security', 'devops',
    'frontend', 'backend', 'ai', 'machine learning', 'ml', 'css', 'tailwind',
    'microservices', 'kafka', 'performance', 'testing'
  ];

  for (const tech of techKeywords) {
    if (query.includes(tech)) {
      // Normalize some variations
      if (tech === 'k8s') return 'kubernetes';
      if (tech === 'nodejs' || tech === 'node') return 'node.js';
      if (tech === 'ml') return 'machine learning';
      if (tech === 'postgres') return 'postgresql';
      return tech;
    }
  }

  return null;
}
