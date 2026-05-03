import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveProjectId, assertInitialized } from '../core/project.js';
import { getPaths } from '../core/paths.js';
import { createEmbedder } from '../core/index/embedder.js';
import { SqliteVecStore } from '../core/index/backends/sqlite-vec.js';
import { LanceDbStore } from '../core/index/backends/lancedb.js';
import { queryWithFreshness } from '../core/index/freshness.js';
import { applyHybridScoring } from '../core/index/hybrid.js';
import { GraphStore } from '../core/graph/store.js';
import { getActiveFeat } from '../core/feat/active.js';
import { readEvents, buildContext } from '../core/feat/store.js';
import { readFile } from 'node:fs/promises';
import type { FeatureMeta } from '../core/feat/types.js';
import { XctxError, handleError } from '../core/error.js';
import { readConfig } from '../core/config.js';

export function createSearchCommand(): Command {
	return new Command('search')
		.description('Search the codebase using natural language')
		.argument('<query>', 'Search query')
		.option('--limit <n>', 'Number of results', '10')
		.option('--output <format>', 'Output format: text or json', 'text')
		.option('--no-hybrid', 'Disable hybrid ranking; use pure semantic score')
		.option('--include-tests', 'Include test/sample files without score penalty')
		.action(async (query: string, opts: { limit: string; output: string; hybrid: boolean; includeTests?: boolean }) => {
			try {
				const cwd = process.cwd();
				const projectId = await resolveProjectId(cwd);
				await assertInitialized(projectId);

				const paths = getPaths(projectId);

				const config = await readConfig();
				const isLance = config['vector-store'] === 'lancedb';
				const indexExists = isLance
					? existsSync(join(paths.projectRoot, 'lancedb'))
					: existsSync(paths.indexDb);

				if (!indexExists) {
					throw new XctxError('Project not indexed. Run `xctx update` to index this project first.');
				}

				const embedder = await createEmbedder(config);
				const store = isLance
					? new LanceDbStore(join(paths.projectRoot, 'lancedb'), embedder.dimensions)
					: new SqliteVecStore(paths.indexDb, embedder.dimensions);

				try {
					const [embedding] = await embedder.embed([query]);
					const topK = Math.max(1, parseInt(opts.limit, 10) || 10);
					let results = await queryWithFreshness(store, embedder, embedding, topK);

					if (opts.hybrid && existsSync(paths.graphDb)) {
						const graphStore = new GraphStore(paths.graphDb);
						try {
							const featLinkedFiles = await getFeatLinkedFiles(projectId, paths);
							results = await applyHybridScoring(results, { graphStore, featLinkedFiles });
						} finally {
							graphStore.close();
						}
					}

					// P1-C: apply score penalty for test/sample files (skip with --include-tests)
					if (!opts.includeTests) {
						results = applyFileCategoryPenalty(results);
					}

					if (opts.output === 'json') {
						console.log(JSON.stringify(results, null, 2));
					} else {
						if (results.length === 0) {
							console.log('No results found.');
							return;
						}
						for (const r of results) {
							const score = r.score.toFixed(2);
							const snippet = r.content.split('\n').slice(0, 6).join('\n').slice(0, 300);
							console.log(`${r.filePath}:${r.startLine}-${r.endLine} (${score})`);
							console.log(snippet.split('\n').map((l) => `  ${l}`).join('\n'));
						}
					}
				} finally {
					await store.close();
				}
			} catch (e) {
				handleError(e);
			}
		});
}

const CATEGORY_PENALTY: Record<string, number> = {
	source: 1.0,
	docs: 0.85,
	test: 0.60,
	sample: 0.50,
};

function categorizeFile(filePath: string): string {
	const p = filePath.replace(/\\/g, '/');
	if (/\/(test|tests|__tests__|spec|specs|integration|e2e)\//.test(p)) return 'test';
	if (/\.(spec|test)\.[jt]sx?$/.test(p)) return 'test';
	if (/\/samples?\//.test(p)) return 'sample';
	if (/\.(md|mdx|txt|rst)$/.test(p)) return 'docs';
	return 'source';
}

function applyFileCategoryPenalty<T extends { filePath: string; score: number }>(results: T[]): T[] {
	return results
		.map((r) => ({ ...r, score: r.score * (CATEGORY_PENALTY[categorizeFile(r.filePath)] ?? 1.0) }))
		.sort((a, b) => b.score - a.score);
}

async function getFeatLinkedFiles(projectId: string, paths: ReturnType<typeof getPaths>): Promise<string[]> {
	try {
		const featName = await getActiveFeat(projectId);
		if (!featName) return [];
		const events = await readEvents(projectId, featName);
		const metaRaw = await readFile(paths.featMeta(featName), 'utf-8');
		const meta = JSON.parse(metaRaw) as FeatureMeta;
		const ctx = buildContext(events, meta);
		return ctx.files.map((f) => f.path);
	} catch {
		return [];
	}
}
