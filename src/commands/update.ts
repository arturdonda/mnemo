import { Command } from 'commander';
import { createInterface } from 'node:readline';
import { simpleGit } from 'simple-git';
import fg from 'fast-glob';
import { resolveProjectId, assertInitialized } from '../core/project.js';
import { indexFiles, computeIndexDiff, deleteFilesFromIndex } from '../core/index/pipeline.js';
import { indexGraphFiles, detectProjectRoot } from '../core/graph/pipeline.js';
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
				const [projectId, projectRoot] = await Promise.all([
					resolveProjectId(cwd),
					detectProjectRoot(cwd),
				]);
				await assertInitialized(projectId);

				let filePaths: string[];

				if (opts.filesFromStdin) {
					filePaths = await readFilesFromStdin(cwd);
				} else if (opts.since) {
					filePaths = await getFilesSinceCommit(cwd, opts.since);
				} else {
					filePaths = await discoverFiles(cwd);
				}

				const isTTY = !opts.silent && process.stdout.isTTY;
				const makeProgress = (): ((done: number, total: number) => void) => {
					let lastPct = -1;
					return (done: number, total: number): void => {
						if (!isTTY) return;
						const pct = Math.min(100, Math.floor((done / total) * 100));
						if (pct !== lastPct) {
							lastPct = pct;
							const bar = '='.repeat(Math.floor(pct / 5)).padEnd(20, ' ');
							process.stdout.write(`\r[${bar}] ${pct}% (${done}/${total} files)`);
						}
					};
				};

				// Incremental diff: only when doing a full scan (not --since / --files-from-stdin)
				const useIncremental = !opts.since && !opts.filesFromStdin;
				let filesToIndex = filePaths;

				if (useIncremental) {
					if (!opts.silent) process.stdout.write(`Checking ${filePaths.length} files...\n`);
					const diff = await computeIndexDiff(filePaths, projectId);

					if (diff.toDelete.length > 0) {
						await deleteFilesFromIndex(diff.toDelete, projectId);
						if (!opts.silent) console.log(`Removed ${diff.toDelete.length} deleted file(s) from index.`);
					}

					if (diff.toIndex.length === 0) {
						if (!opts.silent) console.log(`Semantic index is up to date (${diff.unchanged} files unchanged).`);
					} else {
						const deletedNote = diff.toDelete.length > 0 ? `, ${diff.toDelete.length} deleted` : '';
						if (!opts.silent) console.log(`${diff.toIndex.length} changed, ${diff.unchanged} unchanged${deletedNote}`);
					}

					filesToIndex = diff.toIndex;
				}

				if (filesToIndex.length > 0) {
					if (!opts.silent) process.stdout.write(`\nSemantic indexing ${filesToIndex.length} file(s)...\n`);
					const stats = await indexFiles(filesToIndex, projectId, makeProgress(), (chunks) => {
						if (isTTY) process.stdout.write('\n');
						if (!opts.silent) process.stdout.write(`Saving ${chunks} chunks...\n`);
					});
					if (!opts.silent) console.log(`Done. ${stats.filesIndexed} files, ${stats.chunksCreated} chunks (${stats.durationMs}ms)`);
				}

				if (!opts.silent) process.stdout.write(`\nGraph indexing ${filePaths.length} file(s)...\n`);
				const graphStats = await indexGraphFiles(filePaths, projectId, makeProgress(), projectRoot);
				if (isTTY) process.stdout.write('\n');
				if (!opts.silent) {
					if (graphStats.unchanged === filePaths.length) {
						console.log(`Graph index is up to date (${graphStats.unchanged} files unchanged).`);
					} else {
						const unchangedNote = graphStats.unchanged > 0 ? `, ${graphStats.unchanged} unchanged` : '';
						console.log(`Graph: ${graphStats.filesIndexed} indexed${unchangedNote} (${graphStats.durationMs}ms)`);
					}
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
		ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/.xctx/**'],
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
		.map((p) => `${cwd.replace(/\\/g, '/')}/${p}`);
}

async function readFilesFromStdin(cwd: string): Promise<string[]> {
	const rl = createInterface({ input: process.stdin });
	const ext = new Set(SOURCE_EXTENSIONS);
	const lines: string[] = [];

	for await (const line of rl) {
		const trimmed = line.trim();
		if (trimmed && ext.has(trimmed.split('.').pop() ?? '')) {
			lines.push(`${cwd.replace(/\\/g, '/')}/${trimmed}`);
		}
	}
	return lines;
}
