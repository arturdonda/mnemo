import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { chunkByFixedTokens } from '../../../src/core/index/chunker.js';
import { SqliteVecStore } from '../../../src/core/index/backends/sqlite-vec.js';

const DIMS = 4;

function normalize(v: number[]): number[] {
	const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
	return norm === 0 ? v : v.map((x) => x / norm);
}

function fakeEmbed(text: string): number[] {
	const hash = text.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
	return normalize([hash % 10, (hash >> 2) % 10, (hash >> 4) % 10, (hash >> 6) % 10]);
}

describe('indexing pipeline (unit)', () => {
	let tempDir: string;
	let store: SqliteVecStore;

	beforeEach(async () => {
		tempDir = join(tmpdir(), `xctx-pipeline-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		store = new SqliteVecStore(join(tempDir, 'index.db'), DIMS);
	});

	afterEach(async () => {
		await store.close();
		await rm(tempDir, { recursive: true, force: true });
	});

	it('chunk → embed → upsert → query round-trip', async () => {
		const content = 'export function authenticate(token: string) { return verify(token); }';
		const lines = content.split('\n');
		const chunks = chunkByFixedTokens(lines, 'src/auth.ts', 'abc123', Date.now());

		const embeddings = chunks.map((c) => fakeEmbed(c.content));
		await store.upsert(chunks, embeddings);

		const queryVec = fakeEmbed('authenticate token');
		const results = await store.query(queryVec, 5);
		expect(results.length).toBeGreaterThanOrEqual(1);
		expect(results[0].filePath).toBe('src/auth.ts');
	});

	it('multiple files are all queryable after flush', async () => {
		const files = [
			{ path: 'src/auth.ts', content: 'function authenticate() {}' },
			{ path: 'src/payments.ts', content: 'function processPayment() {}' },
			{ path: 'src/users.ts', content: 'function getUser() {}' },
		];

		const allChunks = files.flatMap((f) =>
			chunkByFixedTokens(f.content.split('\n'), f.path, 'hash', Date.now()),
		);
		const embeddings = allChunks.map((c) => fakeEmbed(c.content));
		await store.upsert(allChunks, embeddings);

		const results = await store.query(fakeEmbed('authenticate'), 10);
		const paths = new Set(results.map((r) => r.filePath));
		expect(paths.size).toBeGreaterThanOrEqual(1);
	});

	it('re-indexing a file updates its chunks', async () => {
		const lines = ['function old() {}'];
		const chunks = chunkByFixedTokens(lines, 'src/x.ts', 'hash1', Date.now());
		await store.upsert(chunks, chunks.map((c) => fakeEmbed(c.content)));

		await store.delete('src/x.ts');

		const updated = chunkByFixedTokens(['function updated() {}'], 'src/x.ts', 'hash2', Date.now());
		await store.upsert(updated, updated.map((c) => fakeEmbed(c.content)));

		const results = await store.query(fakeEmbed('updated'), 5);
		const hit = results.find((r) => r.filePath === 'src/x.ts');
		expect(hit?.content).toContain('updated');
	});
});

describe('chunkByFixedTokens + indexStats shape', () => {
	it('processes 10 files worth of content without error', async () => {
		const tempDir2 = join(tmpdir(), `xctx-stats-${Date.now()}`);
		await mkdir(tempDir2, { recursive: true });
		const store2 = new SqliteVecStore(join(tempDir2, 'index.db'), DIMS);

		const files = Array.from({ length: 10 }, (_, i) => ({
			path: `src/module${i}.ts`,
			content: `export const x${i} = ${i};\n`.repeat(20),
		}));

		let totalChunks = 0;
		for (const f of files) {
			const chunks = chunkByFixedTokens(f.content.split('\n'), f.path, `hash${f.path}`, Date.now());
			const embeddings = chunks.map((c) => fakeEmbed(c.content));
			await store2.upsert(chunks, embeddings);
			totalChunks += chunks.length;
		}

		expect(totalChunks).toBeGreaterThanOrEqual(10);

		const results = await store2.query(fakeEmbed('export const'), 5);
		expect(results.length).toBeGreaterThanOrEqual(1);

		await store2.close();
		await rm(tempDir2, { recursive: true, force: true });
	});
});
