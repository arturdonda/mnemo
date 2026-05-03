import { Command } from 'commander';
import { createMcpServer, serveStdio } from '../integrations/mcp/server.js';
import { handleError } from '../core/error.js';

export function createMcpCommand(): Command {
	const mcp = new Command('mcp').description('MCP server integration');

	mcp
		.command('serve')
		.description('Start the Cross Context MCP server (stdio transport by default)')
		.action(async () => {
			try {
				const server = createMcpServer();
				await serveStdio(server);
			} catch (e) {
				handleError(e);
			}
		});

	return mcp;
}
