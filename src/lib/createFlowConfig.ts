import type { EntryType } from './createEntryMappers';

export interface QuestionSpec {
  id: string;
  label: string;
  required: boolean;
  type: 'text' | 'textarea';
  placeholder?: string;
}

export const QUESTIONS_BY_TYPE: Record<EntryType, QuestionSpec[]> = {
  problem: [
    { id: 'title', label: 'Problem title', required: true, type: 'text', placeholder: 'e.g. GraphQL N+1 issues' },
    { id: 'description', label: 'Description', required: true, type: 'textarea', placeholder: 'What is the problem?' },
    { id: 'status', label: 'Status', required: true, type: 'text', placeholder: 'open | in-progress | solved' },
    { id: 'technologies', label: 'Technologies (comma-separated)', required: false, type: 'text', placeholder: 'React, Node.js' },
  ],
  project: [
    { id: 'name', label: 'Project name', required: true, type: 'text', placeholder: 'e.g. Customer Portal 2.0' },
    { id: 'description', label: 'Description', required: true, type: 'textarea', placeholder: 'Short description' },
    { id: 'context', label: 'Business context', required: false, type: 'textarea', placeholder: 'Why this project?' },
    { id: 'status', label: 'Status', required: true, type: 'text', placeholder: 'active | planning | on-hold | completed' },
    { id: 'techStack', label: 'Tech stack (comma-separated)', required: false, type: 'text', placeholder: 'React, TypeScript' },
  ],
  automation: [
    { id: 'title', label: 'Automation title', required: true, type: 'text', placeholder: 'e.g. Daily Recap Summary' },
    { id: 'description', label: 'Description', required: true, type: 'textarea', placeholder: 'What does it do?' },
    { id: 'category', label: 'Category', required: true, type: 'text', placeholder: 'development | deployment | other | ...' },
    { id: 'triggerLabel', label: 'Trigger (optional)', required: false, type: 'text', placeholder: 'e.g. Scheduled 8:00 AM' },
  ],
};

export const DEFAULT_COMMANDS = [
  'npx bitcompass login',
  'npx bitcompass rules list',
];
