/**
 * Supabase data access for problems, projects, automations.
 * Maps DB rows (snake_case) to app shape (camelCase) matching mockData types.
 */

import { supabase } from '@/lib/supabase';
import type { Problem, Project, Automation, AutomationStep } from '@/data/mockData';
import type {
  ProblemRow,
  ProblemInsert,
  ProjectRow,
  ProjectInsert,
  AutomationRow,
  AutomationInsert,
} from '@/types/entities';

const problemRowToApp = (row: ProblemRow): Problem => ({
  id: row.id,
  title: row.title,
  status: row.status,
  description: row.description ?? '',
  solution: row.solution ?? undefined,
  technologies: row.technologies ?? [],
  relatedProjects: row.related_projects ?? [],
  relatedPeople: row.related_people ?? [],
  createdAt: row.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  solvedAt: row.solved_at ?? undefined,
});

const projectRowToApp = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  description: row.description ?? '',
  context: row.context ?? '',
  techStack: row.tech_stack ?? [],
  status: row.status,
  relatedProblems: row.related_problems ?? [],
  team: row.team ?? [],
  startDate: row.start_date ?? '',
  endDate: row.end_date ?? undefined,
});

const automationRowToApp = (row: AutomationRow): Automation => ({
  id: row.id,
  title: row.title,
  description: row.description ?? '',
  category: row.category,
  steps: (row.steps ?? []) as AutomationStep[],
  videoThumbnail: row.video_thumbnail ?? '',
  triggerLabel: row.trigger_label ?? undefined,
  stepsWithAI: row.steps_with_ai?.length ? row.steps_with_ai : undefined,
  benefits: row.benefits?.length ? row.benefits : undefined,
  authors: row.authors?.length ? row.authors : undefined,
  githubUrl: row.github_url ?? undefined,
  docLink: row.doc_link ?? undefined,
});

const problemAppToInsert = (p: Partial<Problem> & { title: string; status: ProblemRow['status'] }): ProblemInsert => ({
  title: p.title,
  status: p.status,
  description: p.description ?? '',
  solution: p.solution ?? null,
  technologies: p.technologies ?? [],
  related_projects: p.relatedProjects ?? [],
  related_people: p.relatedPeople ?? [],
  solved_at: p.solvedAt ?? null,
});

const projectAppToInsert = (p: Partial<Project> & { name: string; status: ProjectRow['status']; startDate: string }): ProjectInsert => ({
  name: p.name,
  description: p.description ?? '',
  context: p.context ?? '',
  tech_stack: p.techStack ?? [],
  status: p.status,
  related_problems: p.relatedProblems ?? [],
  team: p.team ?? [],
  start_date: p.startDate,
  end_date: p.endDate ?? null,
});

const automationAppToInsert = (
  a: Partial<Automation> & { title: string; description: string; category: AutomationRow['category'] }
): AutomationInsert => ({
  title: a.title,
  description: a.description ?? '',
  category: a.category,
  steps: a.steps ?? [],
  video_thumbnail: a.videoThumbnail ?? '',
  trigger_label: a.triggerLabel ?? null,
  steps_with_ai: a.stepsWithAI ?? [],
  benefits: a.benefits ?? [],
  authors: a.authors ?? [],
  github_url: a.githubUrl ?? null,
  doc_link: a.docLink ?? null,
});

export const fetchProblems = async (): Promise<Problem[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => problemRowToApp(row as ProblemRow));
};

export const fetchProblemById = async (id: string): Promise<Problem | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('problems').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return problemRowToApp(data as ProblemRow);
};

export const insertProblem = async (problem: Partial<Problem> & { title: string; status: ProblemRow['status'] }): Promise<Problem> => {
  if (!supabase) throw new Error('Supabase not configured');
  const insert = problemAppToInsert(problem);
  const { data, error } = await supabase.from('problems').insert(insert).select().single();
  if (error) throw error;
  return problemRowToApp(data as ProblemRow);
};

