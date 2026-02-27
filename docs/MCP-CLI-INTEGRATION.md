# MCP + CLI Integration Guide

A practical guide to building and running a **Model Context Protocol (MCP) server** alongside a **CLI**, sharing the same backend, auth, and config so the AI editor and the terminal behave consistently. This doc is general but uses a real implementation (BitCompass) as the reference.

**Tech stack (reference):** Node/Bun, TypeScript, stdio MCP transport, Supabase backend, Cursor / Antigrativity as AI editors.

---

## 1. Architecture Overview

### 1.1 Single package, two entry points

- **CLI:** Commands like `mycli login`, `mycli rules pull`, `mycli mcp start`, etc.
- **MCP server:** Started by the editor via `mycli mcp start` (stdio). The same binary runs both; the editor spawns it and talks JSON-RPC over stdin/stdout.

Keep the MCP server **inside the CLI package** so that:

- One install (`npm install -g mycli`) gives both CLI and MCP.
- Auth and config are shared (same process, same files).
- You reuse API client, auth, and business logic (e.g. “create activity log”) for both CLI and MCP tools.

### 1.2 What is shared

| Concern            | Where it lives        | Used by CLI | Used by MCP |
|-------------------|----------------------|-------------|-------------|
| Credentials       | `~/.myapp/token.json` | ✓           | ✓           |
| Global config     | `~/.myapp/config.json` (e.g. API URL) | ✓ | ✓ |
| Project config    | `.myapp/config.json` (e.g. editor, output path) | ✓ | ✓ |
| API client        | e.g. `api/client.ts`  | ✓           | ✓           |
| Business logic    | e.g. `buildAndPushActivityLog`, `pullRuleToFile` | ✓ | ✓ |

**Rule of thumb:** If the CLI command does it, the MCP server should call the same function and only adapt input/output (JSON-RPC args ↔ CLI flags, JSON result ↔ console output).

---

## 2. Editor configuration

### 2.1 Cursor: stdio config

The editor runs your CLI as a subprocess and communicates via stdin/stdout.

**Global install (e.g. `npm install -g bitcompass`):**

User adds to Cursor’s MCP config (Settings → Features → MCP → Edit config, or `~/.cursor/mcp.json`):

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

**Local / dev (project-specific):**

Point Cursor at the local CLI so the repo’s version is used:

```json
{
  "mcpServers": {
    "bitcompass": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/packages/bitcompass-cli/dist/index.js", "mcp", "start"]
    }
  }
}
```

You can commit `.cursor/mcp.json` in the repo with the local path so contributors get the right server when opening the project.

### 2.2 Cursor: install deeplink

To add the MCP server with one click from your web app:

1. Encode the **single-server** config as JSON, then Base64. The payload is the **server config object** (not the full `mcpServers` wrapper), e.g.:

   ```ts
   const serverConfig = { type: 'stdio', command: 'bitcompass', args: ['mcp', 'start'] };
   const MCP_INSTALL_CONFIG_BASE64 = btoa(JSON.stringify(serverConfig));
   ```

2. Open:

   ```
   cursor://anysphere.cursor-deeplink/mcp/install?name=bitcompass&config=<BASE64>
   ```

So in the app you can have a button “Add to Cursor” that sets `window.location.href` to that URL (with `encodeURIComponent` on the base64 string).

### 2.3 Antigrativity / other editors

These often accept the same stdio config but via a different UI (e.g. paste JSON). Provide a “Copy MCP config” that copies the same `mcpServers` snippet so the user can paste it into Settings → MCP → Add Server.

---

## 3. Authentication

### 3.1 Shared credentials

- **Storage:** One place (e.g. `~/.myapp/token.json`) used by both CLI and MCP.
- **Loading:** One module (e.g. `auth/config.ts`) with `loadCredentials()` / `isLoggedIn()`.
- **Writing:** Only the CLI writes credentials (e.g. after OAuth). The MCP server only reads.

So: user runs `mycli login` once; after that, both `mycli rules list` and the MCP tool “list-rules” see the same token.

