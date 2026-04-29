import { expect, test, type APIRequestContext } from '@playwright/test';
import { truncateTasks } from './helpers/db';

const ENDPOINT = '/api/mcp';
const HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

let nextId = 1;
function rpc(method: string, params: unknown) {
  return { jsonrpc: '2.0', id: nextId++, method, params };
}

type CallToolResultPayload = {
  result: {
    isError?: boolean;
    content: Array<{ type: 'text'; text: string }>;
  };
};

type ToolsListPayload = {
  result: { tools: Array<{ name: string }> };
};

async function call<T>(request: APIRequestContext, body: unknown): Promise<T> {
  const res = await request.post(ENDPOINT, { headers: HEADERS, data: body });
  expect(res.status()).toBe(200);
  return (await res.json()) as T;
}

async function callTool(request: APIRequestContext, name: string, args: Record<string, unknown>) {
  return call<CallToolResultPayload>(request, rpc('tools/call', { name, arguments: args }));
}

function parseToolText<T = unknown>(payload: CallToolResultPayload): T {
  return JSON.parse(payload.result.content[0].text) as T;
}

test.describe('MCP /api/mcp', () => {
  test.beforeEach(async () => {
    await truncateTasks();
  });

  test.afterEach(async () => {
    await truncateTasks();
  });

  test('tools/list 응답에 5개 도구가 모두 들어있다', async ({ request }) => {
    const body = await call<ToolsListPayload>(request, rpc('tools/list', {}));
    const names = body.result.tools.map((t) => t.name).sort();
    expect(names).toEqual(['create_task', 'delete_task', 'get_task', 'list_tasks', 'update_task']);
  });

  test('create_task → get_task 가 같은 행을 돌려준다', async ({ request }) => {
    const created = await callTool(request, 'create_task', { title: 'mcp-test' });
    const createdRow = parseToolText<{ id: string; title: string }>(created);
    expect(createdRow.title).toBe('mcp-test');

    const got = await callTool(request, 'get_task', { id: createdRow.id });
    const gotRow = parseToolText<{ id: string; title: string }>(got);
    expect(gotRow.id).toBe(createdRow.id);
    expect(gotRow.title).toBe('mcp-test');

    await callTool(request, 'delete_task', { id: createdRow.id });
  });

  test('update_task progress=100 → get_task status==="done"', async ({ request }) => {
    const created = await callTool(request, 'create_task', { title: 'mcp-test-progress' });
    const id = parseToolText<{ id: string }>(created).id;

    await callTool(request, 'update_task', { id, progress: 100 });

    const got = await callTool(request, 'get_task', { id });
    const row = parseToolText<{ status: string; progress: number }>(got);
    expect(row.status).toBe('done');
    expect(row.progress).toBe(100);

    await callTool(request, 'delete_task', { id });
  });

  test('delete_task 후 get_task 는 "Task not found" 에러를 반환한다', async ({ request }) => {
    const created = await callTool(request, 'create_task', { title: 'mcp-test-delete' });
    const id = parseToolText<{ id: string }>(created).id;

    await callTool(request, 'delete_task', { id });

    const got = await callTool(request, 'get_task', { id });
    expect(got.result.isError).toBe(true);
    expect(got.result.content[0].text).toBe('Task not found');
  });
});
