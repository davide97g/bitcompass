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
      "args": ["mcp", "start"],
      "env": {
        "BITCOMPASS_CONFIG_DIR": "~/.bitcompass"
      }
    }
  }
}
```

Replace `~` with your full home path if your environment doesn’t expand it. Run `bitcompass login` before using MCP.

### Development (this repo)

This repo includes **`.cursor/mcp.json`** so Cursor points at the local CLI when the project is open. Build and log in:

```bash
cd packages/bitcompass-cli && npm run build && bitcompass login
```

**Manual (local path):** Settings → MCP → stdio, Command **node**, Args **path/to/packages/bitcompass-cli/dist/index.js** **mcp** **start**. Optionally set env or envFile to the CLI `.env`.

Tools: `search-rules`, `search-solutions`, `post-rules`. Prompts: `share_new_rule`, `share_problem_solution`.

## Publish (maintainers)

From the CLI package directory:

```bash
cd packages/bitcompass-cli
npm run build
npm publish
```

For a scoped package use `npm publish --access public`.
