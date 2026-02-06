import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  FolderKanban,
  History,
  Lightbulb,
  MessageSquare,
  Plug,
  PlusCircle,
  Terminal,
  Users,
  Workflow,
} from 'lucide-react';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Knowledge',
    items: [
      { to: '/topics', icon: Lightbulb, label: 'Topics' },
      { to: '/problems', icon: AlertCircle, label: 'Problems' },
      { to: '/projects', icon: FolderKanban, label: 'Projects' },
      { to: '/people', icon: Users, label: 'People' },
      { to: '/automations', icon: Workflow, label: 'Automations' },
      { to: '/rules', icon: BookMarked, label: 'Rules & solutions' },
      { to: '/logs', icon: History, label: 'Activity logs' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/cli', icon: Terminal, label: 'CLI' },
      { to: '/mcp', icon: Plug, label: 'MCP' },
    ],
  },
  {
    label: 'Create & Assistant',
    items: [
      { to: '/create', icon: PlusCircle, label: 'Create entry' },
      { to: '/assistant', icon: MessageSquare, label: 'AI Assistant' },
    ],
  },
  {
    label: 'Help',
    items: [
      { to: '/glossary', icon: BookOpen, label: 'Glossary' },
    ],
  },
];
