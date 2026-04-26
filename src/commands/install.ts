import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { SKILL_CONTENT, CLAUDE_MD_BLOCK, MNEMO_BLOCK_MARKER } from '../integrations/agents/claude.js';
import { MnemoError, handleError } from '../core/error.js';

export function createInstallCommand(): Command {
	return new Command('install')
		.description('Install Mnemo integration for an AI agent')
		.argument('<agent>', 'Agent to integrate (claude)')
		.action(async (agent: string) => {
			try {
				if (agent !== 'claude') {
					throw new MnemoError(`Unknown agent "${agent}". Supported: claude`);
				}
				await installClaude();
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

	await appendClaudeMd(claudeMdPath);
}

async function appendClaudeMd(filePath: string): Promise<void> {
	if (existsSync(filePath)) {
		const existing = await readFile(filePath, 'utf-8');
		if (existing.includes(MNEMO_BLOCK_MARKER)) {
			console.log(`Already installed: ${filePath} (skipped)`);
			return;
		}
		await writeFile(filePath, existing.trimEnd() + '\n\n' + CLAUDE_MD_BLOCK, 'utf-8');
	} else {
		await writeFile(filePath, CLAUDE_MD_BLOCK, 'utf-8');
	}
	console.log(`Updated: ${filePath}`);
}
