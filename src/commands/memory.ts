import { Command } from 'commander';
import { resolveProjectId, assertInitialized } from '../core/project.js';
import { getPaths, getUserMemoryPath } from '../core/paths.js';
import { addMemory, listMemories, removeMemory, searchMemories } from '../core/memory/store.js';
import { handleError, MnemoError } from '../core/error.js';

async function resolveFilePath(scope: 'project' | 'user'): Promise<string> {
	if (scope === 'user') return getUserMemoryPath();
	const projectId = await resolveProjectId(process.cwd());
	return getPaths(projectId).projectMemoryFile;
}

function formatEntry(e: { id: string; createdAt: number; tags: string[]; text: string; source: string }): void {
	const date = new Date(e.createdAt).toISOString().slice(0, 10);
	const tags = e.tags.length > 0 ? `  [${e.tags.join(', ')}]` : '';
	const source = e.source !== 'manual' ? `  (${e.source})` : '';
	console.log(`${e.id}  ${date}${tags}${source}`);
	console.log(`  ${e.text}\n`);
}

export function createMemoryCommand(): Command {
	const memory = new Command('memory').description('Manage project and user memories');

	memory
		.command('add <text>')
		.description('Add a memory entry to project (default) or user scope')
		.option('--project', 'Store as project-scoped memory (default)')
		.option('--user', 'Store as user/global memory (cross-project, cross-agent)')
		.option('--tag <tags>', 'Comma-separated tags')
		.option('--source <source>', 'Source label (e.g. feat:payment-flow)', 'manual')
		.action(async (text: string, opts: { project?: boolean; user?: boolean; tag?: string; source: string }) => {
			try {
				const scope: 'project' | 'user' = opts.user ? 'user' : 'project';
				if (scope === 'project') {
					const projectId = await resolveProjectId(process.cwd());
					await assertInitialized(projectId);
				}
				const filePath = await resolveFilePath(scope);
				const tags = opts.tag ? opts.tag.split(',').map((t) => t.trim()).filter(Boolean) : [];
				const entry = await addMemory(filePath, { text, tags, source: opts.source });
				const label = scope === 'user' ? 'user' : 'project';
				console.log(`Memory added [${label}]: ${entry.id}`);
				console.log(`  "${text.slice(0, 80)}${text.length > 80 ? '…' : ''}"`);
				if (tags.length > 0) console.log(`  Tags: ${tags.join(', ')}`);
			} catch (e) {
				handleError(e);
			}
		});

	memory
		.command('list')
		.description('List memory entries (both scopes if no flag given)')
		.option('--project', 'Show only project memories')
		.option('--user', 'Show only user memories')
		.action(async (opts: { project?: boolean; user?: boolean }) => {
			try {
				const showUser = opts.user || (!opts.project && !opts.user);
				const showProject = opts.project || (!opts.project && !opts.user);
				let printed = false;

				if (showUser) {
					const entries = await listMemories(getUserMemoryPath());
					if (entries.length > 0) {
						console.log('## User Memory (cross-project, cross-agent)\n');
						entries.forEach(formatEntry);
						printed = true;
					} else if (opts.user) {
						console.log('No user memories yet. Add one with: mnemo memory add --user "<insight>"');
					}
				}

				if (showProject) {
					const projectId = await resolveProjectId(process.cwd());
					const filePath = getPaths(projectId).projectMemoryFile;
					const entries = await listMemories(filePath);
					if (entries.length > 0) {
						console.log('## Project Memory\n');
						entries.forEach(formatEntry);
						printed = true;
					} else if (opts.project) {
						console.log('No project memories yet. Add one with: mnemo memory add --project "<insight>"');
					}
				}

				if (!printed && !opts.project && !opts.user) {
					console.log('No memories yet.');
					console.log('  mnemo memory add --project "<architectural insight>"');
					console.log('  mnemo memory add --user "<personal preference or pattern>"');
				}
			} catch (e) {
				handleError(e);
			}
		});

	memory
		.command('remove <id>')
		.description('Remove a memory entry by ID')
		.option('--project', 'Remove from project memory (default)')
		.option('--user', 'Remove from user memory')
		.action(async (id: string, opts: { project?: boolean; user?: boolean }) => {
			try {
				const scope: 'project' | 'user' = opts.user ? 'user' : 'project';
				const filePath = await resolveFilePath(scope);
				const removed = await removeMemory(filePath, id);
				if (!removed) throw new MnemoError(`Memory entry "${id}" not found in ${scope} memory.`);
				console.log(`Memory removed: ${id}`);
			} catch (e) {
				handleError(e);
			}
		});

	memory
		.command('search <query>')
		.description('Search memory entries by keyword (both scopes if no flag given)')
		.option('--project', 'Search only project memory')
		.option('--user', 'Search only user memory')
		.action(async (query: string, opts: { project?: boolean; user?: boolean }) => {
			try {
				const searchUser = opts.user || (!opts.project && !opts.user);
				const searchProject = opts.project || (!opts.project && !opts.user);
				let found = false;

				if (searchUser) {
					const results = await searchMemories(getUserMemoryPath(), query);
					if (results.length > 0) {
						console.log('## User Memory\n');
						results.forEach(formatEntry);
						found = true;
					}
				}

				if (searchProject) {
					const projectId = await resolveProjectId(process.cwd());
					const filePath = getPaths(projectId).projectMemoryFile;
					const results = await searchMemories(filePath, query);
					if (results.length > 0) {
						console.log('## Project Memory\n');
						results.forEach(formatEntry);
						found = true;
					}
				}

				if (!found) console.log(`No memories found matching "${query}".`);
			} catch (e) {
				handleError(e);
			}
		});

	return memory;
}
