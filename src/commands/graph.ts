import { Command } from 'commander';
import { resolve, relative } from 'node:path';
import { simpleGit } from 'simple-git';
import { resolveProjectId, assertInitialized } from '../core/project.js';
import { getPaths } from '../core/paths.js';
import { GraphStore } from '../core/graph/store.js';
import { handleError } from '../core/error.js';

async function openStore(): Promise<{ store: GraphStore; cleanup: () => void }> {
	const projectId = await resolveProjectId(process.cwd());
	await assertInitialized(projectId);
	const paths = getPaths(projectId);
	const store = new GraphStore(paths.graphDb);
	return { store, cleanup: () => store.close() };
}

async function getProjectRoot(): Promise<string> {
	try {
		const git = simpleGit(process.cwd());
		const root = await git.revparse(['--show-toplevel']);
		return root.trim();
	} catch {
		return process.cwd();
	}
}

async function resolveFilePath(filePath: string): Promise<string> {
	// Convert to project-root-relative forward-slash path — matches what the graph store writes.
	const abs = resolve(process.cwd(), filePath);
	const root = await getProjectRoot();
	return relative(root, abs).replace(/\\/g, '/');
}

export function createGraphCommand(): Command {
	const graph = new Command('graph').description('Query the structural dependency graph');

	graph
		.command('deps <file>')
		.description('List files this file imports')
		.action(async (file: string) => {
			try {
				const { store, cleanup } = await openStore();
				try {
					const deps = store.getDeps(await resolveFilePath(file));
					if (deps.length === 0) {
						console.log('No dependencies found.');
					} else {
						for (const d of deps) console.log(d);
					}
				} finally {
					cleanup();
				}
			} catch (e) {
				handleError(e);
			}
		});

	graph
		.command('refs <file>')
		.description('List files that import this file')
		.action(async (file: string) => {
			try {
				const { store, cleanup } = await openStore();
				try {
					const refs = store.getRefs(await resolveFilePath(file));
					if (refs.length === 0) {
						console.log('No references found.');
					} else {
						for (const r of refs) console.log(r);
					}
				} finally {
					cleanup();
				}
			} catch (e) {
				handleError(e);
			}
		});

	graph
		.command('affected <file>')
		.description('List transitive dependents of this file (max depth 3)')
		.option('--depth <n>', 'Max BFS depth', '3')
		.action(async (file: string, opts: { depth: string }) => {
			try {
				const { store, cleanup } = await openStore();
				try {
					const affected = store.getAffected(await resolveFilePath(file), Number(opts.depth));
					if (affected.length === 0) {
						console.log('No affected files found.');
					} else {
						for (const a of affected) console.log(a);
					}
				} finally {
					cleanup();
				}
			} catch (e) {
				handleError(e);
			}
		});

	graph
		.command('symbols <file>')
		.description('List top-level functions and classes in this file')
		.action(async (file: string) => {
			try {
				const { store, cleanup } = await openStore();
				try {
					const symbols = store.getSymbols(await resolveFilePath(file));
					if (symbols.length === 0) {
						console.log('No symbols found.');
					} else {
						for (const s of symbols) console.log(`${s.type.padEnd(8)} ${s.name}`);
					}
				} finally {
					cleanup();
				}
			} catch (e) {
				handleError(e);
			}
		});

	return graph;
}
