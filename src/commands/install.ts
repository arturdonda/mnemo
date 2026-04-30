import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { SKILL_CONTENT, CLAUDE_MD_BLOCK, MNEMO_BLOCK_MARKER as CLAUDE_MARKER, configureClaudeCodeMcp } from '../integrations/agents/claude.js';
import { AGENTS_MD_BLOCK, CODEX_SKILL_MD, MNEMO_BLOCK_MARKER as CODEX_MARKER, configureCodexMcp } from '../integrations/agents/codex.js';
import {
	COPILOT_INSTRUCTIONS_BLOCK,
	COPILOT_SKILL_MD,
	MNEMO_BLOCK_MARKER as COPILOT_MARKER,
	configureCopilotMcp,
} from '../integrations/agents/copilot.js';
import {
	CURSOR_RULES_BLOCK,
	CURSOR_RULE_FILE,
	CURSOR_SKILL_MD,
	MNEMO_BLOCK_MARKER as CURSOR_MARKER,
	configureCursorMcp,
} from '../integrations/agents/cursor.js';
import {
	WINDSURF_RULES_BLOCK,
	WINDSURF_SKILL_MD,
	MNEMO_BLOCK_MARKER as WINDSURF_MARKER,
	configureWindsurfMcp,
} from '../integrations/agents/windsurf.js';
import { MnemoError, handleError } from '../core/error.js';

const SUPPORTED_AGENTS = ['claude', 'codex', 'copilot', 'cursor', 'windsurf'] as const;

export function createInstallCommand(): Command {
	return new Command('install')
		.description('Install Mnemo integration for an AI agent')
		.argument('<agent>', `Agent to integrate (${SUPPORTED_AGENTS.join(', ')})`)
		.action(async (agent: string) => {
			try {
				switch (agent) {
					case 'claude':
						await installClaude();
						break;
					case 'codex':
						await installCodex();
						break;
					case 'copilot':
						await installCopilot();
						break;
					case 'cursor':
						await installCursor();
						break;
					case 'windsurf':
						await installWindsurf();
						break;
					default:
						throw new MnemoError(`Unknown agent "${agent}". Supported: ${SUPPORTED_AGENTS.join(', ')}`);
				}
			} catch (e) {
				handleError(e);
			}
		});
}

async function installClaude(): Promise<void> {
	// .claude/skills/mnemo.md — Claude Code native skill format (flat .md file)
	const skillDir = join(process.cwd(), '.claude', 'skills');
	const skillPath = join(skillDir, 'mnemo.md');
	await mkdir(skillDir, { recursive: true });
	const skillExists = existsSync(skillPath);
	await writeFile(skillPath, SKILL_CONTENT, 'utf-8');
	console.log(`${skillExists ? 'Updated' : 'Created'}: ${skillPath}`);

	await appendToFile(join(process.cwd(), 'CLAUDE.md'), CLAUDE_MD_BLOCK, CLAUDE_MARKER);

	// ~/.claude/settings.json — register MCP server so agents can use mnemo without shell permissions
	const mcp = await configureClaudeCodeMcp();
	if (mcp.configured) {
		console.log(`Configured: ${mcp.path} (MCP server registered)`);
		console.log('\nRestart Claude Code for MCP changes to take effect.');
	}
}

async function installCodex(): Promise<void> {
	// AGENTS.md — always-on instructions
	await appendToFile(join(process.cwd(), 'AGENTS.md'), AGENTS_MD_BLOCK, CODEX_MARKER);

	// .agents/skills/mnemo/SKILL.md — cross-agent open standard
	await writeSkillFile(join(process.cwd(), '.agents', 'skills', 'mnemo'), CODEX_SKILL_MD);

	// ~/.codex/config.toml — register MCP server
	const mcp = await configureCodexMcp();
	if (mcp.configured) {
		console.log(`Configured: ${mcp.path} (MCP server registered)`);
	}
}

async function installCopilot(): Promise<void> {
	// .github/copilot-instructions.md — always-on instructions
	const githubDir = join(process.cwd(), '.github');
	await mkdir(githubDir, { recursive: true });
	await appendToFile(join(githubDir, 'copilot-instructions.md'), COPILOT_INSTRUCTIONS_BLOCK, COPILOT_MARKER);

	// .github/skills/mnemo/SKILL.md — GitHub Copilot Agent Skills
	await writeSkillFile(join(githubDir, 'skills', 'mnemo'), COPILOT_SKILL_MD);

	// .vscode/mcp.json — register MCP server for VS Code Copilot Agent mode
	const mcp = await configureCopilotMcp();
	if (mcp.configured) {
		console.log(`Configured: ${mcp.path} (MCP server registered)`);
	}
}

async function installCursor(): Promise<void> {
	// .cursor/rules/mnemo.mdc — Cursor project rules (always applied)
	const cursorRulesDir = join(process.cwd(), '.cursor', 'rules');
	await mkdir(cursorRulesDir, { recursive: true });
	await writeOrSkip(join(cursorRulesDir, 'mnemo.mdc'), CURSOR_RULE_FILE);

	// .cursor/skills/mnemo/SKILL.md — Cursor Agent Skills (invokable)
	await writeSkillFile(join(process.cwd(), '.cursor', 'skills', 'mnemo'), CURSOR_SKILL_MD);

	// .cursorrules — legacy fallback (still read by older Cursor versions)
	await appendToFile(join(process.cwd(), '.cursorrules'), CURSOR_RULES_BLOCK, CURSOR_MARKER);

	// .cursor/mcp.json — register MCP server
	const mcp = await configureCursorMcp();
	if (mcp.configured) {
		console.log(`Configured: ${mcp.path} (MCP server registered)`);
	}
}

async function installWindsurf(): Promise<void> {
	// .windsurfrules — always-on instructions
	await appendToFile(join(process.cwd(), '.windsurfrules'), WINDSURF_RULES_BLOCK, WINDSURF_MARKER);

	// .windsurf/skills/mnemo/SKILL.md — Windsurf Cascade Skills (invokable)
	await writeSkillFile(join(process.cwd(), '.windsurf', 'skills', 'mnemo'), WINDSURF_SKILL_MD);

	// ~/.codeium/windsurf/mcp_config.json — register MCP server
	const mcp = await configureWindsurfMcp();
	if (mcp.configured) {
		console.log(`Configured: ${mcp.path} (MCP server registered)`);
	}
}

async function writeSkillFile(skillDir: string, content: string): Promise<void> {
	const skillPath = join(skillDir, 'SKILL.md');
	await mkdir(skillDir, { recursive: true });
	await writeOrSkip(skillPath, content);
}

async function appendToFile(filePath: string, block: string, marker: string): Promise<void> {
	if (existsSync(filePath)) {
		const existing = await readFile(filePath, 'utf-8');
		if (existing.includes(marker)) {
			console.log(`Already installed: ${filePath} (skipped)`);
			return;
		}
		await writeFile(filePath, existing.trimEnd() + '\n\n' + block, 'utf-8');
	} else {
		await writeFile(filePath, block, 'utf-8');
	}
	console.log(`Updated: ${filePath}`);
}

async function writeOrSkip(filePath: string, content: string): Promise<void> {
	if (existsSync(filePath)) {
		console.log(`Already installed: ${filePath} (skipped)`);
		return;
	}
	await writeFile(filePath, content, 'utf-8');
	console.log(`Created: ${filePath}`);
}
