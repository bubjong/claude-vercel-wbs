import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '@/lib/mcp/server';

export const runtime = 'nodejs';

function disabledResponse(): Response {
  return new Response(JSON.stringify({ error: 'MCP endpoint disabled' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handle(req: Request): Promise<Response> {
  if (process.env.MCP_PUBLIC_ENABLED !== '1') return disabledResponse();
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}

export async function DELETE(req: Request) {
  return handle(req);
}
