import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createRequire } from 'node:module';
import { registerFeatTools } from './tools/feat.js';
import { registerSearchTools } from './tools/search.js';

const require = createRequire(import.meta.url);
const { version } = require('../../../package.json') as { version: string };

export function createMcpServer(): McpServer {
	const server = new McpServer({ name: 'mnemo', version });
	registerFeatTools(server);
	registerSearchTools(server);
	return server;
}

export async function serveStdio(server: McpServer): Promise<void> {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}
