/**
 * Supabase DB row and insert types for problems, projects, automations.
 * App-facing types (camelCase) are in @/data/mockData; mappers convert Row -> app shape.
 */

export type ProblemStatus = 'open' | 'solved' | 'in-progress';
export type ProjectStatus = 'active' | 'completed' | 'on-hold' | 'planning';
export type AutomationCategory =
  | 'onboarding'
  | 'deployment'
  | 'monitoring'
  | 'notifications'
  | 'data-sync'
  | 'development'
  | 'other';

export interface ProblemRow {
  id: string;
  user_id: string;
  title: string;
  status: ProblemStatus;
  description: string;
  solution: string | null;
  technologies: string[];
  related_projects: string[];
  related_people: string[];
  created_at: string;
  solved_at: string | null;
}

export interface ProblemInsert {
  title: string;
  status: ProblemStatus;
  description?: string;
  solution?: string | null;
  technologies?: string[];
  related_projects?: string[];
  related_people?: string[];
  solved_at?: string | null;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  context: string;
  tech_stack: string[];
  status: ProjectStatus;
  related_problems: string[];
  team: string[];
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface ProjectInsert {
  name: string;
  description?: string;
  context?: string;
  tech_stack?: string[];
  status: ProjectStatus;
  related_problems?: string[];
  team?: string[];
  start_date: string;
  end_date?: string | null;
}

export interface AutomationStepRow {
  order: number;
  title: string;
  description: string;
}

export interface AutomationRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: AutomationCategory;
  steps: AutomationStepRow[];
  video_thumbnail: string;
  trigger_label: string | null;
  steps_with_ai: number[];
  benefits: string[];
  authors: string[];
  github_url: string | null;
  doc_link: string | null;
  created_at: string;
}

export interface AutomationInsert {
  title: string;
  description?: string;
  category: AutomationCategory;
  steps?: AutomationStepRow[];
  video_thumbnail?: string;
  trigger_label?: string | null;
  steps_with_ai?: number[];
  benefits?: string[];
  authors?: string[];
  github_url?: string | null;
  doc_link?: string | null;
}
