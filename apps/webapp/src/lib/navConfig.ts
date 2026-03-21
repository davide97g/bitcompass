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
}

export const navGroups: NavGroup[] = [
  {
    label: 'Knowledge',
    items: [
      { to: '/skills', icon: BookMarked, label: 'Skills & rules' },
      { to: '/projects', icon: Layers, label: 'Projects' },
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
  {
    label: 'Help',
    items: [
      { to: '/glossary', icon: BookOpen, label: 'Glossary' },
    ],
  },
];
