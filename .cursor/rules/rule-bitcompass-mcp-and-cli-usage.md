# BitCompass MCP and CLI Usage

This project uses BitCompass for managing rules, solutions, and activity logs. LLMs should use the available MCP tools and CLI commands when appropriate.

## MCP Tools (Available in AI Editor)

Use these tools directly from the AI editor when available:

### search-rules
Search BitCompass rules by query.

**When to use:** When you need to find existing rules or patterns that might help solve a problem.

**Parameters:**
- `query` (required): Search query string
- `kind` (optional): Filter by 'rule', 'solution', 'skill', or 'command'
- `limit` (optional): Maximum number of results (default: 20)

**Example:** Search for rules about "authentication" or "error handling"

### search-solutions
Search BitCompass solutions by query.

**When to use:** When you need to find solutions to specific problems.

**Parameters:**
- `query` (required): Search query string
- `limit` (optional): Maximum number of results (default: 20)

**Example:** Search for solutions about "database connection issues"

### post-rules
Publish a new rule, solution, skill, or command to BitCompass.

**When to use:** When you've created a reusable pattern, best practice, solution, skill, or workflow that should be shared with the team.

**Parameters:**
- `kind` (required): 'rule', 'solution', 'skill', or 'command'
- `title` (required): Title of the entry
- `body` (required): Full content
- `description` (optional): Short description
- `context` (optional): Additional context
- `examples` (optional): Array of example strings
- `technologies` (optional): Array of technology tags

**When the user says "share" without specifying type:** First ask or infer the type (see "What to share as what" below), then call post-rules with the chosen kind.

### create-activity-log
Collect repository summary and git activity, then push to activity logs.

**When to use:** When the user asks to log their work or track activity for a specific time period.

**Parameters:**
- `time_frame` (required): 'day', 'week', or 'month'
- `repo_path` (optional): Path to git repo (defaults to current directory)

**Example:** User asks "log my work for this week" → call with time_frame: 'week'

## What to share as what

When the user wants to **share** something, determine the type (or ask with a single choice) using this mapping:

- **Rule** – Documentation or behavior guidance for the AI (e.g. "how to do internationalization", coding standards, i18n guide).
- **Solution** – How you fixed or implemented a specific problem (e.g. "how we fixed the login bug", "how we implemented feature X").
- **Skill** – How the AI should behave in a domain (e.g. "front-end design", "back-end implementation", frontend-design skill).
- **Command (workflow)** – A workflow or command (e.g. "share this workflow", "our release checklist").

**Rule of thumb:** If the user says "share" without a clear type, ask for a single choice (rule / command / solution / skill) or infer from file frontmatter or filename (e.g. `rule-*.mdc`, `solution-*.md`), then use the mapping above.

## CLI Commands (Run via Terminal)

Use these commands when you need to interact with BitCompass from the terminal:

### Authentication
- `bitcompass login` - Log in with Google (opens browser)
- `bitcompass logout` - Remove stored credentials
- `bitcompass whoami` - Show current user (email)

**When to use:** When authentication is required or to verify login status.

### Project Configuration
- `bitcompass init` - Configure project: editor/AI provider and output folder

**When to use:** Run once per project to set up BitCompass configuration.

### Share (unified)
- `bitcompass share [file]` – Share a rule, solution, skill, or command. Prompts for type if not in file or `--kind`.
- `--kind <rule|solution|skill|command>` – Skip type prompt.
- `--project-id <uuid>` – Scope to a Compass project.

**When to use:** When the user wants to share something and you want one flow that asks what type, or when sharing a file that has `kind` in frontmatter (or a filename like `rule-*.mdc`).

### Rules Management
- `bitcompass rules search [query]` - Search rules interactively
- `bitcompass rules list` - List all available rules
- `bitcompass rules pull [id]` - Pull a rule by ID (saves to project rules folder)
  - Use `--global` flag to install globally to ~/.cursor/rules/
- `bitcompass rules push [file]` - Push a rule file to BitCompass

**When to use:** 
- `pull`: When you want to download and use a specific rule in your project
- `push`: When you've created a rule file and want to share it
- `search`/`list`: When browsing available rules

### Solutions Management
- `bitcompass solutions search [query]` - Search solutions interactively
- `bitcompass solutions pull [id]` - Pull a solution by ID
  - Use `--global` flag to install globally
- `bitcompass solutions push [file]` - Push a solution file to BitCompass

**When to use:** Similar to rules, but for problem-solution pairs.

### Activity Logs
- `bitcompass log` - Collect repo summary and git activity, push to activity logs
- `bitcompass log YYYY-MM-DD` - Log activity for a specific date
- `bitcompass log YYYY-MM-DD YYYY-MM-DD` - Log activity for a date range

**When to use:** When the user wants to track or log their development activity.

### Configuration
- `bitcompass config list` - List all config values
- `bitcompass config get <key>` - Get a specific config value
- `bitcompass config set <key> <value>` - Set config value (supabaseUrl, supabaseAnonKey, apiUrl)

**When to use:** When you need to check or modify BitCompass configuration.

### MCP Server
- `bitcompass mcp start` - Start MCP server (stdio mode for AI editors)
- `bitcompass mcp status` - Show MCP server status

**When to use:** Usually configured automatically by the AI editor. Use `status` to verify MCP is working.

## Decision Guide

**Use MCP tools when:**
- You're working in the AI editor and need to search or publish rules, solutions, skills, or commands
- The user asks you to search for existing patterns or solutions
- You've created something reusable and want to share it immediately (use post-rules with the right kind; see "What to share as what")
- The user wants to log their activity

**Use CLI commands when:**
- You need to authenticate or verify authentication
- The user explicitly asks to run a CLI command
- You need to pull rules/solutions to the project (for version control)
- You need to check or modify configuration
- The MCP tool is not available or returns an authentication error

## Authentication Notes

- Most MCP tools require authentication (except search-rules and search-solutions)
- If you get an authentication error, instruct the user to run `bitcompass login` and restart the MCP server
- CLI commands that require auth will prompt the user to login

## Best Practices

1. **Search before creating:** Before publishing a new rule, search to see if something similar exists
2. **Use descriptive titles:** When posting rules/solutions, use clear, searchable titles
3. **Include context:** Add context, examples, and technologies when posting to make rules more discoverable
4. **Pull for version control:** Use `rules pull` or `solutions pull` to add rules to your project's rules folder (tracked in git)
5. **Global vs project:** Use `--global` flag when you want a rule available across all projects, otherwise use project-specific rules
