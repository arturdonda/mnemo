import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { existsSync } from 'node:fs';
import { simpleGit } from 'simple-git';
import { resolveProjectId, assertInitialized } from '../core/project.js';
import { ensurePaths, getPaths, getUserMemoryPath } from '../core/paths.js';
import { listMemories } from '../core/memory/store.js';
import { appendEvent, readEvents, buildContext, listFeats, featExists } from '../core/feat/store.js';
import { getActiveFeat, setActiveFeat, clearActiveFeat } from '../core/feat/active.js';
import { renderContext } from '../core/feat/renderer.js';
import { MnemoError, handleError } from '../core/error.js';
import type { FeatureMeta } from '../core/feat/types.js';
import type { ScoredChunk } from '../core/index/vector-store.js';

async function getProjectId(): Promise<string> {
	return resolveProjectId(process.cwd());
}

async function resolveActiveFeat(projectId: string, optFeat?: string): Promise<string> {
	const name = optFeat ?? (await getActiveFeat(projectId));
	if (!name) throw new MnemoError('No active feature. Use `mnemo feat start <name>` or `--feat <name>`.');
	if (!featExists(projectId, name)) throw new MnemoError(`Feature "${name}" not found.`);
	return name;
}

async function getCurrentBranch(): Promise<string | undefined> {
	try {
		const git = simpleGit(process.cwd());
		const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
		return branch.trim() || undefined;
	} catch {
		return undefined;
	}
}

