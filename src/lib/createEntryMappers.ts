import type { Problem, Project, Automation, AutomationStep } from '@/data/mockData';
import {
  getNextProblemId,
  getNextProjectId,
  getNextAutomationId,
} from '@/store/entriesStore';

const today = (): string => new Date().toISOString().slice(0, 10);

const asString = (v: unknown): string =>
  typeof v === 'string' ? v : v != null ? String(v) : '';
const asStringArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(asString).filter(Boolean);
  if (typeof v === 'string') return v.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean);
  return [];
};

export type EntryType = 'problem' | 'project' | 'automation';

export interface CreateAnswers {
  title?: string;
  name?: string;
  description?: string;
  context?: string;
  status?: string;
  technologies?: string;
  techStack?: string;
  category?: string;
  [key: string]: string | undefined;
}

/**
 * Rules-based mapping from raw JSON (e.g. bitrock CLI output) + collected answers
 * to a structured Problem. Merges known keys from both sources.
 */
export const mapToProblem = (
  rawJson: unknown,
  answers: CreateAnswers
): Problem => {
  const obj = typeof rawJson === 'object' && rawJson !== null ? (rawJson as Record<string, unknown>) : {};
  const title = asString(answers.title ?? obj.title ?? obj.name).trim() || 'Untitled problem';
  const description = asString(answers.description ?? obj.description ?? obj.summary).trim() || 'No description.';
  const status = (answers.status ?? obj.status ?? 'open') as Problem['status'];
  const validStatus: Problem['status'][] = ['open', 'solved', 'in-progress'];
  const technologies = asStringArray(answers.technologies ?? obj.technologies ?? obj.techStack ?? obj.tags).length
    ? asStringArray(answers.technologies ?? obj.technologies ?? obj.techStack ?? obj.tags)
    : ['General'];
  const solution = asString(obj.solution ?? answers.solution).trim() || undefined;
  const createdAt = asString(obj.createdAt ?? obj.date ?? answers.createdAt).trim() || today();
  const solvedAt = asString(obj.solvedAt ?? answers.solvedAt).trim() || undefined;

  return {
    id: getNextProblemId(),
    title,
    status: validStatus.includes(status) ? status : 'open',
    description,
    solution: solution || undefined,
    technologies,
    relatedProjects: [],
    relatedPeople: [],
    createdAt,
    solvedAt: solvedAt || undefined,
  };
};

/**
 * Rules-based mapping to a structured Project.
 */
export const mapToProject = (
  rawJson: unknown,
  answers: CreateAnswers
): Project => {
  const obj = typeof rawJson === 'object' && rawJson !== null ? (rawJson as Record<string, unknown>) : {};
  const name = asString(answers.name ?? answers.title ?? obj.name ?? obj.title).trim() || 'Untitled project';
  const description = asString(answers.description ?? obj.description ?? obj.summary).trim() || 'No description.';
  const context = asString(answers.context ?? obj.context ?? obj.businessContext).trim() || description;
  const status = (answers.status ?? obj.status ?? 'active') as Project['status'];
  const validStatus: Project['status'][] = ['active', 'completed', 'on-hold', 'planning'];
  const techStack = asStringArray(answers.techStack ?? answers.technologies ?? obj.techStack ?? obj.technologies).length
    ? asStringArray(answers.techStack ?? answers.technologies ?? obj.techStack ?? obj.technologies)
    : ['TBD'];
  const startDate = asString(answers.startDate ?? obj.startDate ?? obj.start).trim() || today();
  const endDate = asString(answers.endDate ?? obj.endDate ?? obj.end).trim() || undefined;

  return {
    id: getNextProjectId(),
    name,
    description,
    context,
    techStack,
    status: validStatus.includes(status) ? status : 'active',
    relatedProblems: [],
    team: [],
    startDate,
    endDate: endDate || undefined,
  };
};

/**
 * Rules-based mapping to a structured Automation.
 */
export const mapToAutomation = (
  rawJson: unknown,
  answers: CreateAnswers
): Automation => {
  const obj = typeof rawJson === 'object' && rawJson !== null ? (rawJson as Record<string, unknown>) : {};
  const title = asString(answers.title ?? obj.title ?? obj.name).trim() || 'Untitled automation';
  const description = asString(answers.description ?? obj.description ?? obj.summary).trim() || 'No description.';
  const category = (answers.category ?? obj.category ?? 'other') as Automation['category'];
  const validCategories: Automation['category'][] = [
    'onboarding', 'deployment', 'monitoring', 'notifications', 'data-sync', 'development', 'other',
  ];
  const steps: AutomationStep[] = [];
  const rawSteps = obj.steps ?? obj.stepsList;
  if (Array.isArray(rawSteps) && rawSteps.length > 0) {
    rawSteps.forEach((s: unknown, i: number) => {
      const step = typeof s === 'object' && s !== null ? (s as Record<string, unknown>) : {};
      steps.push({
        order: i + 1,
        title: asString(step.title ?? step.name ?? step.step).trim() || `Step ${i + 1}`,
        description: asString(step.description ?? step.desc).trim() || '',
      });
    });
  }
  if (steps.length === 0) {
    steps.push({ order: 1, title: 'Initial step', description: 'To be refined.' });
  }

  return {
    id: getNextAutomationId(),
    title,
    description,
    category: validCategories.includes(category) ? category : 'other',
    steps,
    videoThumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=450&fit=crop',
    triggerLabel: asString(answers.triggerLabel ?? obj.trigger ?? obj.triggerLabel).trim() || undefined,
    authors: [],
  };
};

export const mapRawToEntry = (
  entryType: EntryType,
  rawJson: unknown,
  answers: CreateAnswers
): Problem | Project | Automation => {
  switch (entryType) {
    case 'problem':
      return mapToProblem(rawJson, answers);
    case 'project':
      return mapToProject(rawJson, answers);
    case 'automation':
      return mapToAutomation(rawJson, answers);
    default:
      return mapToProblem(rawJson, answers);
  }
};
