/**
 * Client-side store for user-created problems, projects, and automations.
 * Merges seed data from mockData with persisted user entries.
 */

import type { Problem, Project, Automation } from '@/data/mockData';
import {
  problems as problemsSeed,
  projects as projectsSeed,
  automations as automationsSeed,
} from '@/data/mockData';

const STORAGE_KEY = 'company-compass-created-entries';

export interface CreatedEntries {
  problems: Problem[];
  projects: Project[];
  automations: Automation[];
}

const loadFromStorage = (): CreatedEntries => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { problems: [], projects: [], automations: [] };
    const parsed = JSON.parse(raw) as CreatedEntries;
    return {
      problems: Array.isArray(parsed.problems) ? parsed.problems : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      automations: Array.isArray(parsed.automations) ? parsed.automations : [],
    };
  } catch {
    return { problems: [], projects: [], automations: [] };
  }
};

const saveToStorage = (entries: CreatedEntries) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
};

let state: CreatedEntries = loadFromStorage();
const listeners: Set<() => void> = new Set();

/** Cached merged lists so useSyncExternalStore getSnapshot returns stable references */
let cachedProblems: Problem[] = [...problemsSeed, ...state.problems];
let cachedProjects: Project[] = [...projectsSeed, ...state.projects];
let cachedAutomations: Automation[] = [...automationsSeed, ...state.automations];

const updateCache = () => {
  cachedProblems = [...problemsSeed, ...state.problems];
  cachedProjects = [...projectsSeed, ...state.projects];
  cachedAutomations = [...automationsSeed, ...state.automations];
};

const notify = () => {
  updateCache();
  listeners.forEach((fn) => fn());
};

export const getCreatedEntries = (): CreatedEntries => ({ ...state });

export const getProblems = (): Problem[] => cachedProblems;
export const getProjects = (): Project[] => cachedProjects;
export const getAutomations = (): Automation[] => cachedAutomations;

export const getProblemById = (id: string): Problem | undefined =>
  getProblems().find((p) => p.id === id);
export const getProjectById = (id: string): Project | undefined =>
  getProjects().find((p) => p.id === id);
export const getAutomationById = (id: string): Automation | undefined =>
  getAutomations().find((a) => a.id === id);

export const getProblemsByIds = (ids: string[]): Problem[] =>
  ids.map((id) => getProblemById(id)).filter((p): p is Problem => Boolean(p));
export const getProjectsByIds = (ids: string[]): Project[] =>
  ids.map((id) => getProjectById(id)).filter((p): p is Project => Boolean(p));
export const getAutomationsByIds = (ids: string[]): Automation[] =>
  ids.map((id) => getAutomationById(id)).filter((a): a is Automation => Boolean(a));

export const getAutomationsByAuthor = (personId: string): Automation[] =>
  getAutomations().filter((a) => a.authors?.includes(personId));

const nextNumericId = (prefix: string, ids: string[]): string => {
  const max = ids.reduce((acc, id) => {
    if (id.startsWith(prefix)) {
      const num = parseInt(id.slice(prefix.length), 10);
      return isNaN(num) ? acc : Math.max(acc, num);
    }
    return acc;
  }, 0);
  return `${prefix}${max + 1}`;
};

export const getNextProblemId = (): string =>
  nextNumericId('prob', getProblems().map((p) => p.id));
export const getNextProjectId = (): string =>
  nextNumericId('proj', getProjects().map((p) => p.id));
export const getNextAutomationId = (): string =>
  nextNumericId('auto', getAutomations().map((a) => a.id));

export const addProblem = (problem: Problem): void => {
  state = {
    ...state,
    problems: [...state.problems, problem],
  };
  saveToStorage(state);
  notify();
};

export const addProject = (project: Project): void => {
  state = {
    ...state,
    projects: [...state.projects, project],
  };
  saveToStorage(state);
  notify();
};

export const addAutomation = (automation: Automation): void => {
  state = {
    ...state,
    automations: [...state.automations, automation],
  };
  saveToStorage(state);
  notify();
};

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
