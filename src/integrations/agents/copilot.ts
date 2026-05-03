import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { XCTX_AGENT_BLOCK, SKILL_MD } from './shared.js';

export { XCTX_BLOCK_MARKER } from './shared.js';

const MCP_SERVER_KEY = 'xctx';

// VS Code Copilot uses "servers" (not "mcpServers") and requires type: "stdio"
export async function configureCopilotMcp(): Promise<{ configured: boolean; path: string }> {
	const vscodeDir = join(process.cwd(), '.vscode');
	const mcpPath = join(vscodeDir, 'mcp.json');

	mkdirSync(vscodeDir, { recursive: true });

	let config: Record<string, unknown> = {};
	try {
		config = JSON.parse(readFileSync(mcpPath, 'utf-8'));
	} catch {
		// file doesn't exist yet
	}

	const servers = (config.servers ?? {}) as Record<string, unknown>;
	if (servers[MCP_SERVER_KEY]) {
		return { configured: false, path: mcpPath };
	}

	servers[MCP_SERVER_KEY] = { type: 'stdio', command: 'xctx', args: ['mcp', 'serve'] };
	config.servers = servers;

	writeFileSync(mcpPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
	return { configured: true, path: mcpPath };
}

export const COPILOT_INSTRUCTIONS_BLOCK = XCTX_AGENT_BLOCK;

// .github/skills/xctx/SKILL.md — GitHub Copilot Agent Skills (2025+)
export const COPILOT_SKILL_MD = SKILL_MD;