### 3.2 Fail initialize when not logged in (Cursor UX)

Cursor can show the MCP server as “Needs authentication” (yellow) instead of “Ready” (green). To get that:

- On the **initialize** JSON-RPC method, check `loadCredentials()?.access_token`.
- If missing, **respond to initialize with an error** instead of success:

  ```ts
  if (msg.method === 'initialize') {
    const hasToken = Boolean(loadCredentials()?.access_token);
    if (!hasToken) {
      send({
        jsonrpc: '2.0',
        id: msg.id,
        error: {
          code: -32001,
          message: 'Needs authentication',
          data: {
            action: 'Login',
            instructions: "Run `bitcompass login` in a terminal, then restart the MCP server in Cursor.",
          },
        },
      });
      return;
    }
    // ... send success result
  }
  ```

- Use a **custom error code** (e.g. `-32001`) and a **fixed message** like `"Needs authentication"` so the editor can treat it as “auth required” and show the `data.instructions` to the user.

### 3.3 Per-tool auth messages

Even if initialize succeeds, some tools may require auth (e.g. “post-rules”). When the backend returns an auth error (e.g. JWT invalid, RLS denial), **don’t expose raw API errors**. Map them to a single, actionable message:

- **Example (from `api/client.ts`):**

  ```ts
  export const AUTH_REQUIRED_MSG =
    'BitCompass needs authentication. Run `bitcompass login`, then restart the MCP server in your editor.';
  ```

- In the API client, detect auth errors (e.g. `PGRST301`, `401`, message containing “jwt” or “permission denied”) and throw `new Error(AUTH_REQUIRED_MSG)` so every tool returns the same instruction.

- MCP tool handlers catch errors and return `{ error: err.message }` (or similar). The LLM then sees that exact text and can tell the user to run `mycli login` and restart MCP.

### 3.4 Don’t exit when not logged in

The MCP process must **stay alive** after sending the initialize error so Cursor can complete the handshake and show “Needs authentication”. So:

- **Do not** call `process.exit()` when token is missing.
- Start the stdio listener as usual; only the **initialize response** is an error. Later, when the user runs a tool that needs auth, return `{ error: AUTH_REQUIRED_MSG }` in the tool result.

---

## 4. Project config (optional)

If your CLI has project-specific settings (e.g. “output folder for rules”), the MCP server should use the **same** config so that:

- `mycli init` writes `.myapp/config.json`.
- MCP tools (e.g. “pull-rule”) write to the same output path.

Implementation:

- One module (e.g. `auth/project-config.ts`) with `getProjectConfig({ warnIfMissing })`.
- If no project config exists, either use defaults or warn once to stderr (e.g. “No project config found. Using defaults. Run `mycli init` to configure.”) and then use defaults so the server still works.

Call `getProjectConfig({ warnIfMissing: true })` at **MCP server startup** (e.g. in `startMcpServer()`) so the warning appears when the editor starts the server, not on first tool use.

---

## 5. MCP server implementation (stdio)

### 5.1 Transport

- **stdio:** Editor spawns `mycli mcp start` and sends JSON-RPC over stdin; server responds on stdout.
- **Format:** One JSON object per line (newline-delimited). Parse stdin line-by-line, parse each line as JSON, dispatch by `method`.

You can implement this by hand (as in the reference) or use the official `@modelcontextprotocol/sdk` with its stdio transport if you prefer.

### 5.2 Methods to implement

- **initialize** – Return protocol version, capabilities (`tools: {}`, optionally `prompts: {}`), server name/version. Or return auth error as in §3.2.
- **tools/list** – Return an array of tools; each has `name`, `description`, `inputSchema` (JSON Schema).
- **tools/call** – Receive `name` and `arguments`; run the handler; return `result.content: [{ type: 'text', text: JSON.stringify(result) }]`.
- **prompts/list** and **prompts/get** (optional) – If you want the editor to show custom prompts that guide the user and then call tools.