export function createFeatCommand(): Command {
	const feat = new Command('feat').description('Manage feature contexts');

	// T010 — feat start
	feat
		.command('start <name>')
		.description('Start a new feature context and set it as active')
		.action(async (name: string) => {
			try {
				const projectId = await getProjectId();
				await assertInitialized(projectId);
				const paths = await ensurePaths(projectId, name);
				const branch = await getCurrentBranch();
				const now = Date.now();

				const meta: FeatureMeta = {
					id: name,
					name,
					branch,
					status: 'in-progress',
					createdAt: now,
					updatedAt: now,
				};
				await writeFile(paths.featMeta(name), JSON.stringify(meta, null, 2), 'utf-8');
				await appendEvent(projectId, name, { ts: now, type: 'feat_created', text: name });
				await setActiveFeat(projectId, name);

				console.log(`Feature started: ${name}`);
				if (branch) console.log(`  Branch: ${branch}`);
				console.log(`  Active: yes`);
			} catch (e) {
				handleError(e);
			}
		});

	// T011 — feat list
	feat
		.command('list')
		.description('List all feature contexts for this project')
		.action(async () => {
			try {
				const projectId = await getProjectId();
				await assertInitialized(projectId);
				const feats = await listFeats(projectId);
				const active = await getActiveFeat(projectId);

				if (feats.length === 0) {
					console.log('No features yet. Run `mnemo feat start <name>` to create one.');
					return;
				}

				for (const f of feats) {
					const marker = f.name === active ? '→' : ' ';
					const branch = f.branch ? ` (${f.branch})` : '';
					const updated = new Date(f.updatedAt).toISOString().slice(0, 10);
					console.log(`${marker} ${f.name}  [${f.status}]${branch}  ${updated}`);
				}
			} catch (e) {
				handleError(e);
			}
		});

	// T012 — feat switch
	feat
		.command('switch <name>')
		.description('Switch the active feature context')
		.action(async (name: string) => {
			try {
				const projectId = await getProjectId();
				await assertInitialized(projectId);
				if (!featExists(projectId, name)) throw new MnemoError(`Feature "${name}" not found.`);
				await setActiveFeat(projectId, name);
				console.log(`Active feature: ${name}`);
			} catch (e) {
				handleError(e);
			}
		});

	// T036 — feat switch-by-branch (used by git hook)
	feat
		.command('switch-by-branch <branch>')
		.description('Auto-switch to feat matching this branch name (used by git hook)')
		.option('--silent', 'Suppress output')
		.action(async (branch: string, opts: { silent?: boolean }) => {
			try {
				const projectId = await getProjectId();
				if (!existsSync(getPaths(projectId).projectMeta)) return;
				const feats = await listFeats(projectId);
				const match = feats.find((f) => f.branch === branch);
				if (!match) return;
				const active = await getActiveFeat(projectId);
				if (active === match.name) return;
				await setActiveFeat(projectId, match.name);
				if (!opts.silent) console.log(`Switched active feat to: ${match.name}`);
			} catch {
				// silent failure in hook context
			}
		});

	// T013 — feat context
	feat
		.command('context [name]')
		.description('Print the context for the active (or named) feature')
		.option('--no-suggest', 'Skip file suggestions at the end')
		.action(async (name: string | undefined, opts: { suggest: boolean }) => {
			try {
				const projectId = await getProjectId();
				await assertInitialized(projectId);
				const featName = await resolveActiveFeat(projectId, name);
				const paths = getPaths(projectId);
				const { readFile } = await import('node:fs/promises');

				// Prepend user and project memories if they exist
				await printMemoryHeader(paths.projectMemoryFile);

				let ctx: ReturnType<typeof buildContext> | undefined;
				if (existsSync(paths.contextFile(featName))) {
					process.stdout.write(await readFile(paths.contextFile(featName), 'utf-8'));
					// Also build ctx for suggestions
					if (opts.suggest) {
						const events = await readEvents(projectId, featName);
						const metaRaw = await readFile(paths.featMeta(featName), 'utf-8');
						const meta = JSON.parse(metaRaw) as FeatureMeta;
						ctx = buildContext(events, meta);
					}
				} else {
					const events = await readEvents(projectId, featName);
					const metaRaw = await readFile(paths.featMeta(featName), 'utf-8');
					const meta = JSON.parse(metaRaw) as FeatureMeta;
					ctx = buildContext(events, meta);
					process.stdout.write(renderContext(ctx));
				}

				// P2-A: suggest relevant unlinked files based on current status
				if (opts.suggest && ctx?.currentStatus && existsSync(paths.indexDb)) {
					try {
						const suggestions = await suggestFilesForContext(projectId, paths, ctx);
						if (suggestions.length > 0) {
							console.log('\n---\n## Suggested files (based on current status)\n');
							for (const s of suggestions) {
								console.log(`· ${s.filePath}  (${s.score.toFixed(2)})`);
							}
							console.log('\nLink with: mnemo feat link-file <path>');
						}
					} catch {
						// suggestions are best-effort — never break feat context output
					}
				}
			} catch (e) {
				handleError(e);
			}
		});

	// T014 — feat decision
	feat
		.command('decision <text>')
		.description('Record an architectural decision')
		.option('--feat <name>', 'Target feature (defaults to active)')
		.action(async (text: string, opts: { feat?: string }) => {
			try {
				const projectId = await getProjectId();
				await assertInitialized(projectId);
				const featName = await resolveActiveFeat(projectId, opts.feat);
				await appendEvent(projectId, featName, { ts: Date.now(), type: 'decision', text, author: 'user' });
				await touchMeta(projectId, featName);
				console.log(`Decision recorded: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`);
			} catch (e) {
				handleError(e);
			}
		});

	// T015 — feat blocker + T016 — feat blocker resolve
	const blocker = feat
		.command('blocker')
		.description('Record or resolve a blocker')
		.argument('[text]', 'Blocker description')
		.option('--feat <name>', 'Target feature (defaults to active)')
		.action(async (text: string | undefined, opts: { feat?: string }) => {
			try {
				if (!text) throw new MnemoError('Blocker text is required.');
				const projectId = await getProjectId();
				await assertInitialized(projectId);
				const featName = await resolveActiveFeat(projectId, opts.feat);
				await appendEvent(projectId, featName, { ts: Date.now(), type: 'blocker', text });
				await touchMeta(projectId, featName);
				console.log(`Blocker recorded: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`);
			} catch (e) {
				handleError(e);
			}
		});

	blocker
		.command('resolve <text>')
		.description('Resolve an active blocker by substring match')
		.option('--feat <name>', 'Target feature (defaults to active)')
		.action(async (text: string, opts: { feat?: string }) => {
			try {
				const projectId = await getProjectId();
				await assertInitialized(projectId);
				const featName = await resolveActiveFeat(projectId, opts.feat);
				const events = await readEvents(projectId, featName);
				const metaRaw = await import('node:fs/promises').then((m) =>
					m.readFile(getPaths(projectId).featMeta(featName), 'utf-8'),
				);
				const meta = JSON.parse(metaRaw) as FeatureMeta;
				const ctx = buildContext(events, meta);
				const match = ctx.blockers.find(
					(b) => !b.resolved && b.text.toLowerCase().includes(text.toLowerCase()),
				);
				if (!match) throw new MnemoError(`No active blocker matching "${text}".`);
				await appendEvent(projectId, featName, { ts: Date.now(), type: 'blocker_resolved', text });
				await touchMeta(projectId, featName);
				console.log(`Blocker resolved: ${match.text.slice(0, 60)}${match.text.length > 60 ? '…' : ''}`);
			} catch (e) {
				handleError(e);
			}
		});

	// T017 — feat link-file
	feat
		.command('link-file <path>')
		.description('Link a file to the active feature context')
		.option('--reason <text>', 'Why this file is relevant')
		.option('--feat <name>', 'Target feature (defaults to active)')
		.action(async (filePath: string, opts: { reason?: string; feat?: string }) => {
			try {
				const projectId = await getProjectId();
				await assertInitialized(projectId);
				const featName = await resolveActiveFeat(projectId, opts.feat);
				const absPath = resolve(process.cwd(), filePath);
				if (!existsSync(absPath)) throw new MnemoError(`File not found: ${filePath}`);
				const gitRoot = await getGitRoot();
				const relPath = gitRoot ? relative(gitRoot, absPath).replace(/\\/g, '/') : filePath;
				await appendEvent(projectId, featName, { ts: Date.now(), type: 'file_linked', path: relPath, reason: opts.reason });
				await touchMeta(projectId, featName);
				console.log(`File linked: ${relPath}`);
			} catch (e) {
				handleError(e);
			}
		});

	// T018 — feat unlink-file
	feat
		.command('unlink-file <path>')
		.description('Unlink a file from the active feature context')
		.option('--feat <name>', 'Target feature (defaults to active)')
		.action(async (filePath: string, opts: { feat?: string }) => {
			try {
				const projectId = await getProjectId();
				await assertInitialized(projectId);
				const featName = await resolveActiveFeat(projectId, opts.feat);
				const absPath = resolve(process.cwd(), filePath);
				const gitRoot = await getGitRoot();
				const relPath = gitRoot ? relative(gitRoot, absPath).replace(/\\/g, '/') : filePath;
				const events = await readEvents(projectId, featName);
				const metaRaw = await import('node:fs/promises').then((m) =>
					m.readFile(getPaths(projectId).featMeta(featName), 'utf-8'),
				);
				const meta = JSON.parse(metaRaw) as FeatureMeta;
				const ctx = buildContext(events, meta);
				const linked = ctx.files.find((f) => f.path === relPath);
				if (!linked) console.warn(`Warning: "${relPath}" was not linked to this feature.`);
				await appendEvent(projectId, featName, { ts: Date.now(), type: 'file_unlinked', path: relPath });
				await touchMeta(projectId, featName);
				console.log(`File unlinked: ${relPath}`);
			} catch (e) {
				handleError(e);
			}
		});

	// T019 — feat status
	feat
		.command('status <text>')
		.description('Update the current status of the active feature')
		.option('--feat <name>', 'Target feature (defaults to active)')
		.action(async (text: string, opts: { feat?: string }) => {
			try {
				const projectId = await getProjectId();
				await assertInitialized(projectId);
				const featName = await resolveActiveFeat(projectId, opts.feat);
				await appendEvent(projectId, featName, { ts: Date.now(), type: 'status', text });
				await touchMeta(projectId, featName);
				console.log(`Status updated: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`);
			} catch (e) {
				handleError(e);
			}
		});

	// T020 — feat note
	feat
		.command('note <text>')
		.description('Add a note to the active feature context')
		.option('--feat <name>', 'Target feature (defaults to active)')
		.action(async (text: string, opts: { feat?: string }) => {
			try {
				const projectId = await getProjectId();
				await assertInitialized(projectId);
				const featName = await resolveActiveFeat(projectId, opts.feat);
				await appendEvent(projectId, featName, { ts: Date.now(), type: 'note', text });
				await touchMeta(projectId, featName);
				console.log(`Note added: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`);
			} catch (e) {
				handleError(e);
			}
		});

	// P2-B — feat suggest-files
	feat
		.command('suggest-files')
		.description('Suggest files to link based on the current feature context')
		.option('--limit <n>', 'Max suggestions', '10')
		.action(async (opts: { limit: string }) => {
			try {
				const projectId = await getProjectId();
				await assertInitialized(projectId);
				const featName = await resolveActiveFeat(projectId);
				const paths = getPaths(projectId);

				if (!existsSync(paths.indexDb)) {
					throw new MnemoError('Project not indexed. Run `mnemo update` first.');
				}

				const events = await readEvents(projectId, featName);
				const { readFile } = await import('node:fs/promises');
				const metaRaw = await readFile(paths.featMeta(featName), 'utf-8');
				const meta = JSON.parse(metaRaw) as FeatureMeta;
				const ctx = buildContext(events, meta);

				const suggestions = await suggestFilesForContext(projectId, paths, ctx, Number(opts.limit));
				if (suggestions.length === 0) {
					console.log('No additional files to suggest (all relevant files already linked, or no context to search from).');
					return;
				}

				console.log(`## Suggested files for feat: ${featName}\n`);
				for (const s of suggestions) {
					console.log(`  ${s.score.toFixed(2)}  ${s.filePath}`);
				}
				console.log(`\nLink with: mnemo feat link-file <path>`);
			} catch (e) {
				handleError(e);
			}
		});

	// T021 — feat done
	feat
		.command('done')
		.description('Mark the active feature as done')
		.option('--feat <name>', 'Target feature (defaults to active)')
		.action(async (opts: { feat?: string }) => {
			try {
				const projectId = await getProjectId();
				await assertInitialized(projectId);
				const featName = await resolveActiveFeat(projectId, opts.feat);
				await appendEvent(projectId, featName, { ts: Date.now(), type: 'feat_done' });
				await touchMeta(projectId, featName, 'done');
				const active = await getActiveFeat(projectId);
				if (active === featName) await clearActiveFeat(projectId);

				console.log(`Feature done: ${featName}\n`);

				// Print full context so the agent can review and distill memories
				const paths = getPaths(projectId);
				const { readFile } = await import('node:fs/promises');
				const events = await readEvents(projectId, featName);
				const metaRaw = await readFile(paths.featMeta(featName), 'utf-8');
				const meta = JSON.parse(metaRaw) as FeatureMeta;
				const ctx = buildContext(events, meta);
				console.log('--- Feature Summary ---\n');
				process.stdout.write(renderContext(ctx));
				console.log('\n---');
				console.log('Review the decisions and notes above.');
				console.log('Promote any reusable insights to permanent memory:');
				console.log(`  mnemo memory add --project "<architectural insight>"`);
				console.log(`  mnemo memory add --user "<personal pattern or preference>"`);
			} catch (e) {
				handleError(e);
			}
		});

	return feat;
}

