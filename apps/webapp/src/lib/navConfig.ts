import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookMarked,
  BookOpen,
  FolderTree,
  Layers,
  Plug,
  Terminal,
  Users,
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
      { to: '/skills', icon: BookMarked, label: 'Skills & rules' },
      { to: '/compass-projects', icon: Layers, label: 'Compass projects' },
      { to: '/groups', icon: FolderTree, label: 'Groups' },
      { to: '/users', icon: Users, label: 'Users' },
      { to: '/stats', icon: BarChart3, label: 'Stats' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/cli', icon: Terminal, label: 'CLI' },
      { to: '/mcp', icon: Plug, label: 'MCP' },
    ],
  },
  // Mocked sections – commented out until backed by real data
  // {
  //   label: 'Mocked stuff',
  //   mocked: true,
  //   items: [
  //     { to: '/topics', icon: Lightbulb, label: 'Topics' },
  //     { to: '/problems', icon: AlertCircle, label: 'Problems' },
  //     { to: '/projects', icon: FolderKanban, label: 'Projects' },
  //     { to: '/people', icon: Users, label: 'People' },
  //     { to: '/automations', icon: Workflow, label: 'Automations' },
  //   ],
  // },
  {
    label: 'Help',
    items: [
      { to: '/glossary', icon: BookOpen, label: 'Glossary' },
    ],
  },
];
