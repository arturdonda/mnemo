/**
 * Benchmarks for xctx update (indexing) and xctx search (query latency).
 *
 * PRD requirements:
 *   - xctx update on a 100k LOC project: <60s
 *   - xctx search query latency: <500ms
 *
 * Run: npm run bench
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { indexFiles } from '../../src/core/index/pipeline.js';
import { getPaths } from '../../src/core/paths.js';
import { SqliteVecStore } from '../../src/core/index/backends/sqlite-vec.js';
import { createEmbedder } from '../../src/core/index/embedder.js';
import { readConfig } from '../../src/core/config.js';
import { resolveProjectId } from '../../src/core/project.js';

const LOC_TARGET = 100_000;
const LINES_PER_FILE = 200;
const FILE_COUNT = Math.ceil(LOC_TARGET / LINES_PER_FILE);

let tempDir: string;
let projectId: string;
let filePaths: string[];

beforeAll(async () => {
	tempDir = join(tmpdir(), `xctx-bench-${Date.now()}`);
	await mkdir(tempDir, { recursive: true });

	// generate synthetic source files
	filePaths = [];
	for (let i = 0; i < FILE_COUNT; i++) {
		const content = Array.from({ length: LINES_PER_FILE }, (_, j) =>
			j === 0
				? `// file ${i}`
				: j % 10 === 0
					? `export function fn${i}_${j}() { return ${j}; }`
					: `  const x${j} = ${j};`,
		).join('\n');
		const p = join(tempDir, `file${i}.ts`);
		await writeFile(p, content, 'utf-8');
		filePaths.push(p);
	}

	projectId = await resolveProjectId(tempDir);
	const paths = getPaths(projectId);
	await mkdir(paths.projectRoot, { recursive: true });
	await writeFile(paths.projectMeta, JSON.stringify({ id: projectId, name: 'bench', createdAt: Date.now() }), 'utf-8');
}, 30_000);

afterAll(async () => {
	await rm(tempDir, { recursive: true, force: true });
});

describe('benchmark: indexing speed', () => {
	it(`indexes ~${FILE_COUNT} files (${LOC_TARGET / 1000}k LOC) in <60s`, async () => {
		let stats: Awaited<ReturnType<typeof indexFiles>>;
		try {
			stats = await indexFiles(filePaths, projectId);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (msg.includes('401') || msg.includes('download') || msg.includes('ENOTFOUND')) {
				console.warn('Skipping benchmark: embedder unavailable —', msg.slice(0, 80));
				return;
			}
			throw e;
		}

		console.log(`  Indexed: ${stats.filesIndexed} files, ${stats.chunksCreated} chunks in ${stats.durationMs}ms`);
		expect(stats.durationMs).toBeLessThan(60_000);
		expect(stats.filesIndexed).toBeGreaterThan(0);
	}, 90_000);
});

describe('benchmark: search latency', () => {
	it('returns results in <500ms per query', async () => {
		const config = await readConfig();
		let embedder: Awaited<ReturnType<typeof createEmbedder>>;
		try {
			embedder = await createEmbedder(config);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (msg.includes('401') || msg.includes('download') || msg.includes('ENOTFOUND')) {
				console.warn('Skipping benchmark: embedder unavailable');
				return;
			}
			throw e;
		}

		const paths = getPaths(projectId);
		const store = new SqliteVecStore(paths.indexDb, embedder.dimensions);

		try {
			const start = Date.now();
			const [embedding] = await embedder.embed(['function export benchmark']);
			const results = await store.query(embedding, 10);
			const elapsed = Date.now() - start;

			console.log(`  Search latency: ${elapsed}ms, ${results.length} results`);
			expect(elapsed).toBeLessThan(500);
		} finally {
			await store.close();
		}
	}, 30_000);
});
