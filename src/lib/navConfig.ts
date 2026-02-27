import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  FolderKanban,
  History,
  Layers,
  Lightbulb,
  Plug,
  Terminal,
  Users,
  Workflow,
} from 'lucide-react';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  mocked?: boolean;
}

export const navGroups: NavGroup[] = [
  {
    label: 'Knowledge',
    items: [
      { to: '/rules', icon: BookMarked, label: 'Rules & solutions' },
      { to: '/compass-projects', icon: Layers, label: 'Compass projects' },
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
    label: 'Mocked stuff',
    mocked: true,
    items: [
      { to: '/topics', icon: Lightbulb, label: 'Topics' },
      { to: '/problems', icon: AlertCircle, label: 'Problems' },
      { to: '/projects', icon: FolderKanban, label: 'Projects' },
      { to: '/people', icon: Users, label: 'People' },
      { to: '/automations', icon: Workflow, label: 'Automations' },
    ],
  },
  {
    label: 'Help',
    items: [
      { to: '/glossary', icon: BookOpen, label: 'Glossary' },
    ],
  },
];
