import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { MNEMO_AGENT_BLOCK, SKILL_MD } from './shared.js';

export { MNEMO_BLOCK_MARKER } from './shared.js';

const MCP_SERVER_KEY = 'mnemo';

// Codex CLI uses TOML (~/.codex/config.toml), no parser needed — append section if absent
export async function configureCodexMcp(): Promise<{ configured: boolean; path: string }> {
	const codexDir = join(homedir(), '.codex');
	const configPath = join(codexDir, 'config.toml');

	mkdirSync(codexDir, { recursive: true });

	let content = '';
	try {
		content = readFileSync(configPath, 'utf-8');
	} catch {
		// file doesn't exist yet
	}

	const sectionKey = `[mcp_servers.${MCP_SERVER_KEY}]`;
	if (content.includes(sectionKey)) {
		return { configured: false, path: configPath };
	}

	const section = `\n[mcp_servers.${MCP_SERVER_KEY}]\ncommand = "mnemo"\nargs = ["mcp", "serve"]\n`;
	writeFileSync(configPath, content.trimEnd() + section, 'utf-8');
	return { configured: true, path: configPath };
}

// AGENTS.md — always-on instructions
export const AGENTS_MD_BLOCK = MNEMO_AGENT_BLOCK;

// .agents/skills/mnemo/SKILL.md — cross-agent open standard
export const CODEX_SKILL_MD = SKILL_MD;