Ignore or handle `notified` with `notifications/initialized` if the client sends it, and ignore requests with `id === undefined` (notifications).

### 5.3 Tool descriptions and schema

- **description:** Written for the **LLM**. Say *when* to use the tool and what it returns, e.g. “Use when the user wants to find rules by keyword. Returns a list of matching items with id, title, kind, and a short body snippet.”
- **inputSchema:** JSON Schema with `type: 'object'`, `properties`, and `required`. Add `description` on parameters so the model can fill them correctly.

Example:

```ts
{
  name: 'search-rules',
  description: 'Use when the user wants to find rules, solutions, or commands by keyword. Returns a list with id, title, kind, author, and a short body snippet. Optionally filter by kind and limit.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query or keywords' },
      kind: { type: 'string', enum: ['rule', 'solution', 'skill', 'command'], description: 'Optional: restrict to one kind' },
      limit: { type: 'number', description: 'Optional: max results (default 20)' },
    },
    required: ['query'],
  },
}
```

### 5.4 Tool handlers: reuse CLI/API logic

Each handler should:

1. Parse/validate arguments (and optionally check auth if needed).
2. Call the **same** API or business function the CLI uses (e.g. `searchRules()`, `buildAndPushActivityLog()`).
3. Return a plain object; the server wraps it in `result.content: [{ type: 'text', text: JSON.stringify(result) }]`.

Use **consistent error shape** in the returned object, e.g. `{ error: string }` when something failed, so the LLM can always check `result.error` and tell the user to run `mycli login` or fix config.

---

## 6. CLI commands that tie into MCP

### 6.1 MCP subcommands

- **`mycli mcp start`** – Start the MCP server (stdio). Entry point is the same binary; e.g. `program.command('mcp').command('start').action(runMcpStart)`.
- **`mycli mcp status`** – Print whether the user is logged in (e.g. “MCP: ready (logged in)” or “MCP: not logged in. Run mycli login.”). Useful for debugging and for the LLM when it suggests checking status.

### 6.2 runMcpStart

- Call `getProjectConfig({ warnIfMissing: true })` so project config is loaded and optional warning is printed.
- Create the stdio server and call `server.connect()` (or equivalent) so the process stays alive and listens on stdin.
- Do **not** exit on missing auth; let initialize respond with the auth error and keep the process running.

---

## 7. LLM rules and documentation

### 7.1 Why rules matter

The AI assistant must know:

- **When to use MCP tools** (search, create, list, etc.) vs **when to suggest CLI commands** (login, init, config, pull for version control).
- What to do when a tool returns an auth error (tell user: run `mycli login`, then restart MCP).

### 7.2 Where to put the rules

- **Cursor:** Put a rule file in the project’s rules directory (e.g. `.cursor/rules/rule-myapp-mcp-and-cli-usage.md`). You can **generate this file** from `mycli init` so every initialized project gets the same guidance.
- **Content:** List MCP tools (name, when to use, parameters, example). List CLI commands (login, init, config, mcp start/status, rules/solutions, etc.). Add a “Decision guide”: use MCP when …, use CLI when …. Add “Authentication notes”: most tools require auth; on auth error, instruct user to run `mycli login` and restart MCP.

See the reference rule in `.cursor/rules/rule-bitcompass-mcp-and-cli-usage.md` (or the template in `packages/bitcompass-cli/src/commands/init.ts`) for structure and wording.

### 7.3 Keep rule and app docs in sync

- The text in the **init-generated rule** should match the **MCP tools and CLI** you actually ship (tool names, parameters, commands). When you add a new tool or command, update the init template and the app’s MCP page so all three stay aligned.

---

## 8. App documentation page (optional but recommended)

If you have a web app for the same product:

