import { AUTH_REQUIRED_MSG, insertRule, searchRules } from '../api/client.js';
import { buildAndPushActivityLog } from '../commands/log.js';
import { loadCredentials } from '../auth/config.js';
import { getProjectConfig } from '../auth/project-config.js';
import type { RuleInsert } from '../types.js';
import type { TimeFrame } from '../lib/git-analysis.js';

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
            serverInfo: { name: 'bitcompass', version: '0.1.0' },
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
                description: 'Search BitCompass rules by query',
                inputSchema: {
                  type: 'object',
                  properties: { query: { type: 'string' }, kind: { type: 'string', enum: ['rule', 'solution'] }, limit: { type: 'number' } },
                  required: ['query'],
                },
              },
              {
                name: 'search-solutions',
                description: 'Search BitCompass solutions by query',
                inputSchema: {
                  type: 'object',
                  properties: { query: { type: 'string' }, limit: { type: 'number' } },
                  required: ['query'],
                },
              },
              {
                name: 'post-rules',
                description: 'Publish a new rule or solution to BitCompass',
                inputSchema: {
                  type: 'object',
                  properties: {
                    kind: { type: 'string', enum: ['rule', 'solution'] },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    body: { type: 'string' },
                    context: { type: 'string' },
                    examples: { type: 'array', items: { type: 'string' } },
                    technologies: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['kind', 'title', 'body'],
                },
              },
              {
                name: 'create-activity-log',
                description: "Collect a summary of the repository and git activity for the chosen period, then push the log to the user's private activity logs. Requires a git repository; if repo_path is not a git repo, returns an error. Ask the user which time frame they want: day, week, or month.",
                inputSchema: {
                  type: 'object',
                  properties: {
                    time_frame: { type: 'string', enum: ['day', 'week', 'month'], description: 'Time period for the activity log' },
                    repo_path: { type: 'string', description: 'Path to the git repo (e.g. workspace root). If omitted, uses current working directory.' },
                  },
                  required: ['time_frame'],
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
    const kind = args.kind as 'rule' | 'solution' | undefined;
    const limit = (args.limit as number) ?? 20;
    try {
      const list = await searchRules(query, { kind, limit });
      return { rules: list.map((r) => ({ id: r.id, title: r.title, kind: r.kind, author: r.author_display_name ?? null, snippet: r.body.slice(0, 200) })) };
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
      return { solutions: list.map((r) => ({ id: r.id, title: r.title, author: r.author_display_name ?? null, snippet: r.body.slice(0, 200) })) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Search failed.';
      return { error: msg };
    }
  });
  handlers.set('post-rules', async (args: ToolArgs) => {
    const creds = loadCredentials();
    if (!creds?.access_token) return { error: AUTH_REQUIRED_MSG };
    const payload: RuleInsert = {
      kind: (args.kind as 'rule' | 'solution') ?? 'rule',
      title: (args.title as string) ?? 'Untitled',
      description: (args.description as string) ?? '',
      body: (args.body as string) ?? '',
      context: (args.context as string) || undefined,
      examples: Array.isArray(args.examples) ? (args.examples as string[]) : undefined,
      technologies: Array.isArray(args.technologies) ? (args.technologies as string[]) : undefined,
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
