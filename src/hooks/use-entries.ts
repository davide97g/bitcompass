import { useSyncExternalStore } from 'react';
import type { Problem, Project, Automation } from '@/data/mockData';
import {
  subscribe,
  getProblems,
  getProjects,
  getAutomations,
  getProblemById,
  getProjectById,
  getAutomationById,
  getProblemsByIds,
  getProjectsByIds,
  getAutomationsByIds,
  getAutomationsByAuthor,
  addProblem,
  addProject,
  addAutomation,
} from '@/store/entriesStore';

export const useEntries = () => {
  const problems = useSyncExternalStore(subscribe, getProblems, getProblems);
  const projects = useSyncExternalStore(subscribe, getProjects, getProjects);
  const automations = useSyncExternalStore(subscribe, getAutomations, getAutomations);

  return {
    problems,
    projects,
    automations,
    getProblemById,
    getProjectById,
    getAutomationById,
    getProblemsByIds,
    getProjectsByIds,
    getAutomationsByIds,
    getAutomationsByAuthor,
    addProblem,
    addProject,
    addAutomation,
  };
};
