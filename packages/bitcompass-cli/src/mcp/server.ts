import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  AUTH_REQUIRED_MSG,
  insertRule,
  searchRules,
  getRuleById,
  fetchRules,
  updateRule,
  deleteRule,
  fetchRulesByGroupId,
  getRuleGroupById,
} from '../api/client.js';
import { loadCredentials, loadCredentialsWithRefresh } from '../auth/config.js';
import { getProjectConfig } from '../auth/project-config.js';
import { pullRuleToFile } from '../lib/rule-file-ops.js';
import { bumpRuleVersionMajor } from '../lib/version-bump.js';
import type { RuleInsert, RuleKind } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// From dist/mcp/server.js (or src/mcp/server.ts when run via Bun), package.json is at package root
const packageJsonPath = join(__dirname, '..', '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string };
const VERSION = packageJson.version ?? '0.0.0';

/** When token is missing, we fail initialize so Cursor shows "Needs authentication" (yellow) instead of success (green). */
const NEEDS_AUTH_ERROR_MESSAGE = 'Needs authentication';
const NEEDS_AUTH_ERROR_CODE = -32001; // Server error: auth required

type ToolArgs = Record<string, unknown>;

function createStdioServer(): {
  connect: () => Promise<void>;
} {
  const handlers: Map<string, (params: ToolArgs) => Promise<unknown>> = new Map();
  let requestId = 0;

  const send = (msg: object): void => {
    process.stdout.write(JSON.stringify(msg) + '\n');
  };

  const handleRequest = async (msg: { id?: number | string; method?: string; params?: unknown }): Promise<void> => {
    const isNotification = msg.id === undefined || msg.id === null;
    const id = isNotification ? undefined : msg.id;
    try {
      if (msg.method === 'notified' && (msg.params as { method?: string })?.method === 'notifications/initialized') {
        return;
      }
      if (isNotification) return;
      if (msg.method === 'initialize') {
        // Try auto-refresh if token is expired
        const creds = await loadCredentialsWithRefresh();
        const hasToken = Boolean(creds?.access_token);
        if (!hasToken) {
          send({
            jsonrpc: '2.0',
            id,
            error: {
              code: NEEDS_AUTH_ERROR_CODE,
              message: NEEDS_AUTH_ERROR_MESSAGE,
              data: {
                action: 'Login',
                instructions: "Run `bitcompass login` in a terminal, then restart the MCP server in Cursor.",
              },
            },
          });
          return;
        }
        send({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {}, prompts: {} },
            serverInfo: { name: 'bitcompass', version: VERSION },
          },
        });
        return;
      }
      if (msg.method === 'tools/list') {
        send({
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'search-rules',
                description:
                  'Use when the user wants to find rules, solutions, skills, or commands by keyword or topic. Returns a list of matching items with id, title, kind, author, and a short body snippet. Optionally filter by kind (rule, solution, skill, command) and limit results.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Search query or keywords' },
                    kind: { type: 'string', enum: ['rule', 'solution', 'skill', 'command'], description: 'Optional: restrict to one kind' },
                    limit: { type: 'number', description: 'Optional: max results (default 20)' },
                  },
                  required: ['query'],
                },
              },
              {
                name: 'search-solutions',
                description:
                  'Use when the user asks for problem solutions or how-to guides. Returns a list of solutions with id, title, author, and a short snippet. Prefer this over search-rules when the intent is clearly "solutions" or "problem solutions".',
                inputSchema: {
                  type: 'object',
                  properties: { query: { type: 'string', description: 'Search query' }, limit: { type: 'number', description: 'Optional: max results' } },
                  required: ['query'],
                },
              },
              {
                name: 'post-rules',
                description:
                  'Use when the user wants to publish or share a new rule, solution, skill, or command to BitCompass. Requires kind, title, and body. When the user says "share" without specifying type, first ask or infer: Rule (behaviors, docs), Solution (how we fixed something), Skill (how AI should behave for X), Command (workflows). Returns the created id and title on success. User must be logged in (bitcompass login).',
                inputSchema: {
                  type: 'object',
                  properties: {
                    kind: { type: 'string', enum: ['rule', 'solution', 'skill', 'command'], description: 'Type of entry to publish' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    body: { type: 'string' },
                    context: { type: 'string' },
                    examples: { type: 'array', items: { type: 'string' } },
                    technologies: { type: 'array', items: { type: 'string' } },
                    project_id: { type: 'string', description: 'Optional: Compass project UUID to scope this rule to' },
                    visibility: { type: 'string', enum: ['private', 'public'], description: "Optional: 'private' (default, only you) or 'public' (everyone)" },
                    special_file_target: { type: 'string', enum: ['claude.md', 'agents.md', 'cursorrules', 'copilot-instructions', 'windsurfrules'], description: 'Optional: map to a special output file (e.g. CLAUDE.md, .cursorrules)' },
                  },
                  required: ['kind', 'title', 'body'],
                },
              },
{
                name: 'get-rule',
                description:
                  'Use when you have a rule/solution ID and need the full content (title, description, body, examples, technologies). Returns the complete rule object or an error if not found. Optional kind filter verifies the entry matches that type.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Rule/solution ID' },
                    kind: { type: 'string', enum: ['rule', 'solution', 'skill', 'command'], description: 'Optional: filter by kind' },
                  },
                  required: ['id'],
                },
              },
              {
                name: 'list-rules',
                description:
                  'Use when the user wants to browse or list all rules, solutions, skills, or commands without a search query. Optional kind filter (rule, solution, skill, command) and limit. Returns an array of items with id, title, kind, description, author, snippet, created_at, plus total/returned counts.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    kind: { type: 'string', enum: ['rule', 'solution', 'skill', 'command'], description: 'Optional: filter by kind' },
                    limit: { type: 'number', description: 'Optional: maximum number of results (default: 50)' },
                  },
                },
              },
              {
                name: 'update-rule',
                description:
                  'Use when the user wants to edit an existing rule or solution they own. Pass id and any fields to update (title, description, body, context, examples, technologies, globs, always_apply). Returns updated metadata. Requires authentication.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Rule/solution ID to update' },
                    title: { type: 'string', description: 'Updated title' },
                    description: { type: 'string', description: 'Updated description' },
                    body: { type: 'string', description: 'Updated body content' },
                    context: { type: 'string', description: 'Updated context' },
                    examples: { type: 'array', items: { type: 'string' }, description: 'Updated examples array' },
                    technologies: { type: 'array', items: { type: 'string' }, description: 'Updated technologies array' },
                    globs: { type: 'string', description: 'Glob patterns for when rule applies (e.g. "*.ts, *.tsx")' },
                    always_apply: { type: 'boolean', description: 'If true, Cursor applies this rule globally' },
                  },
                  required: ['id'],
                },
              },
              {
                name: 'delete-rule',
                description:
                  'Use when the user wants to remove a rule or solution by ID. Returns success or error. Requires authentication; user can only delete their own entries.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Rule/solution ID to delete' },
                  },
                  required: ['id'],
                },
              },
              {
                name: 'pull-rule',
                description:
                  'Use when the user wants to install a rule, solution, skill, or command into their project (e.g. "pull this rule to my project"). Saves by kind: rules → .cursor/rules (.mdc), skills → .cursor/skills (.md), commands → .cursor/commands (.md, plain), solutions → .cursor/documentation (.md, plain). Uses project config from bitcompass init unless output_path is provided (base path); global installs to ~/.cursor/<folder>. Returns the file path written or an error.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Rule/solution/skill/command ID to pull' },
                    output_path: { type: 'string', description: 'Optional: custom base path (kind subfolders created under it)' },
                    global: { type: 'boolean', description: 'Install globally to ~/.cursor/rules|skills|commands|documentation' },
                  },
                  required: ['id'],
                },
              },
{
                name: 'pull-group',
                description:
                  'Use when the user wants to pull all rules from a knowledge group (and its sub-groups) into their project. Returns the list of pulled rule titles. Groups are curated collections of rules that can be synced in bulk.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Group ID to pull' },
                    output_path: { type: 'string', description: 'Optional: custom base path for output' },
                    global: { type: 'boolean', description: 'Install globally to ~/.cursor/...' },
                  },
                  required: ['id'],
                },
              },
            ],
          },
        });
        return;
      }
      if (msg.method === 'tools/call') {
        const params = msg.params as { name?: string; arguments?: ToolArgs };
        const name = params?.name;
        const args: ToolArgs = params?.arguments ?? {};
        const handler = name ? handlers.get(name) : undefined;
        if (!handler) {
          send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}` } });
          return;
        }
        const result = await handler(args);
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } });
        return;
      }
      if (msg.method === 'prompts/list') {
        send({
          jsonrpc: '2.0',
          id,
          result: {
            prompts: [
              { name: 'share', title: 'Share something', description: 'Guide to publish a rule, solution, skill, or command. Checks for duplicates first, then collects content and publishes.' },
              { name: 'share_new_rule', title: 'Share a new rule', description: 'Guide to collect and publish a reusable rule' },
              { name: 'share_problem_solution', title: 'Share a problem solution', description: 'Guide to collect and publish a problem solution' },
              { name: 'update', title: 'Update existing content', description: 'Guide to find and update an existing rule, solution, skill, or command you own.' },
              { name: 'pull', title: 'Pull content into project', description: 'Guide to search for and pull rules, solutions, skills, or commands into your project.' },
              { name: 'sync', title: 'Sync with Compass project', description: 'Guide to sync local content with the linked Compass project (delegates to CLI).' },
            ],
          },
        });
        return;
      }
      if (msg.method === 'prompts/get') {
        const params = msg.params as { name?: string };
        const name = params?.name ?? '';
        if (name === 'share') {
          send({
            jsonrpc: '2.0',
            id,
            result: {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `You are helping the user share something to BitCompass. First determine what they are sharing. If they already said (e.g. "share this rule", "share this workflow"), use that; otherwise ask with a single choice:
- Rule: Behaviors, documentation, or how-to for the AI (e.g. i18n guide, coding standards).
- Solution: How we fixed or implemented a specific problem.
- Skill: How the AI should behave in a domain (e.g. front-end design, back-end implementation).
- Command (workflow): A workflow or command (e.g. release checklist).

Before publishing, search for similar content using search-rules to avoid duplicates. If something similar exists, ask the user whether to update the existing item or create a new one.

Then collect: title, description, body (and optionally context, examples, technologies). Ask one question at a time. Then call post-rules with the chosen kind and the collected fields. After publishing, offer to pull the item into the project using pull-rule.`,
                  },
                },
              ],
            },
          });
          return;
        }
        if (name === 'share_new_rule') {
          send({
            jsonrpc: '2.0',
            id,
            result: {
              messages: [
                { role: 'user', content: { type: 'text', text: 'You are helping formalize a reusable rule. Collect: title, description, rule body, and optionally technologies/tags. Ask one question at a time. Then call post-rules with kind: "rule".' } },
              ],
            },
          });
          return;
        }
        if (name === 'share_problem_solution') {
          send({
            jsonrpc: '2.0',
            id,
            result: {
              messages: [
                { role: 'user', content: { type: 'text', text: 'You are helping share a problem solution. Collect: problem title, description, and solution text. Ask one question at a time. Then call post-rules with kind: "solution".' } },
              ],
            },
          });
          return;
        }
        if (name === 'update') {
          send({
            jsonrpc: '2.0',
            id,
            result: {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `You are helping the user update an existing item in BitCompass.

1. Ask what they want to update — by keyword or ID.
2. If they gave a keyword, use search-rules to find matches. Present the results and ask which one.
3. If they gave an ID (or selected one), use get-rule to fetch the full content. Show them the current title, description, body, and other fields.
4. Ask what fields they want to change. Collect changes one at a time.
5. Call update-rule with the id and changed fields.
6. After updating, offer to re-pull the item into the project using pull-rule so local files stay current.`,
                  },
                },
              ],
            },
          });
          return;
        }
        if (name === 'pull') {
          send({
            jsonrpc: '2.0',
            id,
            result: {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `You are helping the user pull content from BitCompass into their project.

1. Ask what they are looking for — a topic, keyword, or specific ID.
2. Use search-rules (or search-solutions for solutions) to find matches. Present the results.
3. Ask which item(s) to pull. The user can select one or more.
4. For each selected item, call pull-rule with its ID. Report the file path written.
5. Summarize what was pulled and where the files are.`,
                  },
                },
              ],
            },
          });
          return;
        }
        if (name === 'sync') {
          send({
            jsonrpc: '2.0',
            id,
            result: {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `You are helping the user sync their local project with their linked Compass project.

Sync keeps local rules, skills, commands, and solutions in sync with the remote Compass project. This is a CLI operation — delegate to the terminal.

Options:
- \`bitcompass sync --check\` — show what would change without applying
- \`bitcompass sync\` — interactive sync (select items to pull/update)
- \`bitcompass sync --all -y\` — sync everything non-interactively
- \`bitcompass sync --prune\` — also remove items no longer in the project

Ask the user what kind of sync they want, then run the appropriate CLI command. After sync, verify the results by checking the output.`,
                  },
                },
              ],
            },
          });
          return;
        }
        send({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Unknown prompt' } });
        return;
      }
      send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
    } catch (err) {
      if (id !== undefined) {
        send({
          jsonrpc: '2.0',
          id,
          error: { code: -32603, message: err instanceof Error ? err.message : String(err) },
        });
      }
    }
  };

  let buffer = '';
  const queue: Array<{ id?: number | string; method?: string; params?: unknown }> = [];
  let processing = false;

  const processQueue = async (): Promise<void> => {
    if (processing || queue.length === 0) return;
    processing = true;
    while (queue.length > 0) {
      const msg = queue.shift()!;
      await handleRequest(msg);
    }
    processing = false;
  };

  const onData = (chunk: Buffer | string): void => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line) as { id?: number | string; method?: string; params?: unknown };
        queue.push(msg);
        void processQueue();
      } catch {
        // ignore malformed
      }
    }
  };

  process.stdin.on('data', onData);

  // Register tool implementations (search is public; post requires login)
  handlers.set('search-rules', async (args: ToolArgs) => {
    const query = (args.query as string) ?? '';
    const kind = args.kind as RuleKind | undefined;
    const limit = (args.limit as number) ?? 20;
    try {
      const list = await searchRules(query, { kind, limit });
      const summary = list.length === 0 ? 'No rules found.' : `Found ${list.length} rule(s).`;
      return {
        rules: list.map((r) => ({ id: r.id, title: r.title, kind: r.kind, author: r.author_display_name ?? null, snippet: r.body.slice(0, 200) })),
        summary,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Search failed.';
      return { error: msg };
    }
  });
  handlers.set('search-solutions', async (args: ToolArgs) => {
    const query = (args.query as string) ?? '';
    const limit = (args.limit as number) ?? 20;
    try {
      const list = await searchRules(query, { kind: 'solution', limit });
      const summary = list.length === 0 ? 'No solutions found.' : `Found ${list.length} solution(s).`;
      return {
        solutions: list.map((r) => ({ id: r.id, title: r.title, author: r.author_display_name ?? null, snippet: r.body.slice(0, 200) })),
        summary,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Search failed.';
      return { error: msg };
    }
  });
  handlers.set('post-rules', async (args: ToolArgs) => {
    const creds = await loadCredentialsWithRefresh();
    if (!creds?.access_token) return { error: AUTH_REQUIRED_MSG };
    // Auto-detect Compass project from local config when not provided
    let projectId = typeof args.project_id === 'string' ? args.project_id : undefined;
    if (!projectId) {
      try {
        const projConfig = getProjectConfig({ warnIfMissing: false });
        if (projConfig.compassProjectId) projectId = projConfig.compassProjectId;
      } catch { /* ignore */ }
    }
    const payload: RuleInsert = {
      kind: (args.kind as RuleKind) ?? 'rule',
      title: (args.title as string) ?? 'Untitled',
      description: (args.description as string) ?? '',
      body: (args.body as string) ?? '',
      context: (args.context as string) || undefined,
      examples: Array.isArray(args.examples) ? (args.examples as string[]) : undefined,
      technologies: Array.isArray(args.technologies) ? (args.technologies as string[]) : undefined,
      project_id: projectId,
      visibility: projectId ? 'public' : (args.visibility === 'public' ? 'public' : 'private'),
      special_file_target: typeof args.special_file_target === 'string' ? args.special_file_target : undefined,
      version: '1.0.0',
    };
    try {
      const created = await insertRule(payload);
      return { id: created.id, title: created.title, success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to publish rule.';
      return { error: msg };
    }
  });
handlers.set('get-rule', async (args: ToolArgs) => {
    const id = args.id as string;
    if (!id) return { error: 'id is required' };
    const kind = args.kind as RuleKind | undefined;
    try {
      const rule = await getRuleById(id);
      if (!rule) {
        return { error: `Rule or solution with ID ${id} not found.` };
      }
      if (kind && rule.kind !== kind) {
        return { error: `Rule with ID ${id} is a ${rule.kind}, not a ${kind}.` };
      }
      return {
        id: rule.id,
        kind: rule.kind,
        title: rule.title,
        description: rule.description,
        body: rule.body,
        context: rule.context ?? null,
        examples: rule.examples ?? [],
        technologies: rule.technologies ?? [],
        globs: rule.globs ?? null,
        always_apply: rule.always_apply ?? false,
        author: rule.author_display_name ?? null,
        created_at: rule.created_at,
        updated_at: rule.updated_at,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to get rule.';
      return { error: msg };
    }
  });
  handlers.set('list-rules', async (args: ToolArgs) => {
    const kind = args.kind as RuleKind | undefined;
    const limit = (args.limit as number) ?? 50;
    try {
      const list = await fetchRules(kind);
      const limited = list.slice(0, limit);
      const summary =
        list.length === 0
          ? 'No rules found.'
          : limited.length < list.length
            ? `Listed ${limited.length} of ${list.length} rule(s).`
            : `Found ${list.length} rule(s).`;
      return {
        rules: limited.map((r) => ({
          id: r.id,
          title: r.title,
          kind: r.kind,
          description: r.description,
          author: r.author_display_name ?? null,
          snippet: r.body.slice(0, 200),
          created_at: r.created_at,
        })),
        total: list.length,
        returned: limited.length,
        summary,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to list rules.';
      return { error: msg };
    }
  });
  handlers.set('update-rule', async (args: ToolArgs) => {
    if (!(await loadCredentialsWithRefresh())?.access_token) return { error: AUTH_REQUIRED_MSG };
    const id = args.id as string;
    if (!id) return { error: 'id is required' };
    const updates: Partial<RuleInsert> = {};
    if (args.title !== undefined) updates.title = args.title as string;
    if (args.description !== undefined) updates.description = args.description as string;
    if (args.body !== undefined) updates.body = args.body as string;
    if (args.context !== undefined) updates.context = (args.context as string) || undefined;
    if (Array.isArray(args.examples)) updates.examples = args.examples as string[];
    if (Array.isArray(args.technologies)) updates.technologies = args.technologies as string[];
    if (args.globs !== undefined) updates.globs = (args.globs as string) || null;
    if (args.always_apply !== undefined) updates.always_apply = Boolean(args.always_apply);
    try {
      const existing = await getRuleById(id);
      if (existing) updates.version = bumpRuleVersionMajor(existing.version);
      const updated = await updateRule(id, updates);
      return {
        id: updated.id,
        title: updated.title,
        kind: updated.kind,
        success: true,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update rule.';
      return { error: msg };
    }
  });
  handlers.set('delete-rule', async (args: ToolArgs) => {
    if (!(await loadCredentialsWithRefresh())?.access_token) return { error: AUTH_REQUIRED_MSG };
    const id = args.id as string;
    if (!id) return { error: 'id is required' };
    try {
      await deleteRule(id);
      return { success: true, id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete rule.';
      return { error: msg };
    }
  });
  handlers.set('pull-rule', async (args: ToolArgs) => {
    if (!(await loadCredentialsWithRefresh())?.access_token) return { error: AUTH_REQUIRED_MSG };
    const id = args.id as string;
    if (!id) return { error: 'id is required' };
    const global = Boolean(args.global);
    const outputPath = typeof args.output_path === 'string' ? args.output_path : undefined;
    try {
      const filePath = await pullRuleToFile(id, { global, outputPath });
      return { success: true, file_path: filePath, id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to pull rule.';
      return { error: msg };
    }
  });
handlers.set('pull-group', async (args: ToolArgs) => {
    if (!(await loadCredentialsWithRefresh())?.access_token) return { error: AUTH_REQUIRED_MSG };
    const id = args.id as string;
    if (!id) return { error: 'id is required' };
    const global = Boolean(args.global);
    const outputPath = typeof args.output_path === 'string' ? args.output_path : undefined;
    try {
      const group = await getRuleGroupById(id);
      if (!group) return { error: `Group with ID ${id} not found.` };
      const rules = await fetchRulesByGroupId(id);
      if (rules.length === 0) return { success: true, group_title: group.title, pulled: [], message: 'No rules in this group.' };
      const pulled: string[] = [];
      for (const rule of rules) {
        try {
          await pullRuleToFile(rule.id, { global, outputPath });
          pulled.push(rule.title);
        } catch {
          // skip individual failures
        }
      }
      return { success: true, group_title: group.title, pulled, total: rules.length };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to pull group.' };
    }
  });

  return {
    async connect() {
      // Stdio listener already attached; keep process alive
    },
  };
}

export const startMcpServer = async (): Promise<void> => {
  getProjectConfig({ warnIfMissing: true });
  const server = createStdioServer();
  await server.connect();
  // Do not exit when not logged in: Cursor needs the process alive to complete
  // the MCP handshake. Tools return an auth message (run bitcompass login, then restart MCP) when needed.
};
