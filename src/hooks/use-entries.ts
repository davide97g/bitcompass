import { useSyncExternalStore } from 'react';
import type { Problem, Project, Automation } from '@/data/mockData';
import {
  subscribe,
  getProblems,
  getProjects,
  getAutomations,
  addProblem as addProblemStore,
  addProject as addProjectStore,
  addAutomation as addAutomationStore,
} from '@/store/entriesStore';
import { useAuth } from '@/hooks/use-auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useProblems, useInsertProblem } from '@/hooks/use-problems';
import { useProjects, useInsertProject } from '@/hooks/use-projects';
import { useAutomations, useInsertAutomation } from '@/hooks/use-automations';

export const useEntries = () => {
  const { session } = useAuth();
  const useSupabase = isSupabaseConfigured() && Boolean(session);

  const problemsQuery = useProblems();
  const projectsQuery = useProjects();
  const automationsQuery = useAutomations();
  const insertProblemMutation = useInsertProblem();
  const insertProjectMutation = useInsertProject();
  const insertAutomationMutation = useInsertAutomation();

  const problemsStore = useSyncExternalStore(subscribe, getProblems, getProblems);
  const projectsStore = useSyncExternalStore(subscribe, getProjects, getProjects);
  const automationsStore = useSyncExternalStore(subscribe, getAutomations, getAutomations);

  const problems = useSupabase ? (problemsQuery.data ?? []) : problemsStore;
  const projects = useSupabase ? (projectsQuery.data ?? []) : projectsStore;
  const automations = useSupabase ? (automationsQuery.data ?? []) : automationsStore;

  const getProblemByIdRes = (id: string): Problem | undefined =>
    problems.find((p) => p.id === id);
  const getProjectByIdRes = (id: string): Project | undefined =>
    projects.find((p) => p.id === id);
  const getAutomationByIdRes = (id: string): Automation | undefined =>
    automations.find((a) => a.id === id);

  const addProblem = useSupabase
    ? (problem: Problem): Promise<Problem> => insertProblemMutation.mutateAsync(problem)
    : (problem: Problem): Promise<void> => {
        addProblemStore(problem);
        return Promise.resolve();
      };

  const addProject = useSupabase
    ? (project: Project): Promise<Project> => insertProjectMutation.mutateAsync(project)
    : (project: Project): Promise<void> => {
        addProjectStore(project);
        return Promise.resolve();
      };

  const addAutomation = useSupabase
    ? (automation: Automation): Promise<Automation> => insertAutomationMutation.mutateAsync(automation)
    : (automation: Automation): Promise<void> => {
        addAutomationStore(automation);
        return Promise.resolve();
      };

  return {
    problems,
    projects,
    automations,
    getProblemById: getProblemByIdRes,
    getProjectById: getProjectByIdRes,
    getAutomationById: getAutomationByIdRes,
    getProblemsByIds: (ids: string[]) => ids.map((id) => getProblemByIdRes(id)).filter((p): p is Problem => Boolean(p)),
    getProjectsByIds: (ids: string[]) => ids.map((id) => getProjectByIdRes(id)).filter((p): p is Project => Boolean(p)),
    getAutomationsByIds: (ids: string[]) => ids.map((id) => getAutomationByIdRes(id)).filter((a): a is Automation => Boolean(a)),
    getAutomationsByAuthor: (personId: string) => automations.filter((a) => a.authors?.includes(personId)),
    addProblem,
    addProject,
    addAutomation,
    isSupabaseBacked: useSupabase,
  };
};
