import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { SKILL_CONTENT, CLAUDE_MD_BLOCK, MNEMO_BLOCK_MARKER as CLAUDE_MARKER } from '../integrations/agents/claude.js';
import { AGENTS_MD_BLOCK, MNEMO_BLOCK_MARKER as CODEX_MARKER } from '../integrations/agents/codex.js';
import { COPILOT_INSTRUCTIONS_BLOCK, MNEMO_BLOCK_MARKER as COPILOT_MARKER } from '../integrations/agents/copilot.js';
import { CURSOR_RULES_BLOCK, MNEMO_BLOCK_MARKER as CURSOR_MARKER } from '../integrations/agents/cursor.js';
import { MnemoError, handleError } from '../core/error.js';

const SUPPORTED_AGENTS = ['claude', 'codex', 'copilot', 'cursor'] as const;

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
					default:
						throw new MnemoError(`Unknown agent "${agent}". Supported: ${SUPPORTED_AGENTS.join(', ')}`);
				}
			} catch (e) {
				handleError(e);
			}
		});
}

async function installClaude(): Promise<void> {
	const skillDir = join(homedir(), '.claude', 'skills');
	const skillPath = join(skillDir, 'mnemo.md');
	const claudeMdPath = join(process.cwd(), 'CLAUDE.md');

	await mkdir(skillDir, { recursive: true });
	await writeFile(skillPath, SKILL_CONTENT, 'utf-8');
	console.log(`Created: ${skillPath}`);

	await appendToFile(claudeMdPath, CLAUDE_MD_BLOCK, CLAUDE_MARKER);
}

async function installCodex(): Promise<void> {
	const agentsMdPath = join(process.cwd(), 'AGENTS.md');
	await appendToFile(agentsMdPath, AGENTS_MD_BLOCK, CODEX_MARKER);
}

async function installCopilot(): Promise<void> {
	const dir = join(process.cwd(), '.github');
	await mkdir(dir, { recursive: true });
	const filePath = join(dir, 'copilot-instructions.md');
	await appendToFile(filePath, COPILOT_INSTRUCTIONS_BLOCK, COPILOT_MARKER);
}

async function installCursor(): Promise<void> {
	const filePath = join(process.cwd(), '.cursorrules');
	await appendToFile(filePath, CURSOR_RULES_BLOCK, CURSOR_MARKER);
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
