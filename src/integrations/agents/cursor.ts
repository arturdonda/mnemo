import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { XCTX_AGENT_BLOCK, SKILL_MD } from './shared.js';

export { XCTX_BLOCK_MARKER } from './shared.js';

const MCP_SERVER_KEY = 'xctx';

export async function configureCursorMcp(): Promise<{ configured: boolean; path: string }> {
	const cursorDir = join(process.cwd(), '.cursor');
	const mcpPath = join(cursorDir, 'mcp.json');

	mkdirSync(cursorDir, { recursive: true });

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

// .cursor/rules/xctx.mdc — Cursor project rules (always applied)
export const CURSOR_RULES_BLOCK = XCTX_AGENT_BLOCK;

export const CURSOR_RULE_FILE = `---
description: Cross Context codebase memory — persistent context across AI sessions
globs:
alwaysApply: true
---

${XCTX_AGENT_BLOCK}`;

// .cursor/skills/xctx/SKILL.md — Cursor Agent Skills (invokable)
export const CURSOR_SKILL_MD = SKILL_MD;
