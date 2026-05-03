import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { XCTX_AGENT_BLOCK, SKILL_MD } from './shared.js';

export { XCTX_BLOCK_MARKER } from './shared.js';

const MCP_SERVER_KEY = 'xctx';

export async function configureWindsurfMcp(): Promise<{ configured: boolean; path: string }> {
	const windsurfDir = join(homedir(), '.codeium', 'windsurf');
	const mcpPath = join(windsurfDir, 'mcp_config.json');

	mkdirSync(windsurfDir, { recursive: true });

	let config: Record<string, unknown> = {};
	try {
		config = JSON.parse(readFileSync(mcpPath, 'utf-8'));
	} catch {
		// file doesn't exist yet
	}

	const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;
	if (mcpServers[MCP_SERVER_KEY]) {
		return { configured: false, path: mcpPath };
	}

	mcpServers[MCP_SERVER_KEY] = { command: 'xctx', args: ['mcp', 'serve'] };
	config.mcpServers = mcpServers;

	writeFileSync(mcpPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
	return { configured: true, path: mcpPath };
}

// .windsurfrules — always-on instructions (root of project)
export const WINDSURF_RULES_BLOCK = XCTX_AGENT_BLOCK;

// .windsurf/skills/xctx/SKILL.md — Windsurf Cascade Skills (invokable)
export const WINDSURF_SKILL_MD = SKILL_MD;