export const updateProblem = async (
  id: string,
  updates: Partial<Problem>
): Promise<Problem> => {
  if (!supabase) throw new Error('Supabase not configured');
  const row: Partial<ProblemRow> = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.solution !== undefined) row.solution = updates.solution;
  if (updates.technologies !== undefined) row.technologies = updates.technologies;
  if (updates.relatedProjects !== undefined) row.related_projects = updates.relatedProjects;
  if (updates.relatedPeople !== undefined) row.related_people = updates.relatedPeople;
  if (updates.solvedAt !== undefined) row.solved_at = updates.solvedAt;
  const { data, error } = await supabase.from('problems').update(row).eq('id', id).select().single();
  if (error) throw error;
  return problemRowToApp(data as ProblemRow);
};

export const deleteProblem = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('problems').delete().eq('id', id);
  if (error) throw error;
};

export const fetchProjects = async (): Promise<Project[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => projectRowToApp(row as ProjectRow));
};

export const fetchProjectById = async (id: string): Promise<Project | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return projectRowToApp(data as ProjectRow);
};

export const insertProject = async (
  project: Partial<Project> & { name: string; status: ProjectRow['status']; startDate: string }
): Promise<Project> => {
  if (!supabase) throw new Error('Supabase not configured');
  const insert = projectAppToInsert(project);
  const { data, error } = await supabase.from('projects').insert(insert).select().single();
  if (error) throw error;
  return projectRowToApp(data as ProjectRow);
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<Project> => {
  if (!supabase) throw new Error('Supabase not configured');
  const row: Partial<ProjectRow> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.context !== undefined) row.context = updates.context;
  if (updates.techStack !== undefined) row.tech_stack = updates.techStack;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.relatedProblems !== undefined) row.related_problems = updates.relatedProblems;
  if (updates.team !== undefined) row.team = updates.team;
  if (updates.startDate !== undefined) row.start_date = updates.startDate;
  if (updates.endDate !== undefined) row.end_date = updates.endDate;
  const { data, error } = await supabase.from('projects').update(row).eq('id', id).select().single();
  if (error) throw error;
  return projectRowToApp(data as ProjectRow);
};

export const deleteProject = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
};

export const fetchAutomations = async (): Promise<Automation[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => automationRowToApp(row as AutomationRow));
};

export const fetchAutomationById = async (id: string): Promise<Automation | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('automations').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return automationRowToApp(data as AutomationRow);
};

export const insertAutomation = async (
  automation: Partial<Automation> & { title: string; description: string; category: AutomationRow['category'] }
): Promise<Automation> => {
  if (!supabase) throw new Error('Supabase not configured');
  const insert = automationAppToInsert(automation);
  const { data, error } = await supabase.from('automations').insert(insert).select().single();
  if (error) throw error;
  return automationRowToApp(data as AutomationRow);
};

export const updateAutomation = async (id: string, updates: Partial<Automation>): Promise<Automation> => {
  if (!supabase) throw new Error('Supabase not configured');
  const row: Partial<AutomationRow> = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.category !== undefined) row.category = updates.category;
  if (updates.steps !== undefined) row.steps = updates.steps;
  if (updates.videoThumbnail !== undefined) row.video_thumbnail = updates.videoThumbnail;
  if (updates.triggerLabel !== undefined) row.trigger_label = updates.triggerLabel;
  if (updates.stepsWithAI !== undefined) row.steps_with_ai = updates.stepsWithAI;
  if (updates.benefits !== undefined) row.benefits = updates.benefits;
  if (updates.authors !== undefined) row.authors = updates.authors;
  if (updates.githubUrl !== undefined) row.github_url = updates.githubUrl;
  if (updates.docLink !== undefined) row.doc_link = updates.docLink;
  const { data, error } = await supabase.from('automations').update(row).eq('id', id).select().single();
  if (error) throw error;
  return automationRowToApp(data as AutomationRow);
};

export const deleteAutomation = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('automations').delete().eq('id', id);
  if (error) throw error;
};