async function suggestFilesForContext(
	projectId: string,
	paths: ReturnType<typeof getPaths>,
	ctx: ReturnType<typeof buildContext>,
	limit = 5,
): Promise<ScoredChunk[]> {
	const queryParts = [
		ctx.currentStatus,
		...ctx.decisions.slice(-3).map((d) => d.text),
		...ctx.notes.slice(-2).map((n) => n.text),
	].filter(Boolean);

	if (queryParts.length === 0) return [];

	const query = queryParts.join('. ');
	const linkedPaths = new Set(ctx.files.map((f) => f.path));

	const { createEmbedder } = await import('../core/index/embedder.js');
	const { SqliteVecStore } = await import('../core/index/backends/sqlite-vec.js');
	const { readConfig } = await import('../core/config.js');
	const config = await readConfig();
	const embedder = await createEmbedder(config);
	const store = new SqliteVecStore(paths.indexDb, embedder.dimensions);

	try {
		const [embedding] = await embedder.embed([query]);
		const raw = await store.query(embedding, limit + linkedPaths.size + 20);
		const PENALTY: Record<string, number> = { source: 1.0, docs: 0.85, test: 0.60, sample: 0.50 };
		const categorize = (p: string): string => {
			const f = p.replace(/\\/g, '/');
			if (/\/(test|tests|__tests__|spec|specs|integration|e2e)\//.test(f)) return 'test';
			if (/\.(spec|test)\.[jt]sx?$/.test(f)) return 'test';
			if (/\/samples?\//.test(f)) return 'sample';
			if (/\.(md|mdx|txt|rst)$/.test(f)) return 'docs';
			return 'source';
		};
		return raw
			.map((r) => ({ ...r, score: r.score * (PENALTY[categorize(r.filePath)] ?? 1.0) }))
			.filter((r) => !linkedPaths.has(r.filePath))
			.sort((a, b) => b.score - a.score)
			.slice(0, limit);
	} finally {
		await store.close();
	}
}

async function touchMeta(projectId: string, featName: string, status?: FeatureMeta['status']): Promise<void> {
	const paths = getPaths(projectId);
	const { readFile, writeFile: wf } = await import('node:fs/promises');
	const raw = await readFile(paths.featMeta(featName), 'utf-8');
	const meta = JSON.parse(raw) as FeatureMeta;
	meta.updatedAt = Date.now();
	if (status) meta.status = status;
	await wf(paths.featMeta(featName), JSON.stringify(meta, null, 2), 'utf-8');
}

async function printMemoryHeader(projectMemoryFile: string): Promise<void> {
	const userEntries = await listMemories(getUserMemoryPath());
	const projectEntries = await listMemories(projectMemoryFile);
	if (userEntries.length === 0 && projectEntries.length === 0) return;

	if (userEntries.length > 0) {
		console.log('## User Memory (cross-agent)\n');
		for (const e of userEntries) {
			const tags = e.tags.length > 0 ? ` [${e.tags.join(', ')}]` : '';
			console.log(`- ${e.text}${tags}`);
		}
		console.log('');
	}

	if (projectEntries.length > 0) {
		console.log('## Project Memory\n');
		for (const e of projectEntries) {
			const tags = e.tags.length > 0 ? ` [${e.tags.join(', ')}]` : '';
			console.log(`- ${e.text}${tags}`);
		}
		console.log('');
	}

	console.log('---\n');
}

async function getGitRoot(): Promise<string | null> {
	try {
		const git = simpleGit(process.cwd());
		const root = await git.revparse(['--show-toplevel']);
		return root.trim();
	} catch {
		return null;
	}
}
