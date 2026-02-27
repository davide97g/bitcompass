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
  fetchActivityLogs,
  getActivityLogById,
} from '../api/client.js';
import { buildAndPushActivityLog } from '../commands/log.js';
import { loadCredentials } from '../auth/config.js';
import { getProjectConfig } from '../auth/project-config.js';
import { pullRuleToFile } from '../lib/rule-file-ops.js';
import type { RuleInsert, RuleKind } from '../types.js';
import type { TimeFrame } from '../lib/git-analysis.js';

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
        const hasToken = Boolean(loadCredentials()?.access_token);
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
                  },
                  required: ['kind', 'title', 'body'],
                },
              },
              {
                name: 'create-activity-log',
                description:
                  "Use when the user wants to record their repo activity (commits, files changed) for a time period. Ask for time_frame: day, week, or month. Requires a git repo at repo_path (default: cwd). Returns success and log id, or an error if not a git repo or auth missing.",
                inputSchema: {
                  type: 'object',
                  properties: {
                    time_frame: { type: 'string', enum: ['day', 'week', 'month'], description: 'Time period for the activity log' },
                    repo_path: { type: 'string', description: 'Path to the git repo (e.g. workspace root). If omitted, uses current working directory.' },
                  },
                  required: ['time_frame'],
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
                  'Use when the user wants to install a rule or solution into their project (e.g. "pull this rule to my project"). Writes the rule to the project rules directory or optional output_path; global installs to ~/.cursor/rules/. Returns the file path written or an error.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Rule/solution ID to pull' },
                    output_path: { type: 'string', description: 'Optional: custom output path' },
                    global: { type: 'boolean', description: 'Install globally to ~/.cursor/rules/' },
                  },
                  required: ['id'],
                },
              },
              {
                name: 'list-activity-logs',
                description:
                  "Use when the user wants to see their past activity logs (e.g. 'show my logs', 'list activity'). Optional limit and time_frame (day, week, month). Returns an array of logs with id, time_frame, period_start, period_end, created_at.",
                inputSchema: {
                  type: 'object',
                  properties: {
                    limit: { type: 'number', description: 'Optional: maximum number of results (default: 20)' },
                    time_frame: { type: 'string', enum: ['day', 'week', 'month'], description: 'Optional: filter by time frame' },
                  },
                },
              },
              {
                name: 'get-activity-log',
                description:
                  'Use when the user asks for details of a specific activity log by ID. Returns the full log: time_frame, period_start, period_end, repo_summary, git_analysis, created_at.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Activity log ID' },
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
              { name: 'share', title: 'Share something', description: 'Guide to publish a rule, solution, skill, or command. Asks what you\'re sharing, then collects content and publishes.' },
              { name: 'share_new_rule', title: 'Share a new rule', description: 'Guide to collect and publish a reusable rule' },
              { name: 'share_problem_solution', title: 'Share a problem solution', description: 'Guide to collect and publish a problem solution' },
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

Then collect: title, description, body (and optionally context, examples, technologies). Ask one question at a time. Then call post-rules with the chosen kind and the collected fields.`,
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
    const creds = loadCredentials();
    if (!creds?.access_token) return { error: AUTH_REQUIRED_MSG };
    const payload: RuleInsert = {
      kind: (args.kind as RuleKind) ?? 'rule',
      title: (args.title as string) ?? 'Untitled',
      description: (args.description as string) ?? '',
      body: (args.body as string) ?? '',
      context: (args.context as string) || undefined,
      examples: Array.isArray(args.examples) ? (args.examples as string[]) : undefined,
      technologies: Array.isArray(args.technologies) ? (args.technologies as string[]) : undefined,
      project_id: typeof args.project_id === 'string' ? args.project_id : undefined,
    };
    try {
      const created = await insertRule(payload);
      return { id: created.id, title: created.title, success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to publish rule.';
      return { error: msg };
    }
  });
  handlers.set('create-activity-log', async (args: ToolArgs) => {
    if (!loadCredentials()?.access_token) return { error: AUTH_REQUIRED_MSG };
    const timeFrame = (args.time_frame as TimeFrame) ?? 'day';
    if (timeFrame !== 'day' && timeFrame !== 'week' && timeFrame !== 'month') {
      return { error: 'time_frame must be day, week, or month.' };
    }
    const repoPath = typeof args.repo_path === 'string' ? args.repo_path : process.cwd();
    try {
      const result = await buildAndPushActivityLog(timeFrame, repoPath);
      return { success: true, id: result.id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create activity log.';
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
    if (!loadCredentials()?.access_token) return { error: AUTH_REQUIRED_MSG };
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
    if (!loadCredentials()?.access_token) return { error: AUTH_REQUIRED_MSG };
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
    if (!loadCredentials()?.access_token) return { error: AUTH_REQUIRED_MSG };
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
  handlers.set('list-activity-logs', async (args: ToolArgs) => {
    if (!loadCredentials()?.access_token) return { error: AUTH_REQUIRED_MSG };
    const limit = (args.limit as number) ?? 20;
    const timeFrame = args.time_frame as 'day' | 'week' | 'month' | undefined;
    try {
      const logs = await fetchActivityLogs({ limit, time_frame: timeFrame });
      const summary =
        logs.length === 0 ? 'No activity logs found.' : `Found ${logs.length} activity log(s).`;
      return {
        logs: logs.map((log) => ({
          id: log.id,
          time_frame: log.time_frame,
          period_start: log.period_start,
          period_end: log.period_end,
          created_at: log.created_at,
        })),
        total: logs.length,
        summary,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to list activity logs.';
      return { error: msg };
    }
  });
  handlers.set('get-activity-log', async (args: ToolArgs) => {
    if (!loadCredentials()?.access_token) return { error: AUTH_REQUIRED_MSG };
    const id = args.id as string;
    if (!id) return { error: 'id is required' };
    try {
      const log = await getActivityLogById(id);
      if (!log) {
        return { error: `Activity log with ID ${id} not found.` };
      }
      return {
        id: log.id,
        time_frame: log.time_frame,
        period_start: log.period_start,
        period_end: log.period_end,
        repo_summary: log.repo_summary,
        git_analysis: log.git_analysis,
        created_at: log.created_at,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to get activity log.';
      return { error: msg };
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
