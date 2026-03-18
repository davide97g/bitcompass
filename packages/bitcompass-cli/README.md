# BitCompass CLI

CLI for rules, solutions, skills, commands, and MCP server. Same backend as the webapp (Supabase).

## Install

```bash
npm install -g bitcompass
```

Or run without installing:

```bash
npx bitcompass --help
```

Package: [npmjs.com/package/bitcompass](https://www.npmjs.com/package/bitcompass)

## Quick Start

```bash
bitcompass setup    # login → init → sync (skips completed steps)
```

Or step by step:

1. `bitcompass login` – Google login (opens browser)
2. `bitcompass init` – Configure editors, output folder, Compass project link
3. `bitcompass sync` – Sync local files with Compass project

## Commands

### Authentication
- `bitcompass login` – Google login (opens browser)
- `bitcompass logout` – Remove credentials
- `bitcompass whoami` – Show current user

### Project Setup
- `bitcompass setup` – Quick onboarding: login → init → sync (skips completed steps)
- `bitcompass init` – Configure editors, output folder, Compass project link
- `bitcompass migrate` – Migrate from older BitCompass versions

### Content Management
Each kind (rules, skills, commands, solutions) supports `search`, `list`, `pull`, `push`:

- `bitcompass rules search|list|pull|push` – Manage rules (`.mdc` files)
- `bitcompass skills search|list|pull|push` – Manage skills (`SKILL.md` in subdirectory)
- `bitcompass commands search|list|pull|push` – Manage commands (`.md` files)
- `bitcompass solutions search|list|pull|push` – Manage solutions (`.md` files)
- `bitcompass share [file]` – Publish to BitCompass (auto-detects kind and special file target)
- `bitcompass sync` – Sync local files with Compass project (`--check`, `--all -y`, `--prune`)
- `bitcompass update` – Check for and apply updates to installed content

### Groups & Projects
- `bitcompass group pull|sync|list` – Pull/sync rules by knowledge group
- `bitcompass project pull|sync|list` – Manage Compass project content

### Configuration
- `bitcompass config` – Interactive config TUI
- `bitcompass config list|get|set` – Manage config values
- `bitcompass config push|pull` – Share/pull config with Compass project teammates

### MCP Server
- `bitcompass mcp start` – Start MCP server (stdio) for AI editors
- `bitcompass mcp status` – Show MCP login status

### Other
- `bitcompass glossary` – Show terminology
- `bitcompass self-update` – Update to latest version

## MCP

### Cursor (global install)

Add to Cursor's MCP config (Settings → Features → MCP → Edit config, or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "bitcompass": {
      "type": "stdio",
      "command": "bitcompass",
      "args": ["mcp", "start"]
    }
  }
}
```

Run `bitcompass login` before using MCP. If you added the MCP before logging in, restart the MCP server after logging in.

### Development (this repo)

Build and log in:

```bash
cd packages/bitcompass-cli && bun run build && bitcompass login
```

### MCP Tools

- `search-rules` – Search rules, solutions, skills, or commands by keyword (optional kind filter)
- `search-solutions` – Search solutions by query
- `get-rule` – Get full content by ID
- `list-rules` – List all content (optional kind filter and limit)
- `post-rules` – Publish new content (auto-detects Compass project, sets version)
- `update-rule` – Update existing content you own
- `delete-rule` – Delete content by ID
- `pull-rule` – Pull content into project (writes to configured editor directories)
- `pull-group` – Pull all rules from a knowledge group

### MCP Prompts

- `share` – Guide to publish content (checks duplicates, collects fields, offers pull)
- `share_new_rule` – Guide to publish a reusable rule
- `share_problem_solution` – Guide to publish a problem solution
- `update` – Guide to find and update existing content
- `pull` – Guide to search and pull content into project
- `sync` – Guide to sync with Compass project (delegates to CLI)

## Multi-Editor Support

BitCompass outputs to multiple editors simultaneously. During `bitcompass init`, select all editors you use:

| Editor | Base path | Rules | Skills | Commands | Solutions |
|--------|-----------|-------|--------|----------|-----------|
| Cursor | `.cursor/` | `rules/` | `skills/{slug}/SKILL.md` | `commands/` | `documentation/` |
| Claude Code | `.claude/` | `rules/` | `skills/{slug}/SKILL.md` | `commands/` | `documentation/` |
| VSCode | `.vscode/` | same | same | same | same |
| Antigrativity | `.antigrativity/` | same | same | same | same |

## Publish (maintainers)

```bash
cd packages/bitcompass-cli
bun run build
npm publish
```

For a scoped package use `npm publish --access public`.
