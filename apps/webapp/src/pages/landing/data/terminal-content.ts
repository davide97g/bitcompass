export interface TerminalLineData {
  type: "command" | "output" | "success" | "error" | "info" | "blank";
  content: string | { text: string; color: string }[];
  delay?: number;
}

export interface TabData {
  id: string;
  label: string;
  icon: string;
  description: string;
  bullets: string[];
  lines: TerminalLineData[];
}

export const heroTerminalLines: TerminalLineData[] = [
  { type: "command", content: "bitcompass setup", delay: 0 },
  { type: "info", content: "🔍 Detecting project environment...", delay: 300 },
  {
    type: "output",
    content: [
      { text: "  Editor: ", color: "#7c8a8f" },
      { text: "Cursor", color: "#7fdbca" },
      { text: " + ", color: "#7c8a8f" },
      { text: "Claude Code", color: "#7fdbca" },
    ],
    delay: 600,
  },
  {
    type: "output",
    content: [
      { text: "  Config: ", color: "#7c8a8f" },
      { text: ".cursorrules", color: "#c3e88d" },
      { text: ", ", color: "#7c8a8f" },
      { text: "CLAUDE.md", color: "#c3e88d" },
    ],
    delay: 800,
  },
  { type: "blank", content: "", delay: 900 },
  { type: "success", content: "✓ Connected to BitCompass cloud", delay: 1100 },
  { type: "success", content: "✓ Synced 12 rules from your team", delay: 1400 },
  {
    type: "output",
    content: [
      { text: "  Ready! Run ", color: "#7c8a8f" },
      { text: "bitcompass sync", color: "#ffcb6b" },
      { text: " to keep rules up to date.", color: "#7c8a8f" },
    ],
    delay: 1700,
  },
];

