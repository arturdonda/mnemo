import { Command } from 'commander';
import { createInterface } from 'node:readline';
import { simpleGit } from 'simple-git';
import fg from 'fast-glob';
import { resolveProjectId, assertInitialized } from '../core/project.js';
import { indexFiles } from '../core/index/pipeline.js';
import { indexGraphFiles } from '../core/graph/pipeline.js';
import { handleError } from '../core/error.js';

const SOURCE_EXTENSIONS = ['ts', 'tsx', 'js', 'mjs', 'jsx', 'py', 'go', 'rs', 'java', 'cs', 'rb', 'php', 'swift', 'kt', 'md', 'json', 'yaml', 'yml'];

export function createUpdateCommand(): Command {
	return new Command('update')
		.description('Index or re-index the project codebase')
		.option('--since <commit>', 'Only re-index files changed since this commit')
		.option('--files-from-stdin', 'Read file list from stdin (used by git hook)')
		.option('--silent', 'Suppress output')
		.action(async (opts: { since?: string; filesFromStdin?: boolean; silent?: boolean }) => {
			try {
				const cwd = process.cwd();
				const projectId = await resolveProjectId(cwd);
				await assertInitialized(projectId);

				let filePaths: string[];

				if (opts.filesFromStdin) {
					filePaths = await readFilesFromStdin(cwd);
				} else if (opts.since) {
					filePaths = await getFilesSinceCommit(cwd, opts.since);
				} else {
					filePaths = await discoverFiles(cwd);
				}

				if (!opts.silent) {
					console.log(`Indexing ${filePaths.length} file(s)...`);
				}

				const [stats, graphStats] = await Promise.all([
					indexFiles(filePaths, projectId),
					indexGraphFiles(filePaths, projectId),
				]);

				if (!opts.silent) {
					console.log(`Done. ${stats.filesIndexed} files, ${stats.chunksCreated} chunks (${stats.durationMs}ms)`);
					console.log(`Graph: ${graphStats.filesIndexed} files indexed (${graphStats.durationMs}ms)`);
				}
			} catch (e) {
				handleError(e);
			}
		});
}

async function discoverFiles(cwd: string): Promise<string[]> {
	const pattern = `**/*.{${SOURCE_EXTENSIONS.join(',')}}`;
	const files = await fg(pattern, {
		cwd,
		absolute: true,
		ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/.mnemo/**'],
	});
	return files;
}

async function getFilesSinceCommit(cwd: string, since: string): Promise<string[]> {
	const git = simpleGit(cwd);
	const diff = await git.diff(['--name-only', since, 'HEAD']);
	const relPaths = diff.split('\n').filter(Boolean);
	const ext = new Set(SOURCE_EXTENSIONS);
	return relPaths
		.filter((p) => ext.has(p.split('.').pop() ?? ''))
		.map((p) => `${cwd}/${p}`);
}

async function readFilesFromStdin(cwd: string): Promise<string[]> {
	const rl = createInterface({ input: process.stdin });
	const ext = new Set(SOURCE_EXTENSIONS);
	const lines: string[] = [];

	for await (const line of rl) {
		const trimmed = line.trim();
		if (trimmed && ext.has(trimmed.split('.').pop() ?? '')) {
			lines.push(`${cwd}/${trimmed}`);
		}
	}
	return lines;
}
