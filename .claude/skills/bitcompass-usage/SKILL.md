---
name: bitcompass-usage
description: How to use BitCompass MCP tools, CLI commands, and slash commands for managing rules, solutions, skills, and commands
---

# BitCompass Usage Guide

You have access to BitCompass for managing rules, solutions, skills, and commands. Use this guide to decide which tool to use.

## Decision Guide

| Need | Use | Why |
|------|-----|-----|
| Search/browse content | MCP tools (`search-rules`, `list-rules`) | Direct from editor, no terminal needed |
| Publish new content | `/share` command or `post-rules` MCP tool | Guided workflow with duplicate checking |
| Update existing content | `/update-content` command or `update-rule` MCP tool | Find → review → edit flow |
| Pull content to project | `/pull-content` command or `pull-rule` MCP tool | Search → select → install flow |
| Sync with Compass project | `/sync-project` command or `bitcompass sync` CLI | Bulk sync delegated to CLI |
| Login/auth | `bitcompass login` CLI | Requires browser, terminal only |
| First-time setup | `bitcompass setup` CLI | Login + init + sync in one step |
| Project configuration | `bitcompass init` CLI | Interactive editor/output setup |

## Slash Commands (Claude Code)

- `/share` — Publish new content to BitCompass (guided: determine kind, check duplicates, collect fields, publish, offer pull)
- `/update-content` — Find and update existing content you own
- `/pull-content` — Search and pull content into this project
- `/sync-project` — Sync local files with linked Compass project

## MCP Tools

### search-rules
Search by keyword. **Params:** `query` (required), `kind` (optional: rule/solution/skill/command), `limit` (optional, default 20).

### search-solutions
Search solutions specifically. **Params:** `query` (required), `limit` (optional).

### post-rules
Publish new content. **Params:** `kind` (required: rule/solution/skill/command), `title` (required), `body` (required), `description`, `context`, `examples`, `technologies`, `project_id`, `visibility` (private/public), `special_file_target` (optional).

### get-rule
Fetch full content by ID. **Params:** `id` (required), `kind` (optional filter).

### list-rules
Browse all content. **Params:** `kind` (optional), `limit` (optional, default 50).

### update-rule
Edit content you own. **Params:** `id` (required), plus any fields to update (title, description, body, context, examples, technologies, globs, always_apply).

### delete-rule
Remove by ID (requires ownership). **Params:** `id` (required).

### pull-rule
Install into project. Writes to configured editor directories. **Params:** `id` (required), `output_path` (optional), `global` (optional).

### pull-group
Pull all rules from a knowledge group. **Params:** `id` (required), `output_path` (optional), `global` (optional).

## CLI Commands

### Authentication
- `bitcompass login` — Log in with Google
- `bitcompass logout` — Remove credentials
- `bitcompass whoami` — Show current user

### Project Setup
- `bitcompass setup` — Quick onboarding: login → init → sync (skips completed steps)
- `bitcompass init` — Configure editors, output folder, Compass project link
- `bitcompass migrate` — Migrate from older BitCompass versions

### Content Management
Each kind (rules, skills, commands, solutions) supports: `search [query]`, `list`, `pull [id]`, `push [file]`.
- `bitcompass share [file]` — Publish (auto-detects kind and special file target)
- `bitcompass sync` — Sync local files with Compass project (`--check`, `--all -y`, `--prune`)
- `bitcompass update` — Check for and apply updates to installed content

### Configuration
- `bitcompass config list` / `get <key>` / `set <key> <value>` — Manage config
- `bitcompass config push` / `pull` — Share/pull config with Compass project teammates

## Multi-Editor Support

BitCompass outputs to multiple editors simultaneously. During `bitcompass init`, select all editors you use. Content is written to each editor's directory:

| Editor | Base path | Rules | Skills | Commands | Solutions |
|--------|-----------|-------|--------|----------|-----------|
| Cursor | `.cursor/` | `rules/` (.mdc) | `skills/{slug}/SKILL.md` | `commands/` (.md) | `documentation/` (.md) |
| Claude Code | `.claude/` | `rules/` (.mdc) | `skills/{slug}/SKILL.md` | `commands/` (.md) | `documentation/` (.md) |
| VSCode | `.vscode/` | `rules/` (.mdc) | `skills/{slug}/SKILL.md` | `commands/` (.md) | `documentation/` (.md) |

## Special Files

Some rules map to hardcoded output paths when pulled:

| Target | Output path | Description |
|--------|-------------|-------------|
| `claude.md` | `CLAUDE.md` | Claude Code project instructions |
| `agents.md` | `AGENTS.md` | OpenAI Codex instructions |
| `cursorrules` | `.cursorrules` | Cursor legacy rules |
| `copilot-instructions` | `.github/copilot-instructions.md` | GitHub Copilot instructions |
| `windsurfrules` | `.windsurfrules` | Windsurf rules |

## Authentication Notes

- Most MCP tools require authentication (except `search-rules` and `search-solutions`)
- If you get an auth error, instruct the user to run `bitcompass login` and restart the MCP server
- `post-rules` auto-detects the Compass project from local config when `project_id` is not provided

## Best Practices

1. **Search before creating** — check for duplicates with `search-rules`
2. **Use descriptive titles** — clear, searchable names
3. **Set special file targets** for editor-specific config files
4. **Use multi-editor** to keep all team editors in sync
5. **Share config** via `bitcompass config push` so teammates get the same setup
