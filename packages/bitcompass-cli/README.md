# BitCompass CLI

CLI for rules, solutions, and MCP server. Same backend as the webapp (Supabase).

## Install

```bash
npm install -g bitcompass
```

Or run without installing:

```bash
npx bitcompass --help
```

Package: [npmjs.com/package/bitcompass](https://www.npmjs.com/package/bitcompass)

## Setup

1. Configure Supabase (required for login and API):
   - `bitcompass config set supabaseUrl https://YOUR_PROJECT.supabase.co`
   - `bitcompass config set supabaseAnonKey YOUR_ANON_KEY`
   - Or set `BITCOMPASS_SUPABASE_URL` and `BITCOMPASS_SUPABASE_ANON_KEY`
2. Log in: `bitcompass login` (opens browser)

## Commands

- `bitcompass login` – Google login (opens browser)
- `bitcompass logout` – Remove credentials
- `bitcompass whoami` – Show current user
- `bitcompass rules search [query]` – Search rules
- `bitcompass rules list` – List rules
- `bitcompass rules pull [id]` – Pull rule to file
- `bitcompass rules push [file]` – Push rule (or interactive)
- `bitcompass solutions search|pull|push` – Same for solutions
- `bitcompass mcp start` – Start MCP server (stdio) for Cursor/IDEs
- `bitcompass mcp status` – Show MCP login status
- `bitcompass config` – List config; `config set/get` for values

## MCP

### Cursor (global install)

If you installed via `npm install -g bitcompass`, add this to Cursor’s MCP config:

**Cursor:** Settings → Features → MCP → Edit config (or open `~/.cursor/mcp.json`).

Add the `bitcompass` entry under `mcpServers`:

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

Run `bitcompass login` before using MCP. If you added the MCP before logging in, restart the MCP server in Cursor after logging in.

### Development (this repo)

This repo includes **`.cursor/mcp.json`** so Cursor points at the local CLI when the project is open. Build and log in:

```bash
cd packages/bitcompass-cli && npm run build && bitcompass login
```

**Manual (local path):** Settings → MCP → stdio, Command **node**, Args **path/to/packages/bitcompass-cli/dist/index.js** **mcp** **start**.

### MCP Tools

**Rules & Solutions:**
- `search-rules` - Search rules by query (with optional kind filter)
- `search-solutions` - Search solutions by query
- `get-rule` - Get full rule/solution details by ID
- `list-rules` - List all rules/solutions (with optional kind filter and limit)
- `post-rules` - Create/publish a new rule or solution
- `update-rule` - Update an existing rule or solution
- `delete-rule` - Delete a rule or solution by ID
- `pull-rule` - Pull a rule/solution to a file in the project rules directory

**Activity Logs:**
- `create-activity-log` - Create activity log from git repo (day/week/month)
- `list-activity-logs` - List user's activity logs (with optional filters)
- `get-activity-log` - Get activity log details by ID

**Prompts:**
- `share_new_rule` - Guide to collect and publish a reusable rule
- `share_problem_solution` - Guide to collect and publish a problem solution

## Publish (maintainers)

From the CLI package directory:

```bash
cd packages/bitcompass-cli
npm run build
npm publish
```

For a scoped package use `npm publish --access public`.
