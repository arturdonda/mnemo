import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { LanceDbStore } from '../../../../src/core/index/backends/lancedb.js';

let store: LanceDbStore;
let dbPath: string;

beforeEach(async () => {
	dbPath = join(tmpdir(), `xctx-lancedb-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	store = new LanceDbStore(dbPath, 4);
});

afterEach(async () => {
	await store.close();
	await rm(dbPath, { recursive: true, force: true });
});

function makeChunk(id: string, filePath: string) {
	return { id, filePath, startLine: 1, endLine: 10, content: 'hello', fileHash: 'abc', indexedAt: Date.now() };
}

function vec(values: number[]): number[] {
	// L2-normalize a 4-dim vector
	const norm = Math.sqrt(values.reduce((s, x) => s + x * x, 0));
	return values.map((x) => x / norm);
}

describe('LanceDbStore', () => {
	it('upserts chunks and retrieves them via vector search', async () => {
		const chunks = [
			makeChunk('a:1:10', 'src/a.ts'),
			makeChunk('b:1:10', 'src/b.ts'),
		];
		const embeddings = [vec([1, 0, 0, 0]), vec([0, 1, 0, 0])];

		await store.upsert(chunks, embeddings);

		const results = await store.query(vec([1, 0, 0, 0]), 2);
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].filePath).toBe('src/a.ts');
	});

	it('upsert is idempotent (updates existing chunk)', async () => {
		const chunk = makeChunk('a:1:10', 'src/a.ts');
		await store.upsert([chunk], [vec([1, 0, 0, 0])]);
		await store.upsert([{ ...chunk, content: 'updated' }], [vec([1, 0, 0, 0])]);

		const results = await store.query(vec([1, 0, 0, 0]), 1);
		expect(results[0].content).toBe('updated');
	});

	it('delete removes chunks for a file', async () => {
		await store.upsert(
			[makeChunk('a:1:10', 'src/a.ts'), makeChunk('b:1:10', 'src/b.ts')],
			[vec([1, 0, 0, 0]), vec([0, 1, 0, 0])],
		);

		await store.delete('src/a.ts');
		const results = await store.query(vec([1, 0, 0, 0]), 5);
		expect(results.every((r) => r.filePath !== 'src/a.ts')).toBe(true);
	});

	it('returns empty results when store is empty', async () => {
		const results = await store.query(vec([1, 0, 0, 0]), 5);
		expect(results).toHaveLength(0);
	});
});
