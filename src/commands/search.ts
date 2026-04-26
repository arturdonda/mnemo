import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { resolveProjectId, assertInitialized } from '../core/project.js';
import { getPaths } from '../core/paths.js';
import { createEmbedder } from '../core/index/embedder.js';
import { SqliteVecStore } from '../core/index/backends/sqlite-vec.js';
import { queryWithFreshness } from '../core/index/freshness.js';
import { applyHybridScoring } from '../core/index/hybrid.js';
import { GraphStore } from '../core/graph/store.js';
import { getActiveFeat } from '../core/feat/active.js';
import { readEvents, buildContext } from '../core/feat/store.js';
import { readFile } from 'node:fs/promises';
import type { FeatureMeta } from '../core/feat/types.js';
import { MnemoError, handleError } from '../core/error.js';
import { readConfig } from '../core/config.js';

export function createSearchCommand(): Command {
	return new Command('search')
		.description('Search the codebase using natural language')
		.argument('<query>', 'Search query')
		.option('--limit <n>', 'Number of results', '10')
		.option('--output <format>', 'Output format: text or json', 'text')
		.option('--no-hybrid', 'Disable hybrid ranking; use pure semantic score')
		.action(async (query: string, opts: { limit: string; output: string; hybrid: boolean }) => {
			try {
				const cwd = process.cwd();
				const projectId = await resolveProjectId(cwd);
				await assertInitialized(projectId);

				const paths = getPaths(projectId);

				if (!existsSync(paths.indexDb)) {
					throw new MnemoError('Project not indexed. Run `mnemo update` to index this project first.');
				}

				const config = await readConfig();
				const embedder = await createEmbedder(config);
				const store = new SqliteVecStore(paths.indexDb, embedder.dimensions);

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

					if (opts.output === 'json') {
						console.log(JSON.stringify(results, null, 2));
					} else {
						if (results.length === 0) {
							console.log('No results found.');
							return;
						}
						for (const r of results) {
							const score = (r.score * 100).toFixed(1);
							const snippet = r.content.split('\n').slice(0, 2).join(' ').slice(0, 120);
							console.log(`${r.filePath}:${r.startLine}-${r.endLine} (${score}%)`);
							console.log(`  ${snippet}`);
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