- **MCP page** (e.g. `/mcp`) that explains:
  - What MCP is and why it’s useful.
  - That the MCP server uses the same project config as the CLI (e.g. `.myapp/config.json`).
  - **Setup:** Paste this config (show the `mcpServers` snippet). Run `mycli login` first; if MCP was added before login, restart the MCP server.
  - **Buttons:** “Add to Cursor” (navigate to the Cursor deeplink with base64 config), “Add to Antigrativity” (copy config to clipboard and show a toast: “Paste into Settings → MCP → Add Server”).
  - **List of MCP tools** (same list as in the rule file).
  - **Authentication:** Most tools require auth; on error, run `mycli login` and restart MCP.
  - **CLI:** `mycli mcp start`, `mycli mcp status` and when to use them.

This gives users one place to discover and configure MCP and aligns with what the LLM sees in the rule file.

---

## 9. Version and process details

### 9.1 Server version

Read the version from **package.json** at runtime (e.g. relative to `import.meta.url` or `__dirname`) and return it in **initialize** as `serverInfo.version`. So the editor can show which version of your MCP server is running.

### 9.2 Process lifecycle

- The editor starts the process when the user opens the project (or when MCP is enabled). The process runs until the editor kills it.
- Keep the process alive: after handling **initialize**, do not exit; keep reading from stdin and processing requests. Only exit on fatal errors if you want the editor to show a crash state.

---

## 10. Checklist (summary)

Use this to verify your MCP + CLI setup:

- [ ] **Single package:** CLI and MCP server live in the same package; `mycli mcp start` runs the server.
- [ ] **Shared auth:** Credentials in one place; CLI writes, MCP reads; same `loadCredentials()` / `isLoggedIn()`.
- [ ] **Shared config:** Global config (e.g. API URL) and optional project config (e.g. output path) used by both CLI and MCP.
- [ ] **Initialize auth:** If not logged in, respond to `initialize` with an error (e.g. code `-32001`, message “Needs authentication”) and instructions; do not exit the process.
- [ ] **Tool auth:** Map API auth errors to one clear message (“Run `mycli login`, then restart the MCP server”); return it in tool results as `{ error: … }`.
- [ ] **Editor config:** Document stdio config for Cursor (`mcpServers.<name>.command` + `args`); provide deeplink for Cursor and copy-paste for other editors.
- [ ] **Reuse logic:** MCP tools call the same API/business functions as CLI commands; no duplicate business logic.
- [ ] **Tool schema:** Clear `description` and `inputSchema` for each tool so the LLM knows when and how to call them.
- [ ] **LLM rule:** Project rule file (e.g. generated by `mycli init`) documents MCP tools, CLI commands, when to use which, and what to do on auth error.
- [ ] **App MCP page:** Optional; same setup instructions, tool list, and auth notes as the rule; “Add to Cursor” / “Add to Antigrativity” actions.
- [ ] **Version:** Server reports version from package.json in initialize.
- [ ] **No exit when unauthenticated:** Process stays alive after sending initialize error so the editor can show “Needs authentication”.

---

## Reference: BitCompass file map

| Purpose              | Location |
|----------------------|----------|
| MCP server (stdio)   | `packages/bitcompass-cli/src/mcp/server.ts` |
| MCP CLI commands     | `packages/bitcompass-cli/src/commands/mcp.ts` |
| Shared API client    | `packages/bitcompass-cli/src/api/client.ts` (auth messages, Supabase) |
| Shared auth/config   | `packages/bitcompass-cli/src/auth/config.ts`, `project-config.ts` |
| Shared business logic | e.g. `commands/log.ts` (`buildAndPushActivityLog`), `lib/rule-file-ops.ts` (`pullRuleToFile`) |
| Init (writes rule)   | `packages/bitcompass-cli/src/commands/init.ts` |
| Rule template        | Inline in `init.ts`; same content as `.cursor/rules/rule-bitcompass-mcp-and-cli-usage.md` |
| App MCP page         | `src/pages/MCPPage.tsx` (config, deeplink, tools, auth, CLI) |
| Cursor MCP config    | `.cursor/mcp.json` (optional, for local dev) |

Using this structure and the checklist above, you can replicate the same MCP + CLI behavior in another application on a similar stack.
