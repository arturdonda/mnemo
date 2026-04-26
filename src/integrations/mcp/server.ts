import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('../../../package.json') as { version: string };

export function createMcpServer(): McpServer {
	return new McpServer({ name: 'mnemo', version });
}

export async function serveStdio(server: McpServer): Promise<void> {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}
