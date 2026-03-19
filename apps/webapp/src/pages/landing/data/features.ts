export interface FeatureData {
  icon: string;
  title: string;
  description: string;
  glowColor: string;
}

export const features: FeatureData[] = [
  {
    icon: "Monitor",
    title: "Multi-Editor",
    description:
      "One source of truth for Cursor, Claude Code, VSCode, Windsurf, Copilot",
    glowColor: "#7fdbca",
  },
  {
    icon: "RefreshCw",
    title: "Bidirectional Sync",
    description: "Push and pull with smart dedup prevention",
    glowColor: "#c3e88d",
  },
  {
    icon: "FolderTree",
    title: "Knowledge Groups",
    description: "Organize rules into groups, pull entire collections",
    glowColor: "#c792ea",
  },
  {
    icon: "Plug",
    title: "MCP Integration",
    description: "AI editors discover and use your rules automatically",
    glowColor: "#ffcb6b",
  },
  {
    icon: "FileCode",
    title: "Special Files",
    description: "Auto-targets CLAUDE.md, .cursorrules, copilot-instructions",
    glowColor: "#7fdbca",
  },
  {
    icon: "Terminal",
    title: "Interactive TUI",
    description: "Beautiful terminal UI for browsing and managing",
    glowColor: "#c792ea",
  },
];