export const commandTabs: TabData[] = [
  {
    id: "setup",
    label: "Setup",
    icon: "Rocket",
    description: "Get your team running in 30 seconds",
    bullets: [
      "One command to install globally",
      "OAuth login with your team account",
      "Auto-detects editors and config files",
    ],
    lines: [
      { type: "command", content: "npm i -g bitcompass", delay: 0 },
      { type: "success", content: "✓ Installed bitcompass@0.14.0", delay: 400 },
      { type: "blank", content: "", delay: 500 },
      { type: "command", content: "bitcompass login", delay: 700 },
      {
        type: "output",
        content: [
          { text: "  Opening browser for ", color: "#7c8a8f" },
          { text: "OAuth login", color: "#7fdbca" },
          { text: "...", color: "#7c8a8f" },
        ],
        delay: 1000,
      },
      { type: "success", content: "✓ Logged in as davide@team.dev", delay: 1400 },
      { type: "blank", content: "", delay: 1500 },
      { type: "command", content: "bitcompass init", delay: 1700 },
      {
        type: "output",
        content: [
          { text: "  Detected: ", color: "#7c8a8f" },
          { text: "Cursor", color: "#c3e88d" },
          { text: " + ", color: "#7c8a8f" },
          { text: "Claude Code", color: "#c3e88d" },
        ],
        delay: 2000,
      },
      { type: "success", content: "✓ Project initialized with 2 config targets", delay: 2300 },
    ],
  },
  {
    id: "search",
    label: "Search & Pull",
    icon: "Search",
    description: "Find and install rules from your team",
    bullets: [
      "Full-text search across all shared rules",
      "Preview before pulling",
      "Auto-writes to the correct config file",
    ],
    lines: [
      { type: "command", content: 'bitcompass rules search "auth"', delay: 0 },
      { type: "blank", content: "", delay: 300 },
      {
        type: "output",
        content: [
          { text: "  ID   ", color: "#7c8a8f" },
          { text: "Name                    ", color: "#7fdbca" },
          { text: "Group", color: "#c792ea" },
        ],
        delay: 500,
      },
      {
        type: "output",
        content: [
          { text: "  42   ", color: "#ffcb6b" },
          { text: "auth-middleware-rules    ", color: "#fff" },
          { text: "backend", color: "#c792ea" },
        ],
        delay: 600,
      },
      {
        type: "output",
        content: [
          { text: "  58   ", color: "#ffcb6b" },
          { text: "oauth-best-practices    ", color: "#fff" },
          { text: "security", color: "#c792ea" },
        ],
        delay: 700,
      },
      {
        type: "output",
        content: [
          { text: "  71   ", color: "#ffcb6b" },
          { text: "jwt-validation-rules    ", color: "#fff" },
          { text: "security", color: "#c792ea" },
        ],
        delay: 800,
      },
      { type: "blank", content: "", delay: 900 },
      { type: "command", content: "bitcompass rules pull 42", delay: 1100 },
      { type: "success", content: "✓ Pulled auth-middleware-rules → .cursorrules", delay: 1500 },
      { type: "success", content: "✓ Pulled auth-middleware-rules → CLAUDE.md", delay: 1700 },
    ],
  },
  {
    id: "share",
    label: "Share",
    icon: "Upload",
    description: "Publish rules for your whole team",
    bullets: [
      "Share from any supported config file",
      "Automatic metadata extraction",
      "Instant availability for teammates",
    ],
    lines: [
      { type: "command", content: "bitcompass share ./my-rule.mdc", delay: 0 },
      { type: "info", content: "📦 Packaging rule...", delay: 400 },
      {
        type: "output",
        content: [
          { text: "  Name:  ", color: "#7c8a8f" },
          { text: "react-component-patterns", color: "#7fdbca" },
        ],
        delay: 700,
      },
      {
        type: "output",
        content: [
          { text: "  Group: ", color: "#7c8a8f" },
          { text: "frontend", color: "#c792ea" },
        ],
        delay: 800,
      },
      {
        type: "output",
        content: [
          { text: "  Size:  ", color: "#7c8a8f" },
          { text: "2.4 KB", color: "#ffcb6b" },
        ],
        delay: 900,
      },
      { type: "blank", content: "", delay: 1000 },
      { type: "success", content: "✓ Published! Available to 8 team members", delay: 1300 },
      {
        type: "output",
        content: [
          { text: "  View at: ", color: "#7c8a8f" },
          { text: "app.bitcompass.dev/skills/156", color: "#7fdbca" },
        ],
        delay: 1600,
      },
    ],
  },
  {
    id: "sync",
    label: "Sync",
    icon: "RefreshCw",
    description: "Bidirectional sync with dedup prevention",
    bullets: [
      "Smart diff shows what changed",
      "Dedup prevents duplicate rules",
      "Confirms before writing",
    ],
    lines: [
      { type: "command", content: "bitcompass sync --check", delay: 0 },
      { type: "info", content: "🔄 Checking for changes...", delay: 400 },
      { type: "blank", content: "", delay: 600 },
      {
        type: "output",
        content: [
          { text: "  ↓ 3 rules to pull ", color: "#c3e88d" },
          { text: "(new from team)", color: "#7c8a8f" },
        ],
        delay: 800,
      },
      {
        type: "output",
        content: [
          { text: "  ↑ 1 rule to push  ", color: "#ffcb6b" },
          { text: "(local changes)", color: "#7c8a8f" },
        ],
        delay: 1000,
      },
      {
        type: "output",
        content: [
          { text: "  = 9 rules in sync ", color: "#7c8a8f" },
          { text: "(no changes)", color: "#7c8a8f" },
        ],
        delay: 1100,
      },
      { type: "blank", content: "", delay: 1200 },
      { type: "command", content: "bitcompass sync -y", delay: 1400 },
      { type: "success", content: "✓ Pulled 3 rules, pushed 1 rule", delay: 1800 },
      { type: "success", content: "✓ All 13 rules in sync", delay: 2100 },
    ],
  },
  {
    id: "mcp",
    label: "MCP",
    icon: "Plug",
    description: "AI editors discover rules automatically",
    bullets: [
      "Model Context Protocol server built-in",
      "Editors query rules on demand",
      "Zero config — just start the server",
    ],
    lines: [
      { type: "command", content: "bitcompass mcp start", delay: 0 },
      {
        type: "output",
        content: [
          { text: "  MCP server listening on ", color: "#7c8a8f" },
          { text: "stdio", color: "#7fdbca" },
        ],
        delay: 400,
      },
      {
        type: "output",
        content: [
          { text: "  Tools registered: ", color: "#7c8a8f" },
          { text: "search-rules, get-rule, list-rules", color: "#c3e88d" },
        ],
        delay: 700,
      },
      { type: "blank", content: "", delay: 900 },
      {
        type: "info",
        content: "← Claude asks: search-rules { query: \"error handling\" }",
        delay: 1200,
      },
      {
        type: "output",
        content: [
          { text: "  → Returning ", color: "#7c8a8f" },
          { text: "3 matching rules", color: "#ffcb6b" },
        ],
        delay: 1600,
      },
      { type: "blank", content: "", delay: 1800 },
      {
        type: "info",
        content: "← Claude asks: get-rule { id: 42 }",
        delay: 2000,
      },
      {
        type: "output",
        content: [
          { text: "  → Returning rule content ", color: "#7c8a8f" },
          { text: "(2.4 KB)", color: "#c792ea" },
        ],
        delay: 2300,
      },
    ],
  },
];

export const workflowSteps = [
  {
    label: "Install",
    command: "npm i -g bitcompass",
    description: "Install the CLI globally",
  },
  {
    label: "Login",
    command: "bitcompass login",
    description: "Authenticate with your team",
  },
  {
    label: "Init",
    command: "bitcompass init",
    description: "Detect editors & config",
  },
  {
    label: "Sync",
    command: "bitcompass sync",
    description: "Pull & push rule changes",
  },
  {
    label: "Share",
    command: "bitcompass share .",
    description: "Publish rules for your team",
  },
];
