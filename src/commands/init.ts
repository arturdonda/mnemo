import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolveProjectId, resolveProjectName } from '../core/project.js';
import { ensurePaths } from '../core/paths.js';
import { handleError } from '../core/error.js';

const POST_COMMIT_HOOK = `#!/bin/sh
# xctx: re-index changed files and auto-switch feat by branch
changed=$(git diff --name-only HEAD~1 HEAD 2>/dev/null)
if [ -n "$changed" ]; then
  echo "$changed" | xctx update --files-from-stdin --silent 2>/dev/null || true
fi
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ -n "$branch" ]; then
  xctx feat switch-by-branch "$branch" --silent 2>/dev/null || true
fi
`;

export function createInitCommand(): Command {
	return new Command('init')
		.description('Initialize Cross Context for this project')
		.action(async () => {
			try {
				const cwd = process.cwd();
				const projectId = await resolveProjectId(cwd);
				const projectName = await resolveProjectName(cwd);
				const paths = await ensurePaths(projectId);

				const meta = { id: projectId, name: projectName, path: cwd, createdAt: Date.now() };
				await writeFile(paths.projectMeta, JSON.stringify(meta, null, 2), 'utf-8');

				const hookInstalled = await installGitHook(cwd);
				const isFirstEver = isFirstTimeInit();

				console.log(`✓ Cross Context initialized (project: ${projectName})`);
				if (hookInstalled) console.log('✓ Git hook installed');

				if (isFirstEver) {
					console.log(`
Next steps:
  xctx update              — index this codebase
  xctx feat start <name>   — start tracking a feature
  xctx install claude      — wire up Claude Code

Run \`xctx --help\` for all commands.`);
				}
			} catch (e) {
				handleError(e);
			}
		});
}

async function installGitHook(cwd: string): Promise<boolean> {
	const hooksDir = join(cwd, '.git', 'hooks');
	if (!existsSync(hooksDir)) return false;

	const hookPath = join(hooksDir, 'post-commit');
	if (existsSync(hookPath)) {
		const existing = await import('node:fs/promises').then((m) => m.readFile(hookPath, 'utf-8'));
		if (existing.includes('xctx')) return false;
		await import('node:fs/promises').then((m) =>
			m.writeFile(hookPath, existing.trimEnd() + '\n' + POST_COMMIT_HOOK, 'utf-8'),
		);
	} else {
		await writeFile(hookPath, POST_COMMIT_HOOK, { mode: 0o755 });
	}

	return true;
}

function isFirstTimeInit(): boolean {
	const xctxRoot = join(homedir(), '.xctx', 'projects');
	try {
		return readdirSync(xctxRoot).length <= 1;
	} catch {
		return true;
	}
}
