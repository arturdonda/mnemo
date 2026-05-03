import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { SqliteVecStore } from '../../../../src/core/index/backends/sqlite-vec.js';
import type { Chunk } from '../../../../src/core/index/vector-store.js';

const DIMS = 4;

function makeChunk(id: string, content: string): Chunk {
	return {
		id,
		filePath: 'src/test.ts',
		startLine: 1,
		endLine: 10,
		content,
		fileHash: 'abc123',
		indexedAt: Date.now(),
	};
}

function normalize(v: number[]): number[] {
	const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
	return v.map((x) => x / norm);
}

describe('SqliteVecStore', () => {
	let dbPath: string;
	let tempDir: string;
	let store: SqliteVecStore;

	beforeEach(async () => {
		tempDir = join(tmpdir(), `xctx-vec-${Date.now()}`);
		dbPath = join(tempDir, 'test.db');
		await import('node:fs/promises').then((m) => m.mkdir(tempDir, { recursive: true }));
		store = new SqliteVecStore(dbPath, DIMS);
	});

	afterEach(async () => {
		await store.close();
		await rm(tempDir, { recursive: true, force: true });
	});

	it('upsert and query returns top result', async () => {
		const chunk = makeChunk('a', 'authentication logic');
		const embedding = normalize([1, 0, 0, 0]);
		await store.upsert([chunk], [embedding]);

		const results = await store.query(normalize([1, 0, 0, 0]), 1);
		expect(results).toHaveLength(1);
		expect(results[0].id).toBe('a');
		expect(results[0].score).toBeGreaterThan(0.9);
	});

	it('returns closer vector as top result', async () => {
		const chunkA = makeChunk('a', 'auth');
		const chunkB = makeChunk('b', 'payments');
		await store.upsert(
			[chunkA, chunkB],
			[normalize([1, 0, 0, 0]), normalize([0, 1, 0, 0])],
		);

		const results = await store.query(normalize([1, 0.1, 0, 0]), 2);
		expect(results[0].id).toBe('a');
	});

	it('upsert is idempotent (OR REPLACE)', async () => {
		const chunk = makeChunk('a', 'first version');
		await store.upsert([chunk], [normalize([1, 0, 0, 0])]);

		const updated = { ...chunk, content: 'second version' };
		await store.upsert([updated], [normalize([1, 0, 0, 0])]);

		const results = await store.query(normalize([1, 0, 0, 0]), 1);
		expect(results[0].content).toBe('second version');
	});

	it('delete removes chunks by file path prefix', async () => {
		const chunkA = { ...makeChunk('a', 'auth'), filePath: 'src/auth.ts' };
		const chunkB = { ...makeChunk('b', 'pay'), filePath: 'src/pay.ts' };
		await store.upsert([chunkA, chunkB], [normalize([1, 0, 0, 0]), normalize([0, 1, 0, 0])]);

		await store.delete('src/auth.ts');

		const results = await store.query(normalize([1, 0, 0, 0]), 10);
		expect(results.every((r) => r.filePath !== 'src/auth.ts')).toBe(true);
	});

	it('query returns empty when store is empty', async () => {
		const results = await store.query(normalize([1, 0, 0, 0]), 5);
		expect(results).toHaveLength(0);
	});
});
