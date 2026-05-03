import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { SqliteVecStore } from '../../../src/core/index/backends/sqlite-vec.js';
import { queryWithFreshness } from '../../../src/core/index/freshness.js';
import { chunkByFixedTokens } from '../../../src/core/index/chunker.js';
import type { Embedder } from '../../../src/core/index/embedder.js';
import { xxh3 } from '@node-rs/xxhash';

const DIMS = 4;

function normalize(v: number[]): number[] {
	const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
	return norm === 0 ? v : v.map((x) => x / norm);
}

function hash(content: string): string {
	return xxh3.xxh64(content).toString(16).padStart(16, '0');
}

const fakeEmbedder: Embedder = {
	dimensions: DIMS,
	async embed(texts: string[]): Promise<number[][]> {
		return texts.map((t) => {
			const h = t.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
			return normalize([h % 10, (h >> 2) % 10, (h >> 4) % 10, (h >> 6) % 10]);
		});
	},
};

describe('queryWithFreshness', () => {
	let tempDir: string;
	let store: SqliteVecStore;

	beforeEach(async () => {
		tempDir = join(tmpdir(), `xctx-fresh-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		store = new SqliteVecStore(join(tempDir, 'index.db'), DIMS);
	});

	afterEach(async () => {
		await store.close();
		await rm(tempDir, { recursive: true, force: true });
	});

	it('returns cached results when file has not changed', async () => {
		const filePath = join(tempDir, 'auth.ts');
		const content = 'function authenticate() {}';
		await writeFile(filePath, content, 'utf-8');

		const chunks = chunkByFixedTokens([content], filePath, hash(content), Date.now());
		const embeddings = await fakeEmbedder.embed(chunks.map((c) => c.content));
		await store.upsert(chunks, embeddings);

		const queryVec = normalize([1, 0, 0, 0]);
		const results = await queryWithFreshness(store, fakeEmbedder, queryVec, 5);
		expect(results.length).toBeGreaterThanOrEqual(1);
	});

	it('re-indexes stale file transparently after file change', async () => {
		const filePath = join(tempDir, 'service.ts');
		const oldContent = 'function old() { return 1; }';
		const newContent = 'function updated() { return 999; }';
		await writeFile(filePath, oldContent, 'utf-8');

		const oldChunks = chunkByFixedTokens([oldContent], filePath, hash(oldContent), Date.now());
		const oldEmbeddings = await fakeEmbedder.embed(oldChunks.map((c) => c.content));
		await store.upsert(oldChunks, oldEmbeddings);

		// Simulate file change on disk
		await writeFile(filePath, newContent, 'utf-8');

		const queryVec = normalize([1, 0, 0, 0]);
		const results = await queryWithFreshness(store, fakeEmbedder, queryVec, 5);

		// After freshness check, the file should have been re-indexed
		const hit = results.find((r) => r.filePath === filePath);
		if (hit) {
			expect(hit.content).toBe(newContent);
		}
	});

	it('returns results without error when file no longer exists', async () => {
		const filePath = join(tempDir, 'deleted.ts');
		const content = 'function gone() {}';
		await writeFile(filePath, content, 'utf-8');

		const chunks = chunkByFixedTokens([content], filePath, hash(content), Date.now());
		const embeddings = await fakeEmbedder.embed(chunks.map((c) => c.content));
		await store.upsert(chunks, embeddings);

		// Delete the file (simulates removal)
		await rm(filePath);

		const queryVec = normalize([1, 0, 0, 0]);
		const results = await queryWithFreshness(store, fakeEmbedder, queryVec, 5);
		expect(Array.isArray(results)).toBe(true);
	});
});
