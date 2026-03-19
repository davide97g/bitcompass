/**
 * MCP server tests.
 *
 * Tests the stdio MCP server by spawning the process and exchanging JSON-RPC
 * messages over stdin/stdout. This exercises the real server code path —
 * the only thing mocked is the network (BITCOMPASS_SUPABASE_URL points nowhere
 * and no real API calls are made because we only test unauthenticated flows
 * and structure).
 *
 * For handlers that need auth we verify they return the expected auth-required
 * error shape rather than crashing.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, type ChildProcess } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = join(__dirname, 'mcp-start.ts');

// Helpers ─────────────────────────────────────────────────────────────

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

class McpTestClient {
  private proc: ChildProcess;
  private buffer = '';
  private pending = new Map<number, { resolve: (r: JsonRpcResponse) => void; reject: (e: Error) => void }>();
  private nextId = 1;

  constructor() {
    // Spawn via bun so TS is handled natively
    this.proc = spawn('bun', ['run', SERVER_ENTRY], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Ensure we don't use real credentials during tests
        BITCOMPASS_CONFIG_DIR: join(__dirname, '__test_config_mcp__'),
      },
    });

    this.proc.stdout!.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line) as JsonRpcResponse;
          if (msg.id !== undefined) {
            const p = this.pending.get(msg.id);
            if (p) {
              this.pending.delete(msg.id);
              p.resolve(msg);
            }
          }
        } catch { /* ignore */ }
      }
    });
  }

  send(method: string, params?: unknown): Promise<JsonRpcResponse> {
    const id = this.nextId++;
    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout waiting for response to ${method} (id=${id})`));
      }, 10_000);

      this.pending.set(id, {
        resolve: (r) => { clearTimeout(timeout); resolve(r); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
      });

      const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params });
      this.proc.stdin!.write(msg + '\n');
    });
  }

  kill() {
    this.proc.kill();
  }
}

// Tests ─────────────────────────────────────────────────────────────

describe('MCP server', () => {
  let client: McpTestClient;

  beforeAll(() => {
    client = new McpTestClient();
  });

  afterAll(() => {
    client.kill();
    // Clean up test config dir
    const { rmSync } = require('fs');
    try { rmSync(join(__dirname, '__test_config_mcp__'), { recursive: true, force: true }); } catch {}
  });

  // ── Initialize ──────────────────────────────────────────────────

  test('initialize returns auth error when not logged in', async () => {
    const res = await client.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' },
    });

    // Should return error with auth message (no valid token in test env)
    expect(res.error).toBeDefined();
    expect(res.error!.code).toBe(-32001);
    expect(res.error!.message).toBe('Needs authentication');
    expect((res.error!.data as { instructions?: string })?.instructions).toContain('bitcompass login');
  });

  // ── tools/list ────────────────────────────────────────────────

  test('tools/list returns all expected tools', async () => {
    const res = await client.send('tools/list');
    const result = res.result as { tools: Array<{ name: string }> };
    expect(result).toBeDefined();
    expect(result.tools).toBeArray();

    const toolNames = result.tools.map((t) => t.name);

    // Core tools
    expect(toolNames).toContain('search-rules');
    expect(toolNames).toContain('search-docs');
    expect(toolNames).toContain('post-rules');
    expect(toolNames).toContain('get-rule');
    expect(toolNames).toContain('list-rules');
    expect(toolNames).toContain('update-rule');
    expect(toolNames).toContain('delete-rule');
    expect(toolNames).toContain('pull-rule');
    expect(toolNames).toContain('pull-group');
  });

  test('tools/list tools have inputSchema', async () => {
    const res = await client.send('tools/list');
    const result = res.result as { tools: Array<{ name: string; inputSchema: unknown }> };

    for (const tool of result.tools) {
      expect(tool.inputSchema).toBeDefined();
      expect((tool.inputSchema as { type: string }).type).toBe('object');
    }
  });

  test('search-rules tool has required query parameter', async () => {
    const res = await client.send('tools/list');
    const result = res.result as { tools: Array<{ name: string; inputSchema: { required?: string[] } }> };
    const searchTool = result.tools.find((t) => t.name === 'search-rules');
    expect(searchTool).toBeDefined();
    expect(searchTool!.inputSchema.required).toContain('query');
  });

  test('post-rules tool has required kind, title, body', async () => {
    const res = await client.send('tools/list');
    const result = res.result as { tools: Array<{ name: string; inputSchema: { required?: string[] } }> };
    const postTool = result.tools.find((t) => t.name === 'post-rules');
    expect(postTool).toBeDefined();
    expect(postTool!.inputSchema.required).toContain('kind');
    expect(postTool!.inputSchema.required).toContain('title');
    expect(postTool!.inputSchema.required).toContain('body');
  });

  // ── prompts/list ──────────────────────────────────────────────

  test('prompts/list returns all expected prompts', async () => {
    const res = await client.send('prompts/list');
    const result = res.result as { prompts: Array<{ name: string; description: string }> };
    expect(result).toBeDefined();
    expect(result.prompts).toBeArray();

    const promptNames = result.prompts.map((p) => p.name);

    expect(promptNames).toContain('share');
    expect(promptNames).toContain('share_new_rule');
    expect(promptNames).toContain('share_documentation');
    expect(promptNames).toContain('update');
    expect(promptNames).toContain('pull');
    expect(promptNames).toContain('sync');
  });

  test('prompts have descriptions', async () => {
    const res = await client.send('prompts/list');
    const result = res.result as { prompts: Array<{ name: string; description: string }> };

    for (const prompt of result.prompts) {
      expect(prompt.description).toBeTruthy();
    }
  });

  // ── prompts/get ───────────────────────────────────────────────

  test('prompts/get share returns messages mentioning duplicate check', async () => {
    const res = await client.send('prompts/get', { name: 'share' });
    const result = res.result as { messages: Array<{ role: string; content: { type: string; text: string } }> };
    expect(result.messages).toBeArray();
    expect(result.messages.length).toBeGreaterThan(0);

    const text = result.messages[0].content.text;
    expect(text).toContain('search-rules');
    expect(text).toContain('duplicate');
    expect(text).toContain('pull-rule');
  });

  test('prompts/get update returns messages', async () => {
    const res = await client.send('prompts/get', { name: 'update' });
    const result = res.result as { messages: Array<{ role: string; content: { type: string; text: string } }> };
    expect(result.messages).toBeArray();

    const text = result.messages[0].content.text;
    expect(text).toContain('update-rule');
    expect(text).toContain('get-rule');
  });

  test('prompts/get pull returns messages', async () => {
    const res = await client.send('prompts/get', { name: 'pull' });
    const result = res.result as { messages: Array<{ role: string; content: { type: string; text: string } }> };
    expect(result.messages).toBeArray();

    const text = result.messages[0].content.text;
    expect(text).toContain('pull-rule');
    expect(text).toContain('search-rules');
  });

  test('prompts/get sync returns messages mentioning CLI', async () => {
    const res = await client.send('prompts/get', { name: 'sync' });
    const result = res.result as { messages: Array<{ role: string; content: { type: string; text: string } }> };
    expect(result.messages).toBeArray();

    const text = result.messages[0].content.text;
    expect(text).toContain('bitcompass sync');
    expect(text).toContain('--check');
  });

  test('prompts/get unknown returns error', async () => {
    const res = await client.send('prompts/get', { name: 'nonexistent' });
    expect(res.error).toBeDefined();
    expect(res.error!.message).toBe('Unknown prompt');
  });

  // ── Auth-required tools return auth error ─────────────────────

  test('post-rules returns auth error when not logged in', async () => {
    const res = await client.send('tools/call', {
      name: 'post-rules',
      arguments: { kind: 'rule', title: 'Test', body: 'Test body' },
    });
    const result = res.result as { content: Array<{ text: string }> };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toContain('authentication');
  });

  test('update-rule returns auth error when not logged in', async () => {
    const res = await client.send('tools/call', {
      name: 'update-rule',
      arguments: { id: 'test-id', title: 'Updated' },
    });
    const result = res.result as { content: Array<{ text: string }> };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toContain('authentication');
  });

  test('delete-rule returns auth error when not logged in', async () => {
    const res = await client.send('tools/call', {
      name: 'delete-rule',
      arguments: { id: 'test-id' },
    });
    const result = res.result as { content: Array<{ text: string }> };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toContain('authentication');
  });

  test('pull-rule returns auth error when not logged in', async () => {
    const res = await client.send('tools/call', {
      name: 'pull-rule',
      arguments: { id: 'test-id' },
    });
    const result = res.result as { content: Array<{ text: string }> };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toContain('authentication');
  });

  test('pull-group returns auth error when not logged in', async () => {
    const res = await client.send('tools/call', {
      name: 'pull-group',
      arguments: { id: 'test-id' },
    });
    const result = res.result as { content: Array<{ text: string }> };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toContain('authentication');
  });

  // ── Tool validation ──────────────────────────────────────────

  test('update-rule requires id', async () => {
    // Even if somehow auth passed, missing id should error
    const res = await client.send('tools/call', {
      name: 'update-rule',
      arguments: {},
    });
    const result = res.result as { content: Array<{ text: string }> };
    const parsed = JSON.parse(result.content[0].text);
    // Either auth error or id-required error
    expect(parsed.error).toBeDefined();
  });

  test('delete-rule requires id', async () => {
    const res = await client.send('tools/call', {
      name: 'delete-rule',
      arguments: {},
    });
    const result = res.result as { content: Array<{ text: string }> };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
  });

  test('unknown tool returns error', async () => {
    const res = await client.send('tools/call', {
      name: 'nonexistent-tool',
      arguments: {},
    });
    expect(res.error).toBeDefined();
    expect(res.error!.message).toContain('Unknown tool');
  });

  // ── Unknown method ────────────────────────────────────────────

  test('unknown method returns method not found', async () => {
    const res = await client.send('some/unknown/method');
    expect(res.error).toBeDefined();
    expect(res.error!.message).toBe('Method not found');
  });
});
